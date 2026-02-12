import React, { useState, useEffect, useRef } from 'react';
import { useModelValidation } from '../hooks/useModelValidation';

/**
 * HandlerModal - Create or edit a response handler
 * Phase 4.2: Basic structure with LLM/model selection and prompt editor
 * Phase 4.3: Match criteria builder
 */
function HandlerModal({ handler, workingConfig, onSave, onCancel, modelsCache, setModelsCache, fetchModelsForProvider }) {
  const isEdit = handler !== null;
  const promptTextareaRef = useRef(null);
  
  // Initialize form state
  const [formData, setFormData] = useState({
    llm: handler?.llm || '',
    model: handler?.model || '',
    prompt: handler?.prompt || '',
    max_tokens: handler?.max_tokens || 1000,
    match: handler?.match || null,
    tools: handler?.tools || null,
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'match' | 'prompt' | 'tools'

  const llmProviders = workingConfig?.llms || {};
  const llmProviderKeys = Object.keys(llmProviders || {});

  // Load models when LLM provider changes
  useEffect(() => {
    if (!formData.llm) {
      setAvailableModels([]);
      setLoadingModels(false);
      return;
    }

    // Check if models are already cached
    const cache = modelsCache[formData.llm];
    if (cache?.models?.length > 0) {
      // Filter to only chat-capable models
      const chatModels = cache.models.filter(m => {
        const type = m.type || 'chat'; // Default to chat if no type specified
        // Include models that can be used for chat responses
        const chatCapableTypes = ['chat', 'base', 'code', 'reasoning', 'both'];
        return chatCapableTypes.includes(type);
      });
      setAvailableModels(chatModels);
      setLoadingModels(false);
      return;
    }

    // Update loading state based on cache
    if (cache?.loading) {
      setLoadingModels(true);
      return;
    }

    // Fetch models using centralized function (ConfigBuilder handles caching)
    fetchModelsForProvider(formData.llm);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.llm, modelsCache]);

  const handleSave = () => {
    // Validation
    if (!formData.llm || !formData.model || !formData.prompt) {
      alert('Please fill in all required fields (LLM, Model, Prompt)');
      return;
    }

    // Clean up match if empty
    const finalHandler = { ...formData };
    if (finalHandler.match && Object.keys(finalHandler.match).length === 0) {
      delete finalHandler.match;
    }

    onSave(finalHandler);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Response Handler' : 'Add Response Handler'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              LLM & Model
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'match'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Match Criteria
              {formData.match && Object.keys(formData.match).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                  {Object.keys(formData.match).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'prompt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Prompt & Parameters
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tools'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tools
              {formData.tools?.enabled && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                  🔧 on
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'basic' && (
            <BasicTab
              formData={formData}
              setFormData={setFormData}
              llmProviderKeys={llmProviderKeys}
              availableModels={availableModels}
              loadingModels={loadingModels}
              workingConfig={workingConfig}
            />
          )}
          {activeTab === 'match' && (
            <MatchTab
              formData={formData}
              setFormData={setFormData}
              workingConfig={workingConfig}
            />
          )}
          {activeTab === 'prompt' && (
            <PromptTab
              formData={formData}
              setFormData={setFormData}
              promptTextareaRef={promptTextareaRef}
            />
          )}
          {activeTab === 'tools' && (
            <ToolsTab
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add Handler'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to detect small/fast models
 */
const isSmallModel = (modelName) => {
  const name = modelName.toLowerCase();
  // Match models with <= 3B parameters (e.g., 0.5b, 1b, 1.5b, 3b)
  const paramMatch = name.match(/(\d+\.?\d*)b/);
  if (paramMatch) {
    const params = parseFloat(paramMatch[1]);
    if (params <= 3) return true;
  }
  // Also catch common "mini" models
  return name.includes('mini');
};

/**
 * BasicTab - LLM and Model selection
 */
function BasicTab({ formData, setFormData, llmProviderKeys, availableModels, loadingModels, workingConfig }) {
  const { isCapabilityValidated } = useModelValidation();
  return (
    <div className="space-y-6">
      {/* LLM Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Provider <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.llm}
          onChange={(e) => setFormData({ ...formData, llm: e.target.value, model: '' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select LLM provider...</option>
          {llmProviderKeys.map((key) => {
            const config = workingConfig?.llms?.[key];
            const displayName = config?.description || key;
            return (
              <option key={key} value={key}>
                {displayName}
              </option>
            );
          })}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model <span className="text-red-500">*</span>
        </label>
        {loadingModels ? (
          <div className="text-sm text-gray-500">Loading models...</div>
        ) : availableModels && availableModels.length > 0 ? (
          <div>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select model...</option>
              {availableModels.map((model) => {
                const badges = [];
                if (isSmallModel(model.id)) badges.push('⚡');
                if (model.capabilities?.includes('vision')) badges.push('🎨');
                const hasToolCalling = model.capabilities?.includes('function-calling')
                  || isCapabilityValidated(formData.llm, model.id, 'function-calling');
                if (hasToolCalling) badges.push('🔧');
                if (model.maxTokens && model.maxTokens >= 100000) badges.push('📚');
                
                const displayName = `${model.name || model.id}${badges.length > 0 ? ' ' + badges.join(' ') : ''}`;
                
                return (
                  <option key={model.id} value={model.id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
            {formData.model && availableModels.find(m => m.id === formData.model) && (
              <div className="mt-2 text-xs text-gray-600">
                {(() => {
                  const selectedModel = availableModels.find(m => m.id === formData.model);
                  const info = [];
                  if (selectedModel.maxTokens) info.push(`Max: ${selectedModel.maxTokens.toLocaleString()} tokens`);
                  const caps = [...(selectedModel.capabilities || [])];
                  if (!caps.includes('function-calling') && isCapabilityValidated(formData.llm, selectedModel.id, 'function-calling')) {
                    caps.push('function-calling ✓');
                  }
                  if (caps.length > 0) {
                    info.push(`Capabilities: ${caps.map(c => c.replace('-', ' ')).join(', ')}`);
                  }
                  return info.length > 0 ? info.join(' • ') : 'Chat model';
                })()}
              </div>
            )}
          </div>
        ) : formData.llm ? (
          <div className="text-sm text-gray-500">No chat models available for this provider</div>
        ) : (
          <div className="text-sm text-gray-400">Select an LLM provider first</div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Choose the LLM and model that will be used to generate responses
          when this handler matches. Different handlers can use different LLMs/models based on
          the type of query.
        </p>
      </div>
    </div>
  );
}

/**
 * MatchTab - Match criteria configuration (Phase 4.3)
 */
function MatchTab({ formData, setFormData, workingConfig }) {
  const match = formData.match || {};
  
  const updateMatch = (key, value) => {
    const newMatch = { ...match };
    if (value === null || value === undefined) {
      delete newMatch[key];
    } else {
      newMatch[key] = value;
    }
    setFormData({ ...formData, match: Object.keys(newMatch).length > 0 ? newMatch : null });
  };

  const ragServices = Object.keys(workingConfig?.rag_services || {});
  const intents = Object.keys(workingConfig?.intent?.detection || {});

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm text-blue-800">
          <strong>Match Criteria:</strong> Define conditions that must be met for this handler to be used.
          Leave all criteria empty to create a catch-all handler (used when no other handler matches).
        </p>
      </div>

      {/* RAG Service Match */}
      <div className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="match-service"
            checked={match.service !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                updateMatch('service', '');
              } else {
                // Clear all service-related fields at once
                const newMatch = { ...match };
                delete newMatch.service;
                delete newMatch.collection;
                delete newMatch.collection_contains;
                setFormData({ ...formData, match: Object.keys(newMatch).length > 0 ? newMatch : null });
              }
            }}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="match-service" className="block text-sm font-medium text-gray-700 mb-2">
              Match on RAG Service
            </label>
            
            {match.service !== undefined && (
              <div className="space-y-3 ml-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Service Name
                  </label>
                  <select
                    value={match.service || ''}
                    onChange={(e) => updateMatch('service', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select service...</option>
                    {ragServices.map((service) => {
                      const config = workingConfig?.rag_services?.[service];
                      const displayName = config?.description || service;
                      return (
                        <option key={service} value={service}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Collection Matching (optional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={match.collection !== undefined ? 'exact' : match.collection_contains !== undefined ? 'contains' : ''}
                      onChange={(e) => {
                        const newMatch = { ...match };
                        
                        if (e.target.value === 'exact') {
                          // Transfer value from collection_contains to collection
                          const currentValue = match.collection_contains || match.collection || '';
                          delete newMatch.collection_contains;
                          newMatch.collection = currentValue;
                        } else if (e.target.value === 'contains') {
                          // Transfer value from collection to collection_contains
                          const currentValue = match.collection || match.collection_contains || '';
                          delete newMatch.collection;
                          newMatch.collection_contains = currentValue;
                        } else {
                          // Clear both
                          delete newMatch.collection;
                          delete newMatch.collection_contains;
                        }
                        
                        setFormData({ ...formData, match: Object.keys(newMatch).length > 0 ? newMatch : null });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Any collection</option>
                      <option value="exact">Exact name</option>
                      <option value="contains">Contains text</option>
                    </select>
                    
                    {(match.collection !== undefined || match.collection_contains !== undefined) && (
                      <input
                        type="text"
                        value={match.collection || match.collection_contains || ''}
                        onChange={(e) => {
                          if (match.collection !== undefined) {
                            updateMatch('collection', e.target.value);
                          } else {
                            updateMatch('collection_contains', e.target.value);
                          }
                        }}
                        placeholder="Collection name or text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intent Match */}
      <div className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="match-intent"
            checked={match.intent !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                updateMatch('intent', '');
              } else {
                updateMatch('intent', null);
              }
            }}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="match-intent" className="block text-sm font-medium text-gray-700 mb-2">
              Match on Intent
            </label>
            
            {match.intent !== undefined && (
              <div className="ml-6">
                <select
                  value={match.intent || ''}
                  onChange={(e) => updateMatch('intent', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select intent...</option>
                  {intents.map((intent) => (
                    <option key={intent} value={intent}>
                      {intent}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Or enter a regex pattern to match intent dynamically
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAG Results Match */}
      <div className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="match-rag-results"
            checked={match.rag_results !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                updateMatch('rag_results', '');
              } else {
                updateMatch('rag_results', null);
              }
            }}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="match-rag-results" className="block text-sm font-medium text-gray-700 mb-2">
              Match on RAG Result Quality
            </label>
            
            {match.rag_results !== undefined && (
              <div className="ml-6">
                <select
                  value={match.rag_results || ''}
                  onChange={(e) => updateMatch('rag_results', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select result quality...</option>
                  <option value="match">Match (high relevance)</option>
                  <option value="partial">Partial (medium relevance)</option>
                  <option value="none">None (no relevant results)</option>
                  <option value="any">Any (match or partial)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reasoning Match */}
      <div className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="match-reasoning"
            checked={!!match.reasoning}
            onChange={(e) => updateMatch('reasoning', e.target.checked || null)}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="match-reasoning" className="block text-sm font-medium text-gray-700">
              Requires Reasoning
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Only use this handler when reasoning is enabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PromptTab - Prompt template and parameters
 */
function PromptTab({ formData, setFormData, promptTextareaRef }) {
  return (
    <div className="space-y-6">
      {/* Prompt Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          ref={promptTextareaRef}
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          rows={8}
          placeholder="You are a helpful AI assistant..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Available Variables */}
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2">Available Variables:</div>
          <div className="flex flex-wrap gap-2">
            {['{{rag_context}}', '{{topic}}', '{{intent}}', '{{reasoning}}'].map((variable) => (
              <code
                key={variable}
                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs cursor-pointer hover:bg-blue-50"
                onClick={() => {
                  const textarea = promptTextareaRef.current;
                  if (!textarea) return;

                  const currentPrompt = formData.prompt;
                  const cursorPos = textarea.selectionStart;
                  const scrollTop = textarea.scrollTop; // Save scroll position
                  const textBefore = currentPrompt.substring(0, cursorPos);
                  const textAfter = currentPrompt.substring(cursorPos);
                  
                  // Insert variable at cursor position
                  const newPrompt = textBefore + variable + textAfter;
                  setFormData({ ...formData, prompt: newPrompt });

                  // Restore cursor position and scroll after insertion
                  setTimeout(() => {
                    const newCursorPos = cursorPos + variable.length;
                    textarea.focus();
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                    textarea.scrollTop = scrollTop; // Restore scroll position
                  }, 0);
                }}
                title="Click to insert at cursor position"
              >
                {variable}
              </code>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Click a variable to insert it into your prompt. Variables are replaced with actual values at runtime.
          </p>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          value={formData.max_tokens}
          onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 1000 })}
          min="50"
          max="10000"
          step="50"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum number of tokens in the response (50-10000)
        </p>
      </div>
    </div>
  );
}

/**
 * ToolsTab - Configure tool calling for this handler
 */
function ToolsTab({ formData, setFormData }) {
  const [registeredTools, setRegisteredTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(true);

  useEffect(() => {
    fetch('/api/tools/list')
      .then(res => res.json())
      .then(data => setRegisteredTools(data.tools || []))
      .catch(() => setRegisteredTools([]))
      .finally(() => setLoadingTools(false));
  }, []);

  const toolsConfig = formData.tools || { enabled: false, allowed_tools: [], max_iterations: null };
  const enabled = toolsConfig.enabled === true;
  const allowedTools = toolsConfig.allowed_tools || [];
  const maxIterations = toolsConfig.max_iterations || '';

  const updateTools = (patch) => {
    const updated = { ...toolsConfig, ...patch };
    // If disabling, remove the tools key entirely
    if (!updated.enabled) {
      setFormData({ ...formData, tools: null });
    } else {
      setFormData({ ...formData, tools: updated });
    }
  };

  const toggleTool = (toolName) => {
    const next = allowedTools.includes(toolName)
      ? allowedTools.filter(t => t !== toolName)
      : [...allowedTools, toolName];
    updateTools({ allowed_tools: next });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="tools-enabled"
          checked={enabled}
          onChange={(e) => updateTools({ enabled: e.target.checked })}
          className="mt-1"
        />
        <div>
          <label htmlFor="tools-enabled" className="block text-sm font-medium text-gray-700">
            Enable tool calling for this handler
          </label>
          <p className="text-xs text-gray-500 mt-1">
            When enabled, the model can invoke registered tools before generating a response.
            Requires a model that supports function calling.
          </p>
        </div>
      </div>

      {enabled && (
        <>
          {/* Allowed tools */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Tools
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select which tools this handler can use. Leave all unchecked to allow all registered tools.
            </p>
            {loadingTools ? (
              <p className="text-sm text-gray-400">Loading tools...</p>
            ) : registeredTools.length === 0 ? (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
                No tools registered. Add a <code className="font-mono">tools.registry</code> section to your config.
              </p>
            ) : (
              <div className="space-y-2">
                {registeredTools.map(tool => (
                  <label key={tool.name} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={allowedTools.length === 0 || allowedTools.includes(tool.name)}
                      onChange={() => toggleTool(tool.name)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">{tool.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          tool.type === 'mock' ? 'bg-yellow-100 text-yellow-800' :
                          tool.type === 'builtin' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>{tool.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                    </div>
                  </label>
                ))}
                {allowedTools.length === 0 && registeredTools.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">All tools are allowed (none explicitly selected).</p>
                )}
              </div>
            )}
          </div>

          {/* Max iterations override */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Iterations <span className="text-gray-400 font-normal">(optional override)</span>
            </label>
            <input
              type="number"
              value={maxIterations}
              onChange={(e) => updateTools({ max_iterations: e.target.value ? parseInt(e.target.value) : null })}
              min="1"
              max="20"
              placeholder="Use global default"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum tool call iterations before stopping. Overrides the global <code className="font-mono">tools.max_iterations</code> setting.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default HandlerModal;

