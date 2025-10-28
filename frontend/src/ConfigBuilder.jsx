import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProviderList from './ProviderList';

/**
 * Configuration Builder - Main component for UI-driven configuration
 * Phase 2.1: Zero-Config Bootstrap welcome screen
 * Phase 2.2: Provider List UI
 * Phase 2.3+: Connection Wizard, Testing, etc.
 */
function ConfigBuilder({ uiConfig, reloadConfig }) {
  const navigate = useNavigate();
  const [workingConfig, setWorkingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  
  const hasConfig = uiConfig?.hasConfig;

  // Load current configuration for editing (Decision 12: use /api/config/export)
  useEffect(() => {
    if (hasConfig) {
      fetch('/api/config/export')
        .then(res => res.json())
        .then(data => {
          setWorkingConfig(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load configuration for editing:', err);
          setLoading(false);
        });
    } else {
      // Initialize empty config for zero-config mode
      setWorkingConfig({ llms: {}, rag_services: {}, responses: [] });
      setLoading(false);
    }
  }, [hasConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  // Handlers for provider management
  const handleAddProvider = () => {
    setShowWizard(true);
    console.log('Opening connection wizard... (Phase 2.3)');
    // TODO Phase 2.3: Show ConnectionWizard component
  };

  const handleEditProvider = (name, config, type) => {
    console.log(`Edit ${type} provider: ${name}`, config);
    // TODO Phase 2.3: Open wizard in edit mode
    alert(`Edit provider "${name}" - wizard coming in Phase 2.3`);
  };

  const handleDeleteProvider = (name, type) => {
    console.log(`Delete ${type} provider: ${name}`);
    const newConfig = { ...workingConfig };
    if (type === 'LLM') {
      delete newConfig.llms[name];
    } else {
      delete newConfig.rag_services[name];
    }
    setWorkingConfig(newConfig);
    // TODO: Mark config as dirty, show unsaved changes indicator
  };

  // Phase 2.2: Show Provider List (works for both create and edit)
  if (hasConfig || workingConfig) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuration Builder</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your AI providers and system configuration
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>

          {/* Phase 2.2: Provider List Component */}
          <ProviderList
            workingConfig={workingConfig}
            onAddProvider={handleAddProvider}
            onEditProvider={handleEditProvider}
            onDeleteProvider={handleDeleteProvider}
          />

          {/* TODO Phase 2.7: Unsaved changes banner and Apply/Export/Cancel buttons */}
        </div>
      </div>
    );
  }

  // Task 2.1.2: Show welcome screen with "Build Configuration" option
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Flex Chat
            </h1>
            <p className="text-lg text-gray-600">
              AI-powered chat with topic-aware RAG
            </p>
          </div>

          {/* Zero-Config Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900">
                  No Configuration Found
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Flex Chat needs at least one AI provider configured to function.
                    You can build your configuration step-by-step through this UI,
                    or import an existing configuration file.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary Action: Build Configuration */}
            <button
              onClick={() => {
                // Initialize empty configuration and show provider list
                if (!workingConfig) {
                  setWorkingConfig({ llms: {}, rag_services: {}, responses: [] });
                }
                // The provider list will show automatically due to the condition above
              }}
              className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Build Configuration
            </button>

            {/* Secondary Action: Import Config */}
            <button
              onClick={() => {
                console.log('Import configuration...');
                // TODO Phase 5: Import functionality
                alert('Import feature coming in Phase 5');
              }}
              className="w-full flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Configuration File
            </button>
          </div>

          {/* Task 2.1.4: Suggest default providers */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Recommended Providers to Get Started:
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Ollama</span> - Run open-source models locally (no API key needed)
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">OpenAI</span> - Access GPT-4 and other powerful models (requires API key)
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Google Gemini</span> - Advanced multimodal AI (requires API key)
                </div>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Need help? Check the{' '}
            <a href="https://github.com/your-org/flex-chat" className="text-blue-600 hover:text-blue-500">
              documentation
            </a>
            {' '}or{' '}
            <a href="https://github.com/your-org/flex-chat/issues" className="text-blue-600 hover:text-blue-500">
              report an issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigBuilder;

