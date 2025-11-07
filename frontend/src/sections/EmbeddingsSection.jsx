import React, { useState, useEffect } from 'react';
import ConfigSection from '../ConfigSection';

/**
 * EmbeddingsSection - Configure embedding models for RAG services
 * 
 * Supports:
 * - Global default embedding configuration
 * - Filtering to embedding-capable models only
 */
function EmbeddingsSection({ workingConfig, onUpdate, modelsCache, setModelsCache, fetchModelsForProvider }) {
  // Get LLM providers
  const llmProviders = Object.keys(workingConfig?.llms || {});
  
  // Current global embedding config
  const globalEmbedding = workingConfig?.embedding || null;
  
  // Check if we have any LLM providers
  if (llmProviders.length === 0) {
    return (
      <ConfigSection
        title="Embeddings"
        description="Configure embedding models for your RAG services."
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
                  You need to add at least one LLM provider before configuring embeddings.
                  Go to the LLM Providers section to add a provider.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ConfigSection>
    );
  }
  
  // Note: fetchModelsForProvider is now passed as a prop from ConfigBuilder (centralized)
  
  // Filter models to only show embedding-capable ones
  const filterEmbeddingModels = (models) => {
    if (!Array.isArray(models)) return [];
    return models.filter(model => 
      model.type === 'embedding' || 
      (model.capabilities && model.capabilities.includes('embedding'))
    );
  };
  
  // Get embedding models for a provider
  const getEmbeddingModels = (providerId) => {
    const cache = modelsCache[providerId];
    if (!cache) return [];
    return filterEmbeddingModels(cache.models || []);
  };
  
  // Update global embedding config
  const updateGlobalEmbedding = (llm, model) => {
    const newConfig = {
      ...workingConfig,
      embedding: { llm, model }
    };
    onUpdate(newConfig);
  };
  
  // Remove global embedding config
  const removeGlobalEmbedding = () => {
    const newConfig = { ...workingConfig };
    delete newConfig.embedding;
    onUpdate(newConfig);
  };
 
  
  // Load models for current global provider on mount
  useEffect(() => {
    if (globalEmbedding?.llm) {
      fetchModelsForProvider(globalEmbedding.llm);
    }
  }, []);
  
  return (
    <ConfigSection
      title="Embeddings"
      description="Configure embedding models for your RAG services."
    >
      <div className="max-w-4xl space-y-6">
        {/* Default Embedding Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Default Embedding Model</h3>
              <p className="text-sm text-gray-600 mt-1">
                This model will be used by all RAG services unless overridden.
              </p>
            </div>
          </div>
          
          {globalEmbedding ? (
            <GlobalEmbeddingConfig
              globalEmbedding={globalEmbedding}
              llmProviders={llmProviders}
              workingConfig={workingConfig}
              modelsCache={modelsCache}
              getEmbeddingModels={getEmbeddingModels}
              fetchModelsForProvider={fetchModelsForProvider}
              updateGlobalEmbedding={updateGlobalEmbedding}
              removeGlobalEmbedding={removeGlobalEmbedding}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600 mb-4">No default embedding model configured</p>
              <button
                onClick={() => {
                  // Initialize with first provider
                  const firstProvider = llmProviders[0];
                  fetchModelsForProvider(firstProvider);
                  updateGlobalEmbedding(firstProvider, '');
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Configure Default Embedding
              </button>
            </div>
          )}
        </div>
        
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-semibold mb-1">About Embeddings</p>
              <p>
                Embedding models convert text into numerical vectors for semantic search.
                Different models produce different embedding dimensions and quality.
                Make sure your RAG services were created with the same embedding model you configure here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

/**
 * GlobalEmbeddingConfig - Component for editing global embedding configuration
 */
function GlobalEmbeddingConfig({
  globalEmbedding,
  llmProviders,
  workingConfig,
  modelsCache,
  getEmbeddingModels,
  fetchModelsForProvider,
  updateGlobalEmbedding,
  removeGlobalEmbedding
}) {
  const [localProvider, setLocalProvider] = useState(globalEmbedding.llm);
  const [localModel, setLocalModel] = useState(globalEmbedding.model);
  
  const currentModels = getEmbeddingModels(localProvider);
  const isLoading = modelsCache[localProvider]?.loading;
  
  const handleProviderChange = (newProvider) => {
    setLocalProvider(newProvider);
    setLocalModel('');
    fetchModelsForProvider(newProvider);
  };
  
  const handleModelChange = (newModel) => {
    setLocalModel(newModel);
    updateGlobalEmbedding(localProvider, newModel);
  };
  
  const handleProviderBlur = () => {
    if (localProvider !== globalEmbedding.llm) {
      updateGlobalEmbedding(localProvider, localModel);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Provider Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          {llmProviders.length === 1 ? (
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
              {localProvider}
            </div>
          ) : (
            <select
              value={localProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              onBlur={handleProviderBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {llmProviders.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          )}
        </div>
        
        {/* Model Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          {isLoading ? (
            <div className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              Loading models...
            </div>
          ) : currentModels.length === 0 ? (
            <div className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500">
              No embedding models available
            </div>
          ) : (
            <select
              value={localModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a model...</option>
              {currentModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      {/* Remove Button */}
      <div className="flex justify-end">
        <button
          onClick={removeGlobalEmbedding}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100"
        >
          Remove Default Embedding
        </button>
      </div>
    </div>
  );
}


export default EmbeddingsSection;
