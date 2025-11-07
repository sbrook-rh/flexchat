import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Collections from './Collections';

/**
 * CollectionsRouter - Smart router for collections management
 * 
 * Behavior:
 * - 0 services: Show "no services" message
 * - 1 service: Auto-redirect to that service
 * - 2+ services: Show service selector
 * - Has ?wrapper param: Show Collections for that service
 */
function CollectionsRouter({ uiConfig, reloadConfig }) {
  const [searchParams] = useSearchParams();
  const wrapper = searchParams.get('wrapper');
  const navigate = useNavigate();
  const wrappers = uiConfig?.wrappers || [];
  const hasNoServices = wrappers.length === 0;
  const hasSingleService = wrappers.length === 1;
  const singleServiceName = hasSingleService ? wrappers[0].name : null;
  const shouldRedirectToSingle = !wrapper && hasSingleService;

  // Perform redirect when exactly one service and no explicit wrapper is selected
  useEffect(() => {
    if (shouldRedirectToSingle && singleServiceName) {
      navigate(`/collections?wrapper=${singleServiceName}`, { replace: true });
    }
  }, [shouldRedirectToSingle, singleServiceName, navigate]);

  // If wrapper specified, show collections for that service
  if (wrapper) {
    return <Collections uiConfig={uiConfig} reloadConfig={reloadConfig} />;
  }

  // No services configured
  if (hasNoServices) {
    return <NoServicesMessage />;
  }

  // Exactly one service - show loading while redirect effect runs
  if (hasSingleService) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collections for {singleServiceName}...</p>
        </div>
      </div>
    );
  }

  // Multiple services - show selector
  return <ServiceSelector wrappers={wrappers} uiConfig={uiConfig} />;
}

/**
 * NoServicesMessage - Shown when no RAG services are configured
 */
function NoServicesMessage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-6">📚</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            No RAG Services Configured
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            You need to configure at least one RAG service before you can manage collections.
          </p>
          <div className="space-y-4">
            <Link
              to="/config"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Configuration →
            </Link>
            <div className="text-sm text-gray-500">
              <p>Configure a RAG service like ChromaDB Wrapper to get started</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ServiceSelector - Choose which RAG service to manage
 */
function ServiceSelector({ wrappers, uiConfig }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Collection Management
          </h1>
          <p className="text-gray-600">
            Select a RAG service to manage its collections
          </p>
        </div>
        
        {/* Service Cards */}
        <div className="grid gap-4">
          {wrappers.map((wrapper) => {
            const serviceName = wrapper.name;
            const collectionCount = wrapper.collectionCount || 0;
            
            return (
              <Link
                key={serviceName}
                to={`/collections?wrapper=${serviceName}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">📚</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {serviceName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'}
                        </span>
                        <span>•</span>
                        <span className="text-gray-500">
                          {wrapper.url}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CollectionsRouter;

