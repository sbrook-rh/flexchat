import React, { useState, useEffect } from 'react';

/**
 * ConnectionWizard - Step-by-step provider configuration
 * Phase 2.3: Connection Wizard
 * Phase 2.4: Connection Testing UI (integrated)
 * Phase 2.5: Model Discovery UI (integrated)
 * Phase 2.6: Environment Variable UI (integrated)
 */
function ConnectionWizard({ onSave, onCancel, editMode = false, initialData = null }) {
  // Wizard steps
  const [currentStep, setCurrentStep] = useState(1);
  const [providerType, setProviderType] = useState(editMode ? initialData?.type : null); // 'llm' or 'rag'
  const [selectedProvider, setSelectedProvider] = useState(editMode ? initialData?.provider : null);
  const [providerSchema, setProviderSchema] = useState(null);
  const [config, setConfig] = useState(editMode ? initialData?.config : {});
  const [providerName, setProviderName] = useState(editMode ? initialData?.name : '');
  
  // Connection testing state (Phase 2.4)
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState('');
  
  // Model discovery state (Phase 2.5)
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  
  // Available providers list
  const [availableProviders, setAvailableProviders] = useState({ llm: [], rag: [] });
  
  // Available environment variables
  const [availableEnvVars, setAvailableEnvVars] = useState([]);
  
  // Load available providers on mount
  useEffect(() => {
    fetch('/api/connections/providers')
      .then(res => res.json())
      .then(data => setAvailableProviders(data))
      .catch(err => console.error('Failed to load providers:', err));
  }, []);
  
  // Load available env vars on mount
  useEffect(() => {
    fetch('/api/connections/env-vars?mask=true')
      .then(res => res.json())
      .then(data => setAvailableEnvVars(data.variables || []))
      .catch(err => console.error('Failed to load env vars:', err));
  }, []);
  
  // Load provider schema when provider is selected
  useEffect(() => {
    if (selectedProvider && providerType) {
      fetch(`/api/connections/providers/${selectedProvider}/schema?type=${providerType}`)
        .then(res => res.json())
        .then(schema => {
          setProviderSchema(schema);
          // Initialize config with defaults from schema
          const defaults = {};
          schema.fields?.forEach(field => {
            if (field.default && !config[field.name]) {
              defaults[field.name] = field.default;
            }
            // Set provider field
            if (field.name === 'provider') {
              defaults.provider = selectedProvider;
            }
          });
          setConfig(prev => ({ ...defaults, ...prev, provider: selectedProvider }));
        })
        .catch(err => console.error('Failed to load schema:', err));
    }
  }, [selectedProvider, providerType]);
  
  // Helper: Auto-wrap env var with ${} if not already wrapped (Phase 2.6 enhancement)
  const handleEnvVarBlur = (fieldName) => {
    const value = config[fieldName];
    if (value && value.trim() && !value.trim().startsWith('${')) {
      // Auto-wrap with ${}
      setConfig({ ...config, [fieldName]: `\${${value.trim()}}` });
    }
  };
  
  // Task 2.3.7: Form validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return providerType !== null;
      case 2: return selectedProvider !== null;
      case 3: {
        // Check all required fields are filled
        if (!providerSchema) return false;
        return providerSchema.fields.every(field => {
          if (!field.required) return true;
          return config[field.name] && config[field.name].trim() !== '';
        });
      }
      case 4: return testStatus === 'success'; // Must test before proceeding
      case 5: return providerName.trim() !== '';
      default: return true;
    }
  };
  
  // Task 2.3.5: Test connection (Phase 2.4)
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    
    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection: {
            provider_id: selectedProvider,
            type: providerType,
            fields: config
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage(`Connected successfully! (${result.duration}ms)`);
        
        // Task 2.3.5 + Phase 2.5: Auto-discover models on successful connection for LLMs
        if (providerType === 'llm') {
          await discoverModels();
        }
      } else {
        setTestStatus('error');
        setTestMessage(result.error || result.message || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Test failed: ${error.message}`);
    }
  };
  
  // Phase 2.5: Discover models
  const discoverModels = async () => {
    if (providerType !== 'llm') return;
    
    setModelsLoading(true);
    try {
      const response = await fetch(`/api/connections/providers/${selectedProvider}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection: {
            provider_id: selectedProvider,
            type: providerType,
            fields: config
          }
        })
      });
      
      const result = await response.json();
      if (result.models) {
        setModels(result.models);
      }
    } catch (error) {
      console.error('Model discovery failed:', error);
    } finally {
      setModelsLoading(false);
    }
  };
  
  // Task 2.3.6: Save provider
  const handleSave = () => {
    onSave({
      name: providerName,
      type: providerType,
      config: config
    });
  };
  
  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      // Task 2.3.2: Step 1 - Select provider type
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Provider Type</h2>
            <p className="text-sm text-gray-600">Choose the type of provider you want to add.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => setProviderType('llm')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  providerType === 'llm'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">🤖</div>
                <h3 className="font-semibold text-gray-900">LLM Provider</h3>
                <p className="text-sm text-gray-600 mt-1">
                  AI models for chat and text generation
                </p>
              </button>
              
              <button
                onClick={() => setProviderType('rag')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  providerType === 'rag'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">📚</div>
                <h3 className="font-semibold text-gray-900">RAG Service</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Vector databases for knowledge retrieval
                </p>
              </button>
            </div>
          </div>
        );
      
      // Task 2.3.3: Step 2 - Select provider
      case 2:
        const providers = availableProviders[providerType] || [];
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Select {providerType === 'llm' ? 'LLM' : 'RAG'} Provider
            </h2>
            <p className="text-sm text-gray-600">Choose which provider to configure.</p>
            
            <div className="grid grid-cols-1 gap-3 mt-6">
              {providers.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedProvider === provider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{provider.display_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      
      // Task 2.3.4: Step 3 - Configure connection
      case 3:
        if (!providerSchema) {
          return <div className="text-center py-8 text-gray-500">Loading schema...</div>;
        }
        
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure {providerSchema.display_name}
            </h2>
            <p className="text-sm text-gray-600">{providerSchema.description}</p>
            
            <div className="space-y-4 mt-6">
              {providerSchema.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {/* Task 2.3.4.1 & Phase 2.6: Secret fields only accept env vars */}
                  {field.type === 'secret' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={config[field.name] || ''}
                          onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                          onBlur={() => handleEnvVarBlur(field.name)}
                          placeholder={field.placeholder || field.env_var_suggestion || 'VAR_NAME (will auto-wrap with ${})'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      
                      {/* Quick-fill buttons for suggested/available env vars */}
                      <div className="flex flex-wrap gap-2">
                        {/* Static schema suggestion */}
                        {field.env_var_suggestion && (
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, [field.name]: `\${${field.env_var_suggestion}}` })}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Use ${field.env_var_suggestion}
                          </button>
                        )}
                        
                        {/* Dynamic available env vars (Phase 2.6 enhancement) */}
                        {availableEnvVars
                          .filter(ev => 
                            ev.name.toLowerCase().includes(field.name.toLowerCase()) || 
                            ev.name.toLowerCase().includes(selectedProvider.toLowerCase())
                          )
                          .slice(0, 3)
                          .map(envVar => (
                            <button
                              key={envVar.name}
                              type="button"
                              onClick={() => setConfig({ ...config, [field.name]: `\${${envVar.name}}` })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                              title={`Available: ${envVar.value || '(set)'}`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              ${envVar.name}
                            </button>
                          ))
                        }
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">💡 Tip:</span> Type the variable name (e.g., "OPENAI_API_KEY") and it will auto-wrap with <code className="bg-gray-100 px-1 rounded">${'${}'}</code> when you tab away.
                      </p>
                      <p className="text-xs text-gray-500">
                        {field.description}
                      </p>
                    </div>
                  ) : field.type === 'number' ? (
                    <div className="space-y-1">
                      <input
                        type="number"
                        value={config[field.name] || field.default || ''}
                        onChange={(e) => setConfig({ ...config, [field.name]: parseInt(e.target.value, 10) })}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500">{field.description}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={config[field.name] || field.default || ''}
                        onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500">{field.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      // Task 2.3.5 & Phase 2.4: Step 4 - Test connection
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Connection</h2>
            <p className="text-sm text-gray-600">
              Verify that the configuration works before saving.
            </p>
            
            <div className="mt-6">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {testStatus === 'testing' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
              
              {/* Task 2.4.4 & 2.4.5: Show test results */}
              {testStatus === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Connection Successful</h4>
                      <p className="text-sm text-green-700 mt-1">{testMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {testStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                      <p className="text-sm text-red-700 mt-1">{testMessage}</p>
                      {/* Task 2.4.6: Retry logic */}
                      <button
                        onClick={handleTestConnection}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Phase 2.5: Show discovered models */}
              {testStatus === 'success' && providerType === 'llm' && models.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Discovered {models.length} Models
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {models.slice(0, 10).map(model => (
                      <div key={model.id} className="text-xs font-mono text-blue-700 bg-white px-2 py-1 rounded">
                        {model.name}
                        {model.type && <span className="ml-2 text-blue-500">({model.type})</span>}
                      </div>
                    ))}
                    {models.length > 10 && (
                      <p className="text-xs text-blue-600 pt-1">+ {models.length - 10} more...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      // Task 2.3.6: Step 5 - Name and save
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Name Your Provider</h2>
            <p className="text-sm text-gray-600">
              Give this provider a unique name for easy identification.
            </p>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder={`my_${selectedProvider}_provider`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters, numbers, and underscores only.
              </p>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Type:</dt>
                  <dd className="font-medium text-gray-900">{providerType.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Provider:</dt>
                  <dd className="font-medium text-gray-900">{providerSchema?.display_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Status:</dt>
                  <dd className="font-medium text-green-600">Tested ✓</dd>
                </div>
              </dl>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {editMode ? 'Edit Provider' : 'Add New Provider'}
            </h1>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Step indicator */}
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < currentStep ? 'bg-green-500 text-white' :
                  step === currentStep ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 5 && <div className={`w-12 h-0.5 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6">
          {renderStep()}
        </div>
        
        {/* Footer - Task 2.3.8: Navigation */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onCancel()}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={() => {
              if (currentStep < 5) {
                setCurrentStep(currentStep + 1);
              } else {
                handleSave();
              }
            }}
            disabled={!canProceed()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === 5 ? 'Save Provider' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectionWizard;

