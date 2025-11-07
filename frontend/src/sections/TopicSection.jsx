import React, { useState, useEffect } from 'react';
import ConfigSection from '../ConfigSection';

/**
 * TopicSection - Configure topic detection provider and model
 * Phase 3b.5: Topic Detection Configuration
 * Decision 16: Models cache lifted to ConfigBuilder for persistence across navigation
 */
function TopicSection({ workingConfig, onUpdate, modelsCache, setModelsCache, fetchModelsForProvider }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Topic tester state
  const [showTestModal, setShowTestModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const llmProviders = Object.keys(workingConfig?.llms || {});
  const currentProvider = workingConfig?.topic?.provider?.llm || '';
  const currentModel = workingConfig?.topic?.provider?.model || '';

  // Auto-correct invalid provider selection
  const validProvider = llmProviders.includes(currentProvider) 
    ? currentProvider 
    : (llmProviders.length > 0 ? llmProviders[0] : '');

  // Filter models suitable for topic detection (chat models only, exclude reasoning/embedding/audio/etc)
  const filterTopicDetectionModels = (models) => {
    return models.filter(model => {
      // Exclude non-chat types
      if (model.type && !['chat', 'base'].includes(model.type)) {
        return false;
      }
      
      // Exclude reasoning models (overkill for topic detection)
      if (model.type === 'reasoning' || model.capabilities?.includes('reasoning')) {
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
      // Filter to only chat-capable models
      const filteredModels = filterTopicDetectionModels(cache.models);
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
  }, [validProvider, modelsCache]); // Re-run when provider or cache changes

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    
    // Get default model for this provider
    const providerConfig = workingConfig.llms[newProvider];
    const defaultModel = providerConfig?.default_model || '';
    
    const updatedConfig = {
      ...workingConfig,
      topic: {
        ...workingConfig.topic,
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
      topic: {
        ...workingConfig.topic,
        provider: {
          llm: validProvider,
          model: newModel
        }
      }
    };

    onUpdate(updatedConfig);
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

  const handleOpenTestModal = () => {
    if (!validProvider || !currentModel) {
      alert('Please configure a topic detection provider and model first.');
      return;
    }

    // Load conversations from localStorage
    try {
      const stored = localStorage.getItem('chatSessions_v2');
      if (stored) {
        const data = JSON.parse(stored);
        const nonEmptySessions = (data.sessions || [])
          .filter(s => !s.archived && s.messages && s.messages.length > 0)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // Most recent first
        setConversations(nonEmptySessions);
        if (nonEmptySessions.length > 0) {
          setSelectedConversation(nonEmptySessions[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }

    setShowTestModal(true);
    setTestResult(null);
  };

  const handleCloseTestModal = () => {
    setShowTestModal(false);
    setSelectedConversation(null);
    setTestResult(null);
  };

  const handleTestTopicEvolution = async () => {
    if (!selectedConversation) return;

    setTesting(true);
    setTestResult(null);

    try {
      const session = conversations.find(c => c.id === selectedConversation);
      if (!session || !session.messages || session.messages.length === 0) {
        throw new Error('No messages in selected conversation');
      }

      const providerConfig = workingConfig.llms[validProvider];
      if (!providerConfig) {
        throw new Error(`Provider ${validProvider} not found in working config`);
      }

      const response = await fetch('/api/connections/topic/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_config: providerConfig,
          model: currentModel,
          messages: session.messages
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Topic testing failed');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing topic evolution:', error);
      setTestResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (!workingConfig) {
    return null;
  }

  if (llmProviders.length === 0) {
    return (
      <ConfigSection
        title="Topic Detection"
        description="Configure which model identifies conversation topics."
      >
        <div className="max-w-2xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  No LLM Providers Configured
                </h3>
                <p className="text-sm text-yellow-800">
                  Add at least one LLM provider to configure topic detection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ConfigSection>
    );
  }

  return (
    <ConfigSection
      title="Topic Detection"
      description="Configure which model identifies conversation topics from user messages."
    >
      <div className="max-w-2xl space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          {llmProviders.length === 1 ? (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
              {validProvider}
            </div>
          ) : (
            <select
              value={validProvider}
              onChange={handleProviderChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {llmProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Warning if provider was auto-corrected */}
        {currentProvider && !llmProviders.includes(currentProvider) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2 text-sm text-yellow-800">
              <span>⚠️</span>
              <span>
                Provider '<strong>{currentProvider}</strong>' no longer exists. 
                Auto-switched to '<strong>{validProvider}</strong>'. 
                Click Validate & Apply to save this change.
              </span>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          {loadingModels ? (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500">
              Loading models...
            </div>
          ) : availableModels.length > 0 ? (
            <select
              value={currentModel}
              onChange={handleModelChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a model...</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {isSmallModel(model.id) && '⚡'}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500">
              No models available
            </div>
          )}
        </div>

        {/* Topic Tester */}
        {validProvider && currentModel && (
          <div className="flex justify-end">
            <button
              onClick={handleOpenTestModal}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Test
            </button>
          </div>
        )}

        {/* Tip */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Smaller models (1.5b-3b) work well for topic detection - 
                they're fast and accurate enough for this task. Look for models with ⚡ badge.
              </p>
            </div>
          </div>
        </div>

        {/* Current Configuration */}
        {validProvider && currentModel && (
          <div className="text-sm text-gray-600">
            Current: <span className="font-medium">{validProvider}</span> / <span className="font-medium">{currentModel}</span>
          </div>
        )}
      </div>

      {/* Test Topic Evolution Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">Test Topic Detection</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Using <span className="font-medium">{validProvider}</span> / <span className="font-medium">{currentModel}</span>
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
                  <strong>Tip:</strong> Select a saved conversation to see how the topic evolves throughout the chat.
                  The system processes each user message incrementally, showing how topics change or continue.
                </p>
              </div>

              {/* Conversation Selector */}
              {conversations.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Conversation
                  </label>
                  <select
                    value={selectedConversation || ''}
                    onChange={(e) => setSelectedConversation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {conversations.map((conv) => (
                      <option key={conv.id} value={conv.id}>
                        {conv.title} ({conv.metadata?.messageCount || conv.messages.length} messages)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm text-yellow-800">
                    No saved conversations found. Start a chat to create conversation history.
                  </p>
                </div>
              )}

              {/* Test Button */}
              {conversations.length > 0 && (
                <button
                  onClick={handleTestTopicEvolution}
                  disabled={testing || !selectedConversation}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {testing ? 'Analyzing...' : 'Analyze Topic Evolution'}
                </button>
              )}

              {/* Test Results */}
              {testResult && (
                <div className="border rounded p-4">
                  {testResult.error ? (
                    <div className="text-red-600">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-gray-50 border rounded p-3">
                        <div className="text-sm font-medium text-gray-700">Analysis Summary</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {testResult.userMessageCount} user message(s) analyzed
                        </div>
                      </div>

                      {/* Topic Evolution Timeline */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-3">Topic Evolution:</div>
                        <div className="space-y-2">
                          {testResult.evolution.map((step, idx) => {
                            const isNewTopic = step.topicStatus === 'new_topic';
                            
                            return (
                              <div
                                key={idx}
                                className={`border-l-4 pl-4 py-2 ${
                                  isNewTopic
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-300 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-medium text-gray-500 min-w-[60px]">
                                    Msg {step.messageIndex + 1}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-sm text-gray-700 mb-1">
                                      {step.userMessage}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-purple-700">
                                        → {step.detectedTopic}
                                      </span>
                                      {isNewTopic && (
                                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                                          new topic ✨
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Topic Summary */}
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="text-sm font-medium text-purple-900">Final Topic:</div>
                        <div className="text-lg font-semibold text-purple-700 mt-1">
                          {testResult.evolution[testResult.evolution.length - 1]?.detectedTopic}
                        </div>
                      </div>
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

export default TopicSection;

