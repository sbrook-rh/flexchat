import React, { useState, useEffect } from 'react';
import ConfigSection from '../ConfigSection';

/**
 * IntentSection - Configure intent detection provider, model, and intent definitions
 * Phase 3b: Intent Detection Configuration UI
 */
function IntentSection({ workingConfig, onUpdate, modelsCache, setModelsCache, fetchModelsForProvider }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [editingIntent, setEditingIntent] = useState(null);
  const [showIntentForm, setShowIntentForm] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);

  const llmProviders = Object.keys(workingConfig?.llms || {});
  const currentProvider = workingConfig?.intent?.provider?.llm || '';
  const currentModel = workingConfig?.intent?.provider?.model || '';
  const intents = workingConfig?.intent?.detection || {};

  // Auto-correct invalid provider selection
  const validProvider = llmProviders.includes(currentProvider) 
    ? currentProvider 
    : (llmProviders.length > 0 ? llmProviders[0] : '');

  // Filter models suitable for intent detection (chat models only)
  const filterIntentDetectionModels = (models) => {
    return models.filter(model => {
      // Exclude non-chat types
      if (model.type && !['chat', 'base'].includes(model.type)) {
        return false;
      }
      
      // Include models with chat capability
      if (model.capabilities?.includes('chat')) {
        return true;
      }
      
      // Include if type is chat or base
      return model.type === 'chat' || model.type === 'base';
    });
  };

  // Load models when provider changes
  useEffect(() => {
    if (!validProvider) return;

    // Check if models are already cached
    const cache = modelsCache[validProvider];
    if (cache?.models?.length > 0) {
      const filteredModels = filterIntentDetectionModels(cache.models);
      setAvailableModels(filteredModels);
      setLoadingModels(false);
      return;
    }

    // Update loading state based on cache
    if (cache?.loading) {
      setLoadingModels(true);
      return;
    }

    // Fetch models using centralized function
    fetchModelsForProvider(validProvider);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validProvider, modelsCache]);

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    
    // Get default model for this provider
    const providerConfig = workingConfig.llms[newProvider];
    const defaultModel = providerConfig?.default_model || '';
    
    const updatedConfig = {
      ...workingConfig,
      intent: {
        ...(workingConfig.intent || {}),
        provider: {
          llm: newProvider,
          model: defaultModel
        }
      }
    };

    onUpdate(updatedConfig);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    
    const updatedConfig = {
      ...workingConfig,
      intent: {
        ...(workingConfig.intent || {}),
        provider: {
          llm: validProvider,
          model: newModel
        }
      }
    };

    onUpdate(updatedConfig);
  };

  const handleAddIntent = () => {
    setEditingIntent({ name: '', description: '' });
    setShowIntentForm(true);
  };

  const handleEditIntent = (name, description) => {
    setEditingIntent({ name, description, originalName: name });
    setShowIntentForm(true);
  };

  const handleDeleteIntent = (name) => {
    if (!confirm(`Delete intent "${name}"?`)) return;

    const newIntents = { ...intents };
    delete newIntents[name];

    const updatedConfig = {
      ...workingConfig,
      intent: {
        ...(workingConfig.intent || {}),
        detection: newIntents
      }
    };

    onUpdate(updatedConfig);
  };

  const handleSaveIntent = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name').trim();
    const description = formData.get('description').trim();

    if (!name || !description) return;

    const newIntents = { ...intents };
    
    // If editing and name changed, delete old key
    if (editingIntent?.originalName && editingIntent.originalName !== name) {
      delete newIntents[editingIntent.originalName];
    }

    newIntents[name] = description;

    const updatedConfig = {
      ...workingConfig,
      intent: {
        ...(workingConfig.intent || {}),
        detection: newIntents
      }
    };

    onUpdate(updatedConfig);
    setShowIntentForm(false);
    setEditingIntent(null);
  };

  const handleCancelIntent = () => {
    setShowIntentForm(false);
    setEditingIntent(null);
  };

  // Helper to detect if model name suggests it's small/fast
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

  const handleOpenTestModal = async () => {
    if (!validProvider || !currentModel) {
      alert('Please configure an intent detection provider and model first.');
      return;
    }

    // Fetch available collections from applied config
    try {
      const response = await fetch('/api/ui-config');
      if (response.ok) {
        const data = await response.json();
        setAvailableCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      setAvailableCollections([]);
    }

    setShowTestModal(true);
    setTestResult(null);
  };

  const handleCloseTestModal = () => {
    setShowTestModal(false);
    setTestQuery('');
    setSelectedCollections([]);
    setTestResult(null);
  };

  const handleToggleCollection = (collection) => {
    setSelectedCollections(prev => {
      const key = `${collection.service}/${collection.name}`;
      const isSelected = prev.some(c => `${c.service}/${c.name}` === key);
      
      if (isSelected) {
        return prev.filter(c => `${c.service}/${c.name}` !== key);
      } else {
        return [...prev, collection];
      }
    });
  };

  const handleTestIntent = async () => {
    if (!testQuery.trim()) return;
    if (!validProvider || !currentModel) {
      alert('Please configure an intent detection provider and model first.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Get the provider config from workingConfig (same pattern as other test endpoints)
      const providerConfig = workingConfig.llms[validProvider];
      
      if (!providerConfig) {
        throw new Error(`Provider ${validProvider} not found in working config`);
      }

      // Call backend intent testing endpoint with connection payload pattern
      const response = await fetch('/api/connections/intent/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: testQuery,
          provider_config: providerConfig,
          model: currentModel,
          working_config: workingConfig,
          selected_collections: selectedCollections
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Intent testing failed');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const intentCount = Object.keys(intents).length;
  const hasProvider = validProvider && currentModel;

  return (
    <ConfigSection
      title="Intent Detection"
      description="Configure intent-based query classification for smarter routing."
    >
      <div className="max-w-3xl space-y-6">
        
        {/* Provider Configuration */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Provider Configuration</h3>
          
          {llmProviders.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-yellow-800">
                No LLM providers configured. Add an LLM provider first to enable intent detection.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LLM Provider
                </label>
                <select
                  value={validProvider}
                  onChange={handleProviderChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {llmProviders.map(provider => {
                    const config = workingConfig?.llms?.[provider];
                    const displayName = config?.description || provider;
                    return (
                      <option key={provider} value={provider}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                {loadingModels ? (
                  <div className="text-sm text-gray-500">Loading models...</div>
                ) : availableModels.length > 0 ? (
                  <select
                    value={currentModel}
                    onChange={handleModelChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a model</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name || model.id} {isSmallModel(model.id) && '⚡'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-500">No chat models available</div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-lg">💡</span>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900">
                      <strong>Tip:</strong> Smaller models (1.5b-3b) work well for intent detection - 
                      they're fast and accurate enough for this task. Look for models with ⚡ badge.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Intent Definitions */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Intent Definitions</h3>
              <p className="text-sm text-gray-600 mt-1">
                {intentCount === 0 ? 'No intents defined' : `${intentCount} intent${intentCount !== 1 ? 's' : ''} defined`}
              </p>
            </div>
            <button
              onClick={handleAddIntent}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add Intent
            </button>
          </div>

          {/* Intent List */}
          {intentCount > 0 ? (
            <div className="space-y-2">
              {Object.entries(intents).map(([name, description]) => (
                <div
                  key={name}
                  className="flex items-start justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-sm text-gray-600 mt-1">{description}</div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditIntent(name, description)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteIntent(name)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <p>No intents defined yet. Click "Add Intent" to create your first intent.</p>
            </div>
          )}

          {/* Intent Form Modal */}
          {showIntentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingIntent?.originalName ? 'Edit Intent' : 'Add Intent'}
                </h3>
                <form onSubmit={handleSaveIntent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intent Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingIntent?.name || ''}
                      placeholder="e.g., support, subscriptions, billing"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use a short, descriptive name (lowercase, no spaces)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingIntent?.description || ''}
                      placeholder="Describe when this intent should be detected..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Be specific about what queries should match this intent
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelIntent}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {editingIntent?.originalName ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Intent Tester */}
        {hasProvider && intentCount > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleOpenTestModal}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Test
            </button>
          </div>
        )}

        {/* Status Banner */}
        {!hasProvider && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Configure a provider and model above to enable intent detection.
            </p>
        </div>
        )}
      </div>

      {/* Test Intent Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Test Intent Classifier</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Using <span className="font-medium">{workingConfig?.llms?.[currentProvider]?.description || currentProvider}</span> / <span className="font-medium">{currentModel}</span>
                  </p>
                </div>
                <button
                  onClick={handleCloseTestModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Tip */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> This uses the actual backend classifier with your configured model.
                  You can optionally include RAG collections from your applied configuration to test how they appear as intent options.
                </p>
              </div>

              {/* Test Query Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Query
                </label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Enter a test query..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !testing && testQuery.trim()) {
                      handleTestIntent();
                    }
                  }}
                />
              </div>

              {/* Collections Selection */}
              {availableCollections.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Include RAG Collections (from applied config)
                  </label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                    {availableCollections.map((col) => {
                      const key = `${col.service}/${col.name}`;
                      const isSelected = selectedCollections.some(
                        c => `${c.service}/${c.name}` === key
                      );
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCollection(col)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">
                            {col.service} / {col.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    ℹ️ Only collections from the applied (saved) configuration are shown.
                    Unsaved RAG services won't appear here.
                  </p>
                </div>
              )}

              {/* Test Button */}
              <button
                onClick={handleTestIntent}
                disabled={testing || !testQuery.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {testing ? 'Testing...' : 'Test Intent'}
              </button>

              {/* Test Results */}
              {testResult && (
                <div className="border rounded p-4">
                  {testResult.error ? (
                    <div className="text-red-600">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Query:</div>
                        <div className="text-sm text-gray-900 mt-1">{testResult.query}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700">Detected Intent:</div>
                        <div className="text-lg font-semibold text-purple-600 mt-1">
                          {testResult.detected_intent}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700">Categories Tested:</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {testResult.intent_count} configured intent(s), {testResult.collection_count} collection(s), plus "other"
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700">Available Intents:</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {testResult.available_intents.join(', ')}, other
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700">Provider / Model:</div>
                        <div className="text-sm text-gray-900 mt-1">{testResult.provider} / {testResult.model}</div>
                      </div>

                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                          Show prompt
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 border rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {testResult.prompt_used}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={handleCloseTestModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfigSection>
  );
}

export default IntentSection;
