import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useModelValidation } from './hooks/useModelValidation';

const EXAMPLE_SCENARIOS = [
  {
    title: 'Math Calculation',
    description: 'Test the calculator tool',
    query: 'What is 15% of 240? Also calculate the square root of 144.'
  },
  {
    title: 'Weather Query',
    description: 'Test a mock weather tool',
    query: 'What is the current weather in London?'
  },
  {
    title: 'Multi-Tool',
    description: 'Combine multiple tools',
    query: 'Calculate 42 * 18 and then tell me the weather in New York.'
  },
  {
    title: 'Knowledge Search',
    description: 'Search documents with RAG tool',
    query: 'Search the knowledge base for information about deployment.'
  }
];

const TYPE_BADGE_COLORS = {
  mock: 'bg-yellow-100 text-yellow-800',
  builtin: 'bg-blue-100 text-blue-800',
  internal: 'bg-purple-100 text-purple-800',
};

function ToolTesting({ uiConfig }) {
  const { recordCapabilityTest, getCapabilityStatus, isCapabilityValidated, validationData } = useModelValidation();
  const [tools, setTools] = useState([]);
  const [llms, setLlms] = useState([]);           // [{ llmName, provider, config }]
  const [modelsCache, setModelsCache] = useState({}); // { [llmName]: { loading, models, error } }
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedLlm, setSelectedLlm] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [toolsEnabled, setToolsEnabled] = useState(false);

  // Fetch registered tools on mount
  useEffect(() => {
    fetch('/api/tools/list')
      .then(res => res.json())
      .then(data => {
        setTools(data.tools || []);
        setToolsEnabled(data.enabled || false);
      })
      .catch(err => console.error('Failed to fetch tools:', err));
  }, []);

  // Build LLM provider list from uiConfig
  useEffect(() => {
    if (uiConfig?.llms) {
      const llmList = Object.entries(uiConfig.llms).map(([llmName, llmConfig]) => ({
        llmName,
        provider: llmConfig.provider,
        config: llmConfig
      }));
      setLlms(llmList);
      if (llmList.length > 0 && !selectedLlm) {
        setSelectedLlm(llmList[0].llmName);
      }
    }
  }, [uiConfig]);

  // Fetch models for the selected LLM provider (with caching)
  const fetchModelsForProvider = (llmName) => {
    const llmEntry = llms.find(l => l.llmName === llmName);
    if (!llmEntry) return;

    if (modelsCache[llmName]?.models?.length > 0 || modelsCache[llmName]?.loading) return;

    setModelsCache(prev => ({ ...prev, [llmName]: { loading: true, models: [], error: null } }));

    fetch('/api/connections/llm/discovery/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: llmEntry.provider, config: llmEntry.config })
    })
      .then(res => res.json())
      .then(result => {
        if (result.models && Array.isArray(result.models)) {
          const sorted = [...result.models].sort((a, b) =>
            (a.name || a.id || '').toLowerCase().localeCompare((b.name || b.id || '').toLowerCase())
          );
          setModelsCache(prev => ({ ...prev, [llmName]: { loading: false, models: sorted, error: null } }));
        } else {
          setModelsCache(prev => ({ ...prev, [llmName]: { loading: false, models: [], error: result.error || 'No models returned' } }));
        }
      })
      .catch(err => {
        setModelsCache(prev => ({ ...prev, [llmName]: { loading: false, models: [], error: err.message } }));
      });
  };

  // Populate availableModels when selectedLlm or cache changes
  useEffect(() => {
    if (!selectedLlm) {
      setAvailableModels([]);
      setLoadingModels(false);
      return;
    }

    const cache = modelsCache[selectedLlm];
    if (cache?.models?.length > 0) {
      setAvailableModels(cache.models);
      setLoadingModels(false);
      return;
    }
    if (cache?.loading) {
      setLoadingModels(true);
      return;
    }

    setLoadingModels(false);
    fetchModelsForProvider(selectedLlm);
  }, [selectedLlm, modelsCache]);

  const handleRunTest = async () => {
    if (!query.trim() || !selectedModel || !selectedLlm) {
      setError('Please enter a query, select an LLM provider, and select a model.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model: selectedModel, llm: selectedLlm })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Test failed');
        recordCapabilityTest(selectedLlm, selectedModel, 'function-calling', false);
        setResult(null);
      } else {
        setResult(data);
        // A test counts as successful if at least one tool call succeeded
        const toolCalls = data.tool_calls || [];
        const anyToolSucceeded = toolCalls.length > 0 && toolCalls.some(tc => tc.result?.success === true);
        recordCapabilityTest(selectedLlm, selectedModel, 'function-calling', anyToolSucceeded);
      }
    } catch (err) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioClick = (scenario) => {
    setQuery(scenario.query);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-1">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Home</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            🔧 Tool Testing
          </h1>
          <p className="text-gray-500 mt-1">
            Test which models can use tools effectively. Results are tracked for validation.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 py-8 flex flex-col gap-8">

        {/* Tool Registry Display */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Available Tools
            {toolsEnabled
              ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Enabled</span>
              : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Disabled globally</span>
            }
          </h2>
          {tools.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              No tools registered. Add a <code className="font-mono">tools.registry</code> section to your config to define tools.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map(tool => (
                <div key={tool.name} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-gray-900 font-mono text-sm">{tool.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_BADGE_COLORS[tool.type] || 'bg-gray-100 text-gray-700'}`}>
                      {tool.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Test Configuration */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Run Test</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* LLM Provider selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LLM Provider
              </label>
              <select
                value={selectedLlm}
                onChange={e => { setSelectedLlm(e.target.value); setSelectedModel(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {llms.length === 0 && (
                  <option value="">No providers configured</option>
                )}
                {llms.map(l => (
                  <option key={l.llmName} value={l.llmName}>
                    {l.llmName} ({l.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Model selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={loadingModels || availableModels.length === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {loadingModels ? (
                  <option value="">Loading models...</option>
                ) : availableModels.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  <>
                    <option value="">Select a model</option>
                    {availableModels.map(m => {
                      const badges = [];
                      const hasFunctionCalling = m.capabilities?.includes('function-calling')
                        || isCapabilityValidated(selectedLlm, m.id, 'function-calling');
                      if (hasFunctionCalling) badges.push('🔧');
                      if (m.capabilities?.includes('vision')) badges.push('🎨');
                      const label = `${m.name || m.id}${badges.length ? ' ' + badges.join(' ') : ''}`;
                      return (
                        <option key={m.id} value={m.id}>{label}</option>
                      );
                    })}
                  </>
                )}
              </select>
              {modelsCache[selectedLlm]?.error && (
                <p className="text-xs text-red-500 mt-1">{modelsCache[selectedLlm].error}</p>
              )}
            </div>
          </div>

          {/* Query input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Query
            </label>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter a query that requires tool use, e.g. 'What is 15% of 240?'"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRunTest}
            disabled={loading || !query.trim() || !selectedModel}
            className={`
              px-6 py-2.5 rounded-lg font-medium text-sm transition-colors
              ${loading || !query.trim() || !selectedModel
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {loading ? 'Running...' : 'Run Test'}
          </button>
        </section>

        {/* Example Scenarios */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Example Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXAMPLE_SCENARIOS.map((scenario, idx) => (
              <button
                key={idx}
                onClick={() => handleScenarioClick(scenario)}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-gray-900 text-sm mb-1">{scenario.title}</div>
                <div className="text-xs text-gray-500 mb-2">{scenario.description}</div>
                <div className="text-xs text-gray-400 italic line-clamp-2">{scenario.query}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <div><strong>Error:</strong> {error}</div>
            {selectedModel && (() => {
              const status = getCapabilityStatus(selectedLlm, selectedModel, 'function-calling');
              if (!status) return null;
              return (
                <div className="mt-2 pt-2 border-t border-red-200 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
                    🔧⚠️ Not validated
                  </span>
                  <span className="text-red-700">
                    {status.testCount} test{status.testCount !== 1 ? 's' : ''} · {Math.round(status.successRate * 100)}% success rate
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Test Results
              {result.max_iterations_reached && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                  Max iterations reached
                </span>
              )}
            </h2>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                Model: <strong>{result.model}</strong>
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                Provider: <strong>{result.service}</strong>
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                Tool calls: <strong>{result.tool_calls?.length || 0}</strong>
              </span>
            </div>

            {/* Tool Calls */}
            {result.tool_calls && result.tool_calls.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tool Calls</h3>
                <div className="flex flex-col gap-2">
                  {result.tool_calls.map((tc, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-medium text-blue-800">
                          {tc.tool_name}
                        </span>
                        <span className="text-xs text-gray-500">iteration {tc.iteration}</span>
                        <span className="text-xs text-gray-500">{tc.execution_time_ms}ms</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${tc.result?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {tc.result?.success ? 'success' : 'failed'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Params</div>
                          <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-auto max-h-24">
                            {JSON.stringify(tc.params, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Result</div>
                          <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-auto max-h-24">
                            {JSON.stringify(tc.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Response */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Final Response</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                {result.content}
              </div>
            </div>

            {/* Validation Status (from localStorage) */}
            {(() => {
              const status = getCapabilityStatus(selectedLlm, selectedModel, 'function-calling');
              if (!status) return null;
              return (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Function-Calling Validation</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {status.validated ? '🔧✓ Validated' : '🔧⚠️ Not validated'}
                    </span>
                    <span className="text-gray-600">
                      {status.testCount} test{status.testCount !== 1 ? 's' : ''}
                      {' '}· {Math.round(status.successRate * 100)}% success rate
                    </span>
                  </div>
                </div>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
}

export default ToolTesting;
