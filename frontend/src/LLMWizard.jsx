import React, { useState, useEffect } from 'react';

/**
 * LLMWizard - Step-by-step wizard for adding/editing LLM providers
 * Decision 15: Separate wizard for LLM providers with model selection
 */
function LLMWizard({ onSave, onCancel, editMode = false, initialData = null, workingConfig = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(editMode ? initialData?.provider : null);
  const [providerSchema, setProviderSchema] = useState(null);
  const [config, setConfig] = useState(editMode ? initialData?.config : {});
  const [providerName, setProviderName] = useState(editMode ? initialData?.name : '');
  
  // Connection testing state
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState('');
  
  // Model discovery state
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    editMode && initialData?.config?.default_model ? initialData.config.default_model : null
  );
  
  // Available providers and env vars
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableEnvVars, setAvailableEnvVars] = useState([]);
  
  // Response handler replacement (for second+ LLM)
  const [replaceDefaultHandler, setReplaceDefaultHandler] = useState(false);
  
  // Load available LLM providers on mount
  useEffect(() => {
    fetch('/api/connections/providers')
      .then(res => res.json())
      .then(data => setAvailableProviders(data.llm || []))
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
    if (selectedProvider) {
      fetch(`/api/connections/providers/${selectedProvider}/schema?type=llm`)
        .then(res => res.json())
        .then(schema => {
          setProviderSchema(schema);
          const defaults = {};
          schema.fields?.forEach(field => {
            if (field.default && !config[field.name]) {
              defaults[field.name] = field.default;
            }
            if (field.name === 'provider') {
              defaults.provider = selectedProvider;
            }
          });
          setConfig(prev => ({ ...defaults, ...prev, provider: selectedProvider }));
        })
        .catch(err => console.error('Failed to load schema:', err));
    }
  }, [selectedProvider]);
  
  // Auto-wrap env var with ${}
  const handleEnvVarBlur = (fieldName) => {
    const value = config[fieldName];
    if (value && value.trim() && !value.trim().startsWith('${')) {
      setConfig({ ...config, [fieldName]: `\${${value.trim()}}` });
    }
  };
  
  // Validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedProvider !== null;
      case 2: {
        if (!providerSchema) return false;
        return providerSchema.fields.every(field => {
          if (!field.required) return true;
          return config[field.name] && config[field.name].trim() !== '';
        });
      }
      case 3: return testStatus === 'success';
      case 4: return selectedModel !== null;
      case 5: return providerName.trim() !== '';
      default: return true;
    }
  };
  
  // Test connection
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    
    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'llm',
          provider: selectedProvider,
          config: config
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage(result.message || 'Connection successful!');
        // Auto-discover models on success
        handleDiscoverModels();
      } else {
        setTestStatus('error');
        setTestMessage(result.message || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Connection error: ${error.message}`);
    }
  };
  
  // Discover models
  const handleDiscoverModels = async () => {
    setModelsLoading(true);
    
    try {
      const response = await fetch(`/api/connections/providers/${selectedProvider}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection: {
            provider_id: selectedProvider,
            type: 'llm',
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
  
  // Save
  const handleSave = () => {
    onSave({
      name: providerName,
      type: 'llm',
      config: config,
      selectedModel: selectedModel,
      replaceDefaultHandler: replaceDefaultHandler
    });
  };
  
  // Render steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select LLM Provider</h2>
            <p className="text-sm text-gray-600">Choose which AI provider to configure.</p>
            
            <div className="grid grid-cols-1 gap-3 mt-6">
              {availableProviders.map(provider => (
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
      
      case 2:
        if (!providerSchema) {
          return <div className="text-center py-8 text-gray-500">Loading configuration form...</div>;
        }
        
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Configure {providerSchema.display_name}</h2>
            <p className="text-sm text-gray-600">{providerSchema.description}</p>
            
            <div className="space-y-4 mt-6">
              {providerSchema.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'secret' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={config[field.name] || ''}
                        onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                        onBlur={() => handleEnvVarBlur(field.name)}
                        placeholder={field.placeholder || field.env_var_suggestion || 'VAR_NAME (will auto-wrap with ${})'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                      
                      <div className="flex flex-wrap gap-2">
                        {field.env_var_suggestion && (
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, [field.name]: `\${${field.env_var_suggestion}}` })}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            Use ${field.env_var_suggestion}
                          </button>
                        )}
                        
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
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                              title={`Available: ${envVar.value || '(set)'}`}
                            >
                              ✓ ${envVar.name}
                            </button>
                          ))
                        }
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        💡 Type the variable name and it will auto-wrap with <code className="bg-gray-100 px-1 rounded">${'${}'}</code>
                      </p>
                    </div>
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={config[field.name] || field.default || ''}
                      onChange={(e) => setConfig({ ...config, [field.name]: parseInt(e.target.value, 10) })}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={config[field.name] || ''}
                      onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                      placeholder={field.placeholder || field.default}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.description && (
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Connection & Discover Models</h2>
            <p className="text-sm text-gray-600">Verify your configuration and discover available models.</p>
            
            <div className="mt-6 space-y-4">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {testStatus === 'testing' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
              
              {testStatus === 'success' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">✓ {testMessage}</p>
                </div>
              )}
              
              {testStatus === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">✗ {testMessage}</p>
                  <button
                    onClick={handleTestConnection}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {modelsLoading && (
                <div className="text-center py-4 text-gray-500">
                  <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-2">Discovering models...</p>
                </div>
              )}
              
              {models.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">
                    Discovered {models.length} model{models.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {models.slice(0, 10).map((model, idx) => (
                      <div key={idx} className="text-xs text-blue-700 font-mono">
                        • {model.id || model.name}
                      </div>
                    ))}
                    {models.length > 10 && (
                      <p className="text-xs text-blue-600">...and {models.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Default Model</h2>
            <p className="text-sm text-gray-600">
              Choose which model to use for general chat responses. This will create a default response handler.
            </p>
            
            <div className="mt-6 space-y-2">
              {models.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No models discovered. Using provider default.</p>
                  <button
                    onClick={() => setSelectedModel('default')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Continue with Default Model
                  </button>
                </div>
              ) : (
                models.map((model, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedModel(model.id || model.name)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedModel === (model.id || model.name)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{model.id || model.name}</h3>
                        {model.type && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 mt-1">
                            {model.type}
                          </span>
                        )}
                      </div>
                      {selectedModel === (model.id || model.name) && (
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Name Your Provider</h2>
            <p className="text-sm text-gray-600">Give this LLM provider a memorable name.</p>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., MyOpenAI, LocalOllama"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                This name will be used to reference this provider in response handlers.
              </p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Summary</h3>
              <dl className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <dt>Provider:</dt>
                  <dd className="font-medium">{selectedProvider}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Model:</dt>
                  <dd className="font-medium">{selectedModel || 'default'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Name:</dt>
                  <dd className="font-medium">{providerName || '(not set)'}</dd>
                </div>
              </dl>
            </div>
            
            {/* Decision 17: Offer to replace/update default response handler */}
            {workingConfig?.responses?.length > 0 && selectedModel && 
             !(editMode && workingConfig.responses[0].llm === providerName && workingConfig.responses[0].model === selectedModel) && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-sm font-medium text-amber-900 mb-2">Default Response Handler</h3>
                <p className="text-sm text-amber-800 mb-3">
                  {editMode && workingConfig.responses[0].llm === providerName ? (
                    <>
                      Your default response handler currently uses:{' '}
                      <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">
                        {workingConfig.responses[0].llm}/{workingConfig.responses[0].model}
                      </code>
                    </>
                  ) : (
                    <>
                      You already have a default response handler using:{' '}
                      <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">
                        {workingConfig.responses[0].llm}/{workingConfig.responses[0].model}
                      </code>
                    </>
                  )}
                </p>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceDefaultHandler}
                    onChange={(e) => setReplaceDefaultHandler(e.target.checked)}
                    className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      {editMode && workingConfig.responses[0].llm === providerName
                        ? `Update to use ${selectedModel}`
                        : `Replace with ${providerName}/${selectedModel}`
                      }
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      (You can add more response handlers later in Phase 3)
                    </p>
                  </div>
                </label>
              </div>
            )}
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
              {editMode ? 'Edit LLM Provider' : 'Add LLM Provider'}
            </h1>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
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
        
        {/* Footer */}
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

export default LLMWizard;

