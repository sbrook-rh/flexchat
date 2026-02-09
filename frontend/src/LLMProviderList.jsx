import React from 'react';

/**
 * LLMProviderList - Displays configured LLM providers with management actions
 * Phase: Refactor provider abstraction - split from generic ProviderList
 * Pattern: Following wizard refactor (commit 261bcfc) for clear separation
 */
function LLMProviderList({ 
  workingConfig, 
  onAddLLMProvider, 
  onEditLLMProvider, 
  onDeleteLLMProvider 
}) {
  const llmProviders = Object.entries(workingConfig?.llms || {});

  // Task 2.2.6: Connection status indicators (placeholder)
  const getStatusBadge = (connected = null) => {
    if (connected === null) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          Unknown
        </span>
      );
    }
    return connected ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
        ● Connected
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
        ● Disconnected
      </span>
    );
  };

  const LLMProviderCard = ({ providerId, config, onEdit, onDelete }) => {
    // Use description for display, fallback to ID for backward compatibility
    const displayName = config.description || providerId;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                LLM
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              ID: <span className="font-mono">{providerId}</span>
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Provider: <span className="font-medium">{config.provider}</span>
            </p>
            {getStatusBadge(null)}
          </div>
        
        {/* Edit/delete actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit provider"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete LLM provider "${displayName}"?`)) {
                onDelete();
              }
            }}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete provider"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Show config details (non-sensitive) */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {config.baseUrl && (
            <>
              <dt className="text-gray-500">URL:</dt>
              <dd className="text-gray-900 font-mono truncate">{config.baseUrl}</dd>
            </>
          )}
          {config.base_url && (
            <>
              <dt className="text-gray-500">URL:</dt>
              <dd className="text-gray-900 font-mono truncate">{config.base_url}</dd>
            </>
          )}
          {config.api_key && (
            <>
              <dt className="text-gray-500">API Key:</dt>
              <dd className="text-gray-900 font-mono">{config.api_key}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold mr-2">
            {llmProviders.length}
          </span>
          LLM Providers
        </h3>
        <button
          onClick={onAddLLMProvider}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add LLM Provider
        </button>
      </div>

      {llmProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {llmProviders.map(([providerId, config]) => (
            <LLMProviderCard
              key={providerId}
              providerId={providerId}
              config={config}
              onEdit={() => onEditLLMProvider(providerId, config)}
              onDelete={() => onDeleteLLMProvider(providerId)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No LLM providers configured.</p>
          <p className="mt-1">Add an LLM provider to enable chat functionality.</p>
        </div>
      )}
    </div>
  );
}

export default LLMProviderList;

