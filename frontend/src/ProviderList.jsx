import React from 'react';

/**
 * ProviderList - Displays configured LLM and RAG providers
 * Phase 2.2: Provider List UI
 */
function ProviderList({ workingConfig, onAddProvider, onEditProvider, onDeleteProvider }) {
  const llmProviders = Object.entries(workingConfig?.llms || {});
  const ragProviders = Object.entries(workingConfig?.rag_services || {});
  
  const hasProviders = llmProviders.length > 0 || ragProviders.length > 0;

  // Task 2.2.6: Connection status indicators (placeholder - will use providerStatus from uiConfig in future)
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

  const ProviderCard = ({ name, config, type, onEdit, onDelete }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
              {type}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Provider: <span className="font-medium">{config.provider}</span>
          </p>
          {getStatusBadge(null)}
        </div>
        
        {/* Task 2.2.5: Edit/delete actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(name, config, type)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit provider"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete provider "${name}"?`)) {
                onDelete(name, type);
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
      
      {/* Show some config details (non-sensitive) */}
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

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Providers</h2>
        {/* Task 2.2.4: Add Provider button */}
        <button
          onClick={onAddProvider}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Provider
        </button>
      </div>

      {!hasProviders && (
        /* Empty state */
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No providers configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first AI provider.</p>
          <div className="mt-6">
            <button
              onClick={onAddProvider}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Provider
            </button>
          </div>
        </div>
      )}

      {/* Task 2.2.2: Display configured LLM providers */}
      {llmProviders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold mr-2">
              {llmProviders.length}
            </span>
            LLM Providers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {llmProviders.map(([name, config]) => (
              <ProviderCard
                key={name}
                name={name}
                config={config}
                type="LLM"
                onEdit={onEditProvider}
                onDelete={onDeleteProvider}
              />
            ))}
          </div>
        </div>
      )}

      {/* Task 2.2.3: Display configured RAG providers */}
      {ragProviders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-bold mr-2">
              {ragProviders.length}
            </span>
            RAG Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ragProviders.map(([name, config]) => (
              <ProviderCard
                key={name}
                name={name}
                config={config}
                type="RAG"
                onEdit={onEditProvider}
                onDelete={onDeleteProvider}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderList;

