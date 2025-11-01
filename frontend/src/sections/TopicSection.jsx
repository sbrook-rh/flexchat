import React, { useState, useEffect } from 'react';
import ConfigSection from '../ConfigSection';

/**
 * TopicSection - Configure topic detection provider and model
 * Phase 3b.5: Topic Detection Configuration
 * Decision 16: Models cache lifted to ConfigBuilder for persistence across navigation
 */
function TopicSection({ workingConfig, onUpdate, modelsCache, setModelsCache }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const llmProviders = Object.keys(workingConfig?.llms || {});
  const currentProvider = workingConfig?.topic?.provider?.llm || '';
  const currentModel = workingConfig?.topic?.provider?.model || '';

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
    if (!currentProvider) return;

    // Check cache first
    if (modelsCache[currentProvider]) {
      setAvailableModels(modelsCache[currentProvider]);
      return;
    }

    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const providerConfig = workingConfig.llms[currentProvider];
        const response = await fetch(`/api/connections/llm/providers/${providerConfig.provider}/models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: providerConfig.provider,
            config: providerConfig
          })
        });

        const result = await response.json();
        if (result.models) {
          // Filter to only chat-capable models
          const filteredModels = filterTopicDetectionModels(result.models);
          
          // Cache the filtered results
          setModelsCache(prev => ({ ...prev, [currentProvider]: filteredModels }));
          setAvailableModels(filteredModels);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setAvailableModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProvider]); // Only re-run when provider changes, not when cache updates

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
          llm: currentProvider,
          model: newModel
        }
      }
    };

    onUpdate(updatedConfig);
  };

  // Helper to detect if model name suggests it's small/fast
  const isSmallModel = (modelName) => {
    const name = modelName.toLowerCase();
    return name.includes('1.5b') || name.includes('3b') || name.includes('mini');
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
              {currentProvider}
            </div>
          ) : (
            <select
              value={currentProvider}
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
        {currentProvider && currentModel && (
          <div className="text-sm text-gray-600">
            Current: <span className="font-medium">{currentProvider}</span> / <span className="font-medium">{currentModel}</span>
          </div>
        )}
      </div>
    </ConfigSection>
  );
}

export default TopicSection;

