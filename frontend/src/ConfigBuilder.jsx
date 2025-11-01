import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationSidebar from './NavigationSidebar';
import LLMProvidersSection from './sections/LLMProvidersSection';
import RAGServicesSection from './sections/RAGServicesSection';
import EmbeddingsSection from './sections/EmbeddingsSection';
import IntentSection from './sections/IntentSection';
import HandlersSection from './sections/HandlersSection';
import ReasoningSection from './sections/ReasoningSection';
import LLMWizard from './LLMWizard';
import RAGWizard from './RAGWizard';

/**
 * Configuration Builder - Main component for UI-driven configuration
 * Phase 2.1: Zero-Config Bootstrap welcome screen
 * Phase 2.2: Provider List UI
 * Phase 2.3: Connection Wizard
 * Phase 2.5: Navigation refactor with vertical tabs
 */
function ConfigBuilder({ uiConfig, reloadConfig }) {
  const navigate = useNavigate();
  const [workingConfig, setWorkingConfig] = useState(null);
  const [appliedConfig, setAppliedConfig] = useState(null); // Track what's currently applied
  const [loading, setLoading] = useState(true);
  const [showLLMWizard, setShowLLMWizard] = useState(false);
  const [showRAGWizard, setShowRAGWizard] = useState(false);
  const [wizardEditData, setWizardEditData] = useState(null);
  
  // Phase 2.7: Validation state tracking
  const [validationState, setValidationState] = useState('clean'); // 'clean' | 'dirty' | 'validating' | 'valid' | 'invalid'
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  
  // Phase 2.5: Tab navigation state
  const [activeTab, setActiveTab] = useState('llm-providers');
  
  const hasConfig = uiConfig?.hasConfig;
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = workingConfig && appliedConfig && 
    JSON.stringify(workingConfig) !== JSON.stringify(appliedConfig);

  // Load current configuration for editing (Decision 12: use /api/config/export)
  useEffect(() => {
    if (hasConfig) {
      fetch('/api/config/export')
        .then(res => res.json())
        .then(data => {
          setWorkingConfig(data);
          setAppliedConfig(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
          setValidationState('clean');
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load configuration for editing:', err);
          setLoading(false);
        });
    } else {
      // Initialize empty config for zero-config mode
      const emptyConfig = { llms: {}, rag_services: {}, responses: [] };
      setWorkingConfig(emptyConfig);
      setAppliedConfig(JSON.parse(JSON.stringify(emptyConfig))); // Deep copy
      setValidationState('dirty'); // New config needs validation
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

  // Handlers for provider management (Decision 15: Separate LLM and RAG wizards)
  const handleAddLLMProvider = () => {
    setWizardEditData(null);
    setShowLLMWizard(true);
  };

  const handleAddRAGService = () => {
    setWizardEditData(null);
    setShowRAGWizard(true);
  };

  const handleEditProvider = (name, config, type) => {
    setWizardEditData({
      name,
      config,
      provider: config.provider
    });
    if (type === 'LLM') {
      setShowLLMWizard(true);
    } else {
      setShowRAGWizard(true);
    }
  };

  const handleDeleteProvider = (name, type) => {
    const newConfig = { ...workingConfig };
    if (type === 'LLM') {
      delete newConfig.llms[name];
    } else {
      delete newConfig.rag_services[name];
    }
    setWorkingConfig(newConfig);
    setValidationState('dirty'); // Mark as dirty
  };
  
  const handleWizardSave = (providerData) => {
    const newConfig = { ...workingConfig };
    
    // Add or update provider
    if (providerData.type === 'llm') {
      if (!newConfig.llms) newConfig.llms = {};
      newConfig.llms[providerData.name] = providerData.config;
      
      // Store the selected model as default_model for future reference
      if (providerData.selectedModel) {
        newConfig.llms[providerData.name].default_model = providerData.selectedModel;
      }
      
      // Decision 15: Auto-create default response handler if none exist
      const hasNoResponses = !newConfig.responses || newConfig.responses.length === 0;
      
      console.log('🔍 Debug response handler creation:', {
        hasNoResponses,
        selectedModel: providerData.selectedModel,
        replaceDefaultHandler: providerData.replaceDefaultHandler,
        willCreate: hasNoResponses && providerData.selectedModel,
        willReplace: !hasNoResponses && providerData.replaceDefaultHandler
      });
      
      if (hasNoResponses && providerData.selectedModel) {
        // First LLM: Create topic provider config and default response handler
        
        // Auto-create topic provider config
        newConfig.topic = {
          provider: {
            llm: providerData.name,
            model: providerData.selectedModel
          }
        };
        
        // Auto-create default response handler
        if (!newConfig.responses) newConfig.responses = [];
        newConfig.responses.push({
          llm: providerData.name,
          model: providerData.selectedModel,
          prompt: "You are a helpful AI assistant. Try to answer the user's question clearly and concisely."
        });
        
        console.log(`✓ Created topic config and default response handler using ${providerData.name}/${providerData.selectedModel}`);
        console.log('📝 New config:', { topic: newConfig.topic, responses: newConfig.responses });
      } else if (!hasNoResponses && providerData.replaceDefaultHandler && providerData.selectedModel) {
        // Second+ LLM: Replace default response handler if user opted in
        newConfig.responses[0] = {
          llm: providerData.name,
          model: providerData.selectedModel,
          prompt: "You are a helpful AI assistant. Try to answer the user's question clearly and concisely."
        };
        console.log(`✓ Replaced default response handler with ${providerData.name}/${providerData.selectedModel}`);
      } else if (!hasNoResponses) {
        console.log('ℹ️ Response handler already exists, user chose not to replace');
      } else {
        console.log('❌ No selectedModel provided, cannot create response handler');
      }
    } else {
      if (!newConfig.rag_services) newConfig.rag_services = {};
      newConfig.rag_services[providerData.name] = providerData.config;
    }
    
    setWorkingConfig(newConfig);
    setShowLLMWizard(false);
    setShowRAGWizard(false);
    setWizardEditData(null);
    setValidationState('dirty'); // Mark as dirty
  };
  
  const handleWizardCancel = () => {
    setShowLLMWizard(false);
    setShowRAGWizard(false);
    setWizardEditData(null);
  };
  
  // Phase 2.7: Validation handler
  const handleValidate = async () => {
    setValidationState('validating');
    setValidationErrors([]);
    setValidationWarnings([]);
    
    try {
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workingConfig)
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setValidationState('valid');
        setValidationWarnings(result.warnings || []);
      } else {
        setValidationState('invalid');
        setValidationErrors(result.errors || []);
        setValidationWarnings(result.warnings || []);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationState('invalid');
      setValidationErrors([`Validation request failed: ${error.message}`]);
    }
  };
  
  // Phase 2.7: Apply configuration (hot-reload)
  const handleApply = async () => {
    if (validationState !== 'valid') {
      alert('Please validate your configuration before applying.');
      return;
    }
    
    setIsApplying(true);
    
    try {
      const response = await fetch('/api/config/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workingConfig)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update applied config snapshot
        setAppliedConfig(JSON.parse(JSON.stringify(workingConfig)));
        setValidationState('clean');
        
        // Refresh UI config and navigate to Home
        await reloadConfig();
        navigate('/');
      } else {
        alert(`Failed to apply configuration: ${result.message}`);
      }
    } catch (error) {
      console.error('Apply failed:', error);
      alert(`Failed to apply configuration: ${error.message}`);
    } finally {
      setIsApplying(false);
    }
  };
  
  // Phase 2.5: Tab state calculation helpers
  const getTabStates = () => {
    if (!workingConfig) {
      return {
        embeddings: { enabled: false },
        intent: { enabled: false },
        reasoning: { enabled: false },
        badges: { providers: 0, handlers: 0 }
      };
    }
    
    const llmCount = Object.keys(workingConfig.llms || {}).length;
    const ragCount = Object.keys(workingConfig.rag_services || {}).length;
    const handlerCount = (workingConfig.responses || []).length;
    
    return {
      embeddings: { 
        enabled: ragCount > 0 
      },
      intent: { 
        enabled: llmCount > 0 
      },
      reasoning: { 
        enabled: handlerCount > 0 
      },
      badges: {
        llmProviders: llmCount,
        ragServices: ragCount,
        handlers: handlerCount
      }
    };
  };
  
  // Phase 2.7: Export configuration as JSON
  const handleExport = () => {
    if (validationState !== 'valid') {
      alert('Please validate your configuration before exporting.');
      return;
    }
    
    const jsonString = JSON.stringify(workingConfig, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flex-chat-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Phase 2.7: Cancel and discard changes
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    navigate('/');
  };

  // Phase 2.5: Render section for active tab
  const renderActiveSection = () => {
    const sectionProps = {
      workingConfig,
      appliedConfig,
      onSave: handleWizardSave,
      onDelete: handleDeleteProvider,
      onAddLLMProvider: handleAddLLMProvider,
      onAddRAGService: handleAddRAGService,
      onEditProvider: handleEditProvider
    };
    
    switch (activeTab) {
      case 'llm-providers':
        return <LLMProvidersSection {...sectionProps} />;
      case 'rag-services':
        return <RAGServicesSection {...sectionProps} />;
      case 'embeddings':
        return <EmbeddingsSection />;
      case 'intent':
        return <IntentSection />;
      case 'handlers':
        return <HandlersSection workingConfig={workingConfig} />;
      case 'reasoning':
        return <ReasoningSection />;
      default:
        return <LLMProvidersSection {...sectionProps} />;
    }
  };

  // Phase 2.2: Show Provider List (works for both create and edit)
  if (hasConfig || workingConfig) {
    const tabStates = getTabStates();
    const mainContent = (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration Builder</h1>
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
        </div>

        {/* Phase 2.7: Status Banners */}
        <div className="px-6">
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  You have unsaved changes. Validate your configuration to enable Apply/Export.
                </span>
              </div>
            </div>
          )}

          {validationState === 'invalid' && validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Configuration Errors:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <h3 className="text-sm font-medium text-orange-800 mb-2">Configuration Warnings:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
                {validationWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Phase 2.5: Two-column layout (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <NavigationSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabStates={tabStates}
          />
          
          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Active Section */}
            <div className="flex-1 overflow-hidden">
              {renderActiveSection()}
            </div>

            {/* Phase 2.7: Action Bar (bottom of content area) */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                {validationState === 'clean' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Clean
                  </span>
                )}
                {validationState === 'dirty' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⚠ Not Validated
                  </span>
                )}
                {validationState === 'validating' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ⏳ Validating...
                  </span>
                )}
                {validationState === 'valid' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Valid
                  </span>
                )}
                {validationState === 'invalid' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Invalid
                  </span>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              {/* Validate Button */}
              <button
                onClick={handleValidate}
                disabled={validationState === 'validating'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validationState === 'validating' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Validate
                  </>
                )}
              </button>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                disabled={validationState !== 'valid' || isApplying}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Changes
                  </>
                )}
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={validationState !== 'valid'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export JSON
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
    
    return (
      <>
        {mainContent}
        {/* Wizards as overlays */}
        {showLLMWizard && (
          <LLMWizard
            onSave={handleWizardSave}
            onCancel={handleWizardCancel}
            editMode={wizardEditData !== null}
            initialData={wizardEditData}
            workingConfig={workingConfig}
          />
        )}
        
        {showRAGWizard && (
          <RAGWizard
            onSave={handleWizardSave}
            onCancel={handleWizardCancel}
            editMode={wizardEditData !== null}
            initialData={wizardEditData}
          />
        )}
      </>
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

