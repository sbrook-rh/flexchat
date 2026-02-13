import React, { useState, useEffect } from 'react';
import { useModelValidation } from '../hooks/useModelValidation';

/**
 * ToolsSection - Tools tab in the Config Builder.
 *
 * - Fetches available builtins from /api/tools/available
 * - Toggles tools on/off in workingConfig.tools.registry
 * - Allows optional description override per tool
 * - Provides inline test panel using working config (not applied config)
 */
function ToolsSection({ workingConfig, onUpdate }) {
  const { recordCapabilityTest, getCapabilityStatus, isCapabilityValidated } = useModelValidation();

  const [availableTools, setAvailableTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(true);

  // Test panel state
  const [selectedLlm, setSelectedLlm] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsCache, setModelsCache] = useState({});
  const [loadingModels, setLoadingModels] = useState(false);
  const [query, setQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  // Fetch available builtins on mount
  useEffect(() => {
    fetch('/api/tools/available')
      .then(res => res.json())
      .then(data => {
        setAvailableTools(data.tools || []);
        setLoadingTools(false);
      })
      .catch(err => {
        console.error('Failed to fetch available tools:', err);
        setLoadingTools(false);
      });
  }, []);

  // Set default LLM when providers become available
  useEffect(() => {
    const llmNames = Object.keys(workingConfig?.llms || {});
    if (llmNames.length > 0 && !selectedLlm) {
      setSelectedLlm(llmNames[0]);
    }
  }, [workingConfig?.llms]);

  // Fetch models for a provider (with caching)
  const fetchModelsForProvider = (llmName) => {
    if (!llmName || modelsCache[llmName]?.models?.length > 0 || modelsCache[llmName]?.loading) return;

    const providerConfig = workingConfig?.llms?.[llmName];
    if (!providerConfig) return;

    setModelsCache(prev => ({ ...prev, [llmName]: { loading: true, models: [], error: null } }));

    fetch('/api/connections/llm/discovery/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerConfig.provider, config: providerConfig })
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

  useEffect(() => {
    if (selectedLlm) fetchModelsForProvider(selectedLlm);
  }, [selectedLlm]);

  // Derive active registry and global opt-in from workingConfig
  const registry = workingConfig?.tools?.registry || [];
  const applyGlobally = workingConfig?.tools?.apply_globally === true;
  const isToolEnabled = (toolName) => registry.some(e => e.name === toolName);
  const getToolEntry = (toolName) => registry.find(e => e.name === toolName);

  const handleGlobalToggle = () => {
    const newConfig = { ...workingConfig };
    if (!newConfig.tools) {
      newConfig.tools = { apply_globally: true, max_iterations: 5, registry: [] };
    } else {
      newConfig.tools = {
        ...newConfig.tools,
        apply_globally: !applyGlobally
      };
    }
    onUpdate(newConfig);
  };

  const handleToggle = (toolName, enabled) => {
    const newConfig = { ...workingConfig };

    if (!newConfig.tools) {
      newConfig.tools = { enabled: true, max_iterations: 5, registry: [] };
    }

    const currentRegistry = newConfig.tools.registry || [];

    if (enabled) {
      newConfig.tools = {
        ...newConfig.tools,
        registry: [...currentRegistry, { name: toolName }]
      };
    } else {
      newConfig.tools = {
        ...newConfig.tools,
        registry: currentRegistry.filter(e => e.name !== toolName)
      };
    }

    onUpdate(newConfig);
  };

  const handleDescriptionOverride = (toolName, description) => {
    const newConfig = { ...workingConfig };
    const currentRegistry = newConfig.tools?.registry || [];

    newConfig.tools = {
      ...newConfig.tools,
      registry: currentRegistry.map(e => {
        if (e.name !== toolName) return e;
        if (!description) {
          const { description: _removed, ...rest } = e;
          return rest;
        }
        return { ...e, description };
      })
    };

    onUpdate(newConfig);
  };

  const handleRunTest = async () => {
    if (!query.trim() || !selectedModel || !selectedLlm) return;

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    const providerConfig = workingConfig?.llms?.[selectedLlm];

    try {
      const res = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_config: providerConfig,
          model: selectedModel,
          query,
          registry
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || 'Test failed');
        recordCapabilityTest(selectedLlm, selectedModel, 'function-calling', false);
      } else {
        setTestResult(data);
        const toolCalls = data.tool_calls || [];
        const anyToolSucceeded = toolCalls.length > 0 && toolCalls.some(tc => tc.result?.success === true);
        recordCapabilityTest(selectedLlm, selectedModel, 'function-calling', anyToolSucceeded);
      }
    } catch (err) {
      setTestError(`Request failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const llmEntries = Object.entries(workingConfig?.llms || {});
  const availableModels = modelsCache[selectedLlm]?.models || [];
  const isLoadingModels = modelsCache[selectedLlm]?.loading || false;
  const activeToolCount = registry.length;
  const canTest = activeToolCount > 0 && llmEntries.length > 0 && !!selectedModel && !!query.trim();

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Tools</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enable builtin tools to give the model access to real-time capabilities. Enabled tools are included in the config when you export or apply.
          </p>
        </div>

        {/* Global opt-in toggle */}
        <div className={`flex items-start gap-4 p-4 rounded-lg border mb-6 ${applyGlobally ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={handleGlobalToggle}
            className={`mt-0.5 flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${applyGlobally ? 'bg-blue-600' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={applyGlobally}
          >
            <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${applyGlobally ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <div>
            <div className="text-sm font-semibold text-gray-800">Apply globally to all response handlers</div>
            <p className="text-xs text-gray-500 mt-0.5">
              {applyGlobally
                ? 'All enabled tools are offered to every response handler. Per-handler tool config is ignored.'
                : 'Off — tools are only used by response handlers that explicitly have tools enabled. Handlers can specify an allowed_tools list to restrict which tools they use.'}
            </p>
          </div>
        </div>

        {/* Available Tools */}
        {loadingTools ? (
          <div className="text-sm text-gray-500">Loading available tools...</div>
        ) : availableTools.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            No builtin tools found.
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            {availableTools.map(tool => {
              const enabled = isToolEnabled(tool.name);
              const entry = getToolEntry(tool.name);
              return (
                <div key={tool.name} className={`border rounded-lg p-4 transition-colors ${enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(tool.name, !enabled)}
                      className={`mt-0.5 flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      role="switch"
                      aria-checked={enabled}
                      title={enabled ? 'Disable tool' : 'Enable tool'}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>

                    {/* Tool info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">{tool.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">builtin</span>
                        {enabled && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">active</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{entry?.description || tool.description}</p>

                      {/* Description override — only when enabled */}
                      {enabled && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description override <span className="font-normal text-gray-400">(optional — leave blank to use default)</span>
                          </label>
                          <input
                            type="text"
                            value={entry?.description || ''}
                            onChange={e => handleDescriptionOverride(tool.name, e.target.value)}
                            placeholder={tool.description}
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Test Panel */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Test Tools</h3>

          {activeToolCount === 0 && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3 mb-4">
              Enable at least one tool above to run a test.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* LLM selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">LLM Provider</label>
              <select
                value={selectedLlm}
                onChange={e => { setSelectedLlm(e.target.value); setSelectedModel(''); setTestResult(null); setTestError(null); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {llmEntries.length === 0 && <option value="">No providers configured</option>}
                {llmEntries.map(([name]) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Model selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={e => { setSelectedModel(e.target.value); setTestResult(null); setTestError(null); }}
                disabled={isLoadingModels || availableModels.length === 0}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : availableModels.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  <>
                    <option value="">Select a model</option>
                    {availableModels.map(m => {
                      const hasFunctionCalling = m.capabilities?.includes('function-calling') || isCapabilityValidated(selectedLlm, m.id, 'function-calling');
                      const label = `${m.name || m.id}${hasFunctionCalling ? ' 🔧' : ''}`;
                      return <option key={m.id} value={m.id}>{label}</option>;
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
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Test Query</label>
            <textarea
              value={query}
              onChange={e => { setQuery(e.target.value); setTestResult(null); setTestError(null); }}
              placeholder="e.g. What time is it in Tokyo? or Calculate 15% of 240."
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRunTest}
            disabled={!canTest || testing}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${!canTest || testing ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {testing ? 'Running...' : 'Run Test'}
          </button>

          {/* Error */}
          {testError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              <strong>Error:</strong> {testError}
            </div>
          )}

          {/* Results */}
          {testResult && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">Results</span>
                {testResult.max_iterations_reached && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Max iterations reached</span>
                )}
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Model: {testResult.model}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Provider: {testResult.service}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Tool calls: {testResult.tool_calls?.length || 0}</span>
              </div>

              {testResult.tool_calls?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Tool Calls</div>
                  <div className="flex flex-col gap-2">
                    {testResult.tool_calls.map((tc, idx) => (
                      <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-blue-800">{tc.tool_name}</span>
                          <span className="text-xs text-gray-500">iteration {tc.iteration}</span>
                          <span className="text-xs text-gray-500">{tc.execution_time_ms}ms</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${tc.result?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {tc.result?.success ? 'success' : 'failed'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Params</div>
                            <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-auto max-h-24">{JSON.stringify(tc.params, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Result</div>
                            <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-auto max-h-24">{JSON.stringify(tc.result, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Final Response</div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {testResult.content}
                </div>
              </div>

              {/* Validation badge */}
              {(() => {
                const status = getCapabilityStatus(selectedLlm, selectedModel, 'function-calling');
                if (!status) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${status.validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {status.validated ? '🔧✓ Validated' : '🔧⚠️ Not validated'}
                    </span>
                    <span className="text-gray-600">{status.testCount} test{status.testCount !== 1 ? 's' : ''} · {Math.round(status.successRate * 100)}% success rate</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ToolsSection;
