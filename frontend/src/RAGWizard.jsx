import React, { useState, useEffect } from 'react';

/**
 * Generate a stable kebab-case ID from a description
 */
function generateServiceId(description) {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * RAGWizard - Step-by-step wizard for adding/editing RAG services
 * Decision 15: Separate wizard for RAG services (simpler, no model selection)
 */
function RAGWizard({ onSave, onCancel, editMode = false, initialData = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(editMode ? initialData?.provider : null);
  const [providerSchema, setProviderSchema] = useState(null);
  const [config, setConfig] = useState(editMode ? initialData?.config : {});
  
  // Separate ID (stable) from description (user-editable)
  const [serviceId, setServiceId] = useState(editMode ? initialData?.id : null);
  const [description, setDescription] = useState(
    editMode ? (initialData?.config?.description || initialData?.name) : ''
  );
  
  // Connection testing state
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState('');
  const [discoveredCollections, setDiscoveredCollections] = useState([]);
  
  // Available providers and env vars
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableEnvVars, setAvailableEnvVars] = useState([]);
  
  // Load available RAG providers on mount
  useEffect(() => {
    fetch('/api/connections/providers')
      .then(res => res.json())
      .then(data => setAvailableProviders(data.rag || []))
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
      fetch(`/api/connections/providers/${selectedProvider}/schema?type=rag`)
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
      case 4: return description.trim() !== '';
      default: return true;
    }
  };
  
  // Test connection
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    setDiscoveredCollections([]); // Clear previous results
    
    try {
      const response = await fetch('/api/connections/rag/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          config: config
        })
      });
      
      const result = await response.json();
      // console.log('result', JSON.stringify(result, null, 2));
      if (result.success) {
        setTestStatus('success');
        setTestMessage(result.message || 'Connection successful!');
        
        // Store discovered collections if available (at top level of result)
        if (result.collections && result.collections.length > 0) {
          setDiscoveredCollections(result.collections);
        }
        
        console.log('✓ Connection test successful:', result);
      } else {
        setTestStatus('error');
        setTestMessage(result.message || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Connection error: ${error.message}`);
    }
  };
  
  // Save
  const handleSave = () => {
    const finalServiceId = editMode ? serviceId : generateServiceId(description);
    onSave({
      id: finalServiceId,
      name: description,
      type: 'rag',
      config: config
    });
  };
  
  // Render steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select RAG Service</h2>
            <p className="text-sm text-gray-600">Choose which RAG provider to configure.</p>
            
            <div className="grid grid-cols-1 gap-3 mt-6">
              {availableProviders.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedProvider === provider.id
                      ? 'border-purple-500 bg-purple-50'
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                      
                      <div className="flex flex-wrap gap-2">
                        {field.env_var_suggestion && (
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, [field.name]: `\${${field.env_var_suggestion}}` })}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={config[field.name] || ''}
                      onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                      placeholder={field.placeholder || field.default}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            <h2 className="text-xl font-semibold text-gray-900">Test Connection</h2>
            <p className="text-sm text-gray-600">Verify your RAG service configuration.</p>
            
            <div className="mt-6 space-y-4">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
              
              {/* Collection list (if discovered) */}
              {testStatus === 'success' && discoveredCollections.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Available Collections ({discoveredCollections.length})
                  </h4>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {discoveredCollections.map((collection, idx) => (
                      <div 
                        key={idx}
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">{collection.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {collection.count !== undefined && (
                            <span className="mr-3">📄 {collection.count} documents</span>
                          )}
                          {collection.metadata?.description && (
                            <span className="text-gray-600">{collection.metadata.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Name Your RAG Service</h2>
            <p className="text-sm text-gray-600">Give this RAG service a memorable name.</p>
            
            <div className="mt-6 space-y-4">
              {/* Show ID field in edit mode (read-only) */}
              {editMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service ID <span className="text-gray-500 text-xs">(cannot be changed)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serviceId}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 text-gray-600 border border-gray-300 rounded-lg cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400" title="Locked">🔒</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This ID is used by response handlers and cannot be changed after creation.
                  </p>
                </div>
              )}
              
              {/* Description field (always editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Red Hat Products, Customer Support Docs"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {!editMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    A stable ID will be generated from this name (e.g., "Red Hat Products" → red-hat-products)
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">Summary</h3>
              <dl className="space-y-1 text-sm text-purple-800">
                <div className="flex justify-between">
                  <dt>Provider:</dt>
                  <dd className="font-medium">{selectedProvider}</dd>
                </div>
                {!editMode && description && (
                  <div className="flex justify-between">
                    <dt>Generated ID:</dt>
                    <dd className="font-medium font-mono text-xs">{generateServiceId(description)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Display Name:</dt>
                  <dd className="font-medium">{description || '(not set)'}</dd>
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
              {editMode ? 'Edit RAG Service' : 'Add RAG Service'}
            </h1>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Step indicator */}
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < currentStep ? 'bg-green-500 text-white' :
                  step === currentStep ? 'bg-purple-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 4 && <div className={`w-16 h-0.5 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />}
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
              if (currentStep < 4) {
                setCurrentStep(currentStep + 1);
              } else {
                handleSave();
              }
            }}
            disabled={!canProceed()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === 4 ? 'Save Service' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RAGWizard;

