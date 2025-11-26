import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DocumentUploadWizard from './DocumentUploadWizard';

function Collections({ uiConfig, reloadConfig }) {
  const [searchParams] = useSearchParams();
  const currentWrapper = searchParams.get('wrapper');
  
  const [collections, setCollections] = useState([]);
  const [wrappers, setWrappers] = useState([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  const [llms, setLlms] = useState({});
  const [defaultEmbedding, setDefaultEmbedding] = useState(null);
  const [availableEmbeddingModels, setAvailableEmbeddingModels] = useState([]);
  
  // New collection form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    displayName: '',
    description: '',
    match_threshold: 0.3,
    partial_threshold: 0.5,
    embedding_model: ''
  });
  const [collectionId, setCollectionId] = useState('');
  const [idError, setIdError] = useState('');
  
  // Edit collection form
  const [editingCollection, setEditingCollection] = useState(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    description: '',
    match_threshold: 0.3,
    partial_threshold: 0.5,
    embedding_model: ''
  });
  const [editAvailableEmbeddingModels, setEditAvailableEmbeddingModels] = useState([]);

  // Document Upload Wizard state
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [wizardTargetCollection, setWizardTargetCollection] = useState(null);

  // Profile Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTargetCollection, setProfileTargetCollection] = useState(null);
  const [profileForm, setProfileForm] = useState({
    categorical_filtering: {
      fields: {}
    }
  });

  // Test Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTargetCollection, setTestTargetCollection] = useState(null);
  const [testQuery, setTestQuery] = useState('');
  const [testTopK, setTestTopK] = useState(10);
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  const [expandedResults, setExpandedResults] = useState(new Set());

  // Populate from uiConfig on mount
  useEffect(() => {
    if (uiConfig) {
      setCollections(uiConfig.collections || []);
      setWrappers(uiConfig.wrappers || []);
      setLoading(false);
    }
  }, [uiConfig]);

  // Load current config (to get available LLM connection IDs)
  useEffect(() => {
    fetch('/api/config/export')
      .then(res => res.json())
      .then(cfg => {
        setLlms(cfg.llms || {});
        setDefaultEmbedding(cfg.embedding || null);
      })
      .catch(() => setLlms({}));
  }, []);

  // Get embedding models from RAG service wrapper
  const getEmbeddingModelsForService = (serviceName) => {
    if (!uiConfig?.providerStatus?.rag_services?.[serviceName]) {
      return [];
    }
    const serviceHealth = uiConfig.providerStatus.rag_services[serviceName];
    return serviceHealth.details?.embedding_models || [];
  };


  // Update available embedding models when create form opens
  useEffect(() => {
    if (showCreateForm && currentWrapper) {
      const models = getEmbeddingModelsForService(currentWrapper);
      setAvailableEmbeddingModels(models);
    } else {
      setAvailableEmbeddingModels([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm, currentWrapper, uiConfig]);

  // Generate a valid collection ID from display name
  const generateCollectionId = (displayName) => {
    if (!displayName) return '';
    
    let id = displayName
      .toLowerCase()
      .trim()
      // Replace spaces and special chars with hyphens
      .replace(/[^a-z0-9_-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Collapse multiple hyphens
      .replace(/-+/g, '-');
    
    // Truncate to 63 chars
    if (id.length > 63) {
      id = id.substring(0, 63).replace(/-+$/, '');
    }
    
    return id;
  };

  // Validate generated collection ID per ChromaDB rules
  const validateCollectionId = (id) => {
    if (!id) {
      return 'Collection name cannot be empty';
    }
    
    // ChromaDB naming rules:
    if (id.length < 3) {
      return 'Name too short (min 3 characters) - add more text';
    }
    
    if (id.length > 63) {
      return 'Name too long (max 63 characters)';
    }
    
    if (!/^[a-zA-Z0-9]/.test(id)) {
      return 'Generated ID must start with a letter or number';
    }
    
    if (!/[a-zA-Z0-9]$/.test(id)) {
      return 'Generated ID must end with a letter or number';
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return 'Invalid characters in name';
    }
    
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(id)) {
      return 'Name cannot look like an IP address';
    }
    
    return ''; // Valid
  };


  const createCollection = async (e) => {
    e.preventDefault();
    
    // Validate generated ID
    if (idError) {
      alert(idError);
      return;
    }
    
    if (!collectionId) {
      alert('Please enter a collection name');
      return;
    }
    if (!newCollection.embedding_model) {
      alert('Please select an embedding model');
      return;
    }
    
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionId,  // Use generated ID as the actual collection name
          service: currentWrapper,
          embedding_model: newCollection.embedding_model,
          metadata: {
            display_name: newCollection.displayName,  // Store original display name
            description: newCollection.description,
            match_threshold: parseFloat(newCollection.match_threshold),
            partial_threshold: parseFloat(newCollection.partial_threshold),
            created_at: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }
      
      alert(`Collection "${newCollection.displayName}" created successfully!`);
      
      // Reset form
      setNewCollection({
        displayName: '',
        description: '',
        match_threshold: 0.3,
        partial_threshold: 0.5,
        embedding_model: ''
      });
      setCollectionId('');
      setIdError('');
      setShowCreateForm(false);
      
      // Reload UI config to update all pages
      reloadConfig();
    } catch (err) {
      alert('Error creating collection: ' + err.message);
    }
  };

  const updateCollection = async (e) => {
    e.preventDefault();
    
    if (!editingCollection) {
      return;
    }
    
    // Validate display name
    if (!editForm.display_name || editForm.display_name.trim() === '') {
      alert('Display name is required');
      return;
    }
    
    try {
      // Get existing collection metadata to preserve embedding fields
      const existingCollection = collections.find(c => c.name === editingCollection);
      const existingMetadata = existingCollection?.metadata || {};
      
      // If collection is empty and embedding model is set, validate it
      if (existingCollection?.count === 0 && editForm.embedding_model) {
        if (!editForm.embedding_model) {
          alert('Embedding model must be selected to re-model the collection');
          return;
        }
      }
      
      // Remove hnsw:space - ChromaDB doesn't allow changing it after creation
      const { 'hnsw:space': _, ...preservedMetadata } = existingMetadata;
      
      // Build metadata update
      const metadataUpdate = {
        ...preservedMetadata,
        display_name: editForm.display_name,
        description: editForm.description,
        match_threshold: parseFloat(editForm.match_threshold),
        partial_threshold: parseFloat(editForm.partial_threshold),
        updated_at: new Date().toISOString()
      };
      
      // Include embedding model if collection is empty and it's set
      if (existingCollection?.count === 0 && editForm.embedding_model) {
        metadataUpdate.embedding_model = editForm.embedding_model;
      }
      
      const response = await fetch(`/api/collections/${editingCollection}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: currentWrapper,
          metadata: metadataUpdate
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }
      
      alert(`Collection "${editForm.display_name}" updated successfully!`);
      
      // Reset edit form
      setEditingCollection(null);
      setEditForm({
        display_name: '',
        description: '',
        match_threshold: 0.3,
        partial_threshold: 0.5,
        embedding_model: ''
      });
      setEditAvailableEmbeddingModels([]);
      
      // Reload UI config to update all pages
      reloadConfig();
    } catch (err) {
      alert('Error updating collection: ' + err.message);
    }
  };

  const startEditing = (collection) => {
    setEditingCollection(collection.name);
    setEditForm({
      display_name: collection.metadata?.display_name || collection.name,
      description: collection.metadata?.description || '',
      match_threshold: collection.metadata?.match_threshold || 0.3,
      partial_threshold: collection.metadata?.partial_threshold || 0.5,
      embedding_model: collection.metadata?.embedding_model || ''
    });
    
    // Load embedding models from wrapper if editing an empty collection
    if (collection.count === 0) {
      const models = getEmbeddingModelsForService(collection.service);
      setEditAvailableEmbeddingModels(models);
    }
    
    setShowCreateForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingCollection(null);
    setEditForm({
      display_name: '',
      description: '',
      match_threshold: 0.3,
      partial_threshold: 0.5,
      embedding_model: ''
    });
    setEditAvailableEmbeddingModels([]);
  };

  const deleteCollection = async (collectionName) => {
    if (!window.confirm(`Are you sure you want to delete collection "${collectionName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/collections/${collectionName}?service=${currentWrapper}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }
      
      alert(`Collection "${collectionName}" deleted successfully`);
      reloadConfig();
    } catch (err) {
      alert('Error deleting collection: ' + err.message);
    }
  };

  const emptyCollection = async (collection) => {
    const displayName = collection.metadata?.display_name || collection.name;
    const count = collection.count || 0;
    
    const message = `Empty collection '${displayName}'?\n\nThis will delete all ${count} document(s).\nThe collection settings and metadata will be preserved.\n\nThis action cannot be undone.`;
    
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/collections/${collection.name}/documents/all?service=${currentWrapper}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to empty collection');
      }
      
      const result = await response.json();
      alert(`Emptied '${displayName}' - deleted ${result.count_deleted} documents`);
      reloadConfig();
    } catch (err) {
      alert('Error emptying collection: ' + err.message);
    }
  };

  // Test Modal handlers
  const shouldShowTestButton = (collection) => {
    return collection.count > 0 && collection.metadata?.embedding_model;
  };

  const openTestModal = (collection) => {
    setTestTargetCollection(collection);
    setShowTestModal(true);
    setTestQuery('');
    setTestResults(null);
    setTestError(null);
    setExpandedResults(new Set());
  };

  const closeTestModal = () => {
    setShowTestModal(false);
    setTestTargetCollection(null);
    setTestQuery('');
    setTestResults(null);
    setTestError(null);
    setTestLoading(false);
    setExpandedResults(new Set());
  };

  const submitTestQuery = async (e) => {
    e.preventDefault();
    
    if (!testQuery.trim()) {
      setTestError('Query text is required');
      return;
    }
    
    setTestLoading(true);
    setTestError(null);
    setTestResults(null);
    
    try {
      const response = await fetch(`/api/collections/${testTargetCollection.name}/test-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          top_k: testTopK,
          service: testTargetCollection.service,
          collection: testTargetCollection.name
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to test query');
      }
      
      const results = await response.json();
      setTestResults(results);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const toggleResultExpansion = (index) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const openUploadWizard = (collection) => {
    setWizardTargetCollection(collection);
    setShowUploadWizard(true);
  };

  const closeUploadWizard = () => {
    setShowUploadWizard(false);
    setWizardTargetCollection(null);
  };

  const handleWizardComplete = (result) => {
    alert(`Successfully uploaded ${result.count} document(s)!`);
    closeUploadWizard();
    
    // Immediately update local state to reflect new document count
    // This ensures Test button becomes active without waiting for full reload
    setCollections(prevCollections => 
      prevCollections.map(c => 
        c.name === wizardTargetCollection.name && c.service === wizardTargetCollection.service
          ? { ...c, count: (c.count || 0) + result.count }
          : c
      )
    );
    
    reloadConfig(); // Refresh full UI config (will update again with server truth)
  };

  // Profile Modal utilities
  const shouldShowProfileButton = (collection) => {
    try {
      // Parse document_schema if it's stringified
      const docSchema = collection.metadata?.document_schema;
      if (!docSchema) return false;
      
      const schema = typeof docSchema === 'string' ? JSON.parse(docSchema) : docSchema;
      
      // Check if metadata_fields exists and has values
      return schema.metadata_fields && Array.isArray(schema.metadata_fields) && schema.metadata_fields.length > 0;
    } catch (err) {
      console.error('Error checking profile button visibility:', err);
      return false;
    }
  };

  // Profile Modal functions
  const openProfileModal = async (collection) => {
    setProfileTargetCollection(collection);
    
    // Parse existing query_profile if it exists
    try {
      if (collection.metadata?.query_profile) {
        const existingProfile = typeof collection.metadata.query_profile === 'string'
          ? JSON.parse(collection.metadata.query_profile)
          : collection.metadata.query_profile;
        
        // Convert stored format to internal UI format
        // Auto-fetch current values from documents for each field
        const uiFields = {};
        const fetchPromises = [];
        
        for (const [fieldName, fieldConfig] of Object.entries(existingProfile.categorical_filtering?.fields || {})) {
          // Start with saved selection, will update with fetched values
          uiFields[fieldName] = {
            type: fieldConfig.type,
            values: [],  // Will be populated by fetch
            selectedValues: fieldConfig.values || [],  // User's saved selection
            default: fieldConfig.default,
            loading: true  // Show loading state
          };
          
          // Fetch current values from documents
          const fetchPromise = fetch(
            `/api/collections/${collection.name}/metadata-values?field=${encodeURIComponent(fieldName)}&service=${collection.service}`
          )
            .then(res => res.json())
            .then(data => {
              uiFields[fieldName].values = data.values;
              uiFields[fieldName].loading = false;
            })
            .catch(err => {
              console.error(`Error fetching values for ${fieldName}:`, err);
              uiFields[fieldName].values = uiFields[fieldName].selectedValues;  // Fallback to saved values
              uiFields[fieldName].loading = false;
            });
          
          fetchPromises.push(fetchPromise);
        }
        
        // Set initial form state with loading indicators
        setProfileForm({
          categorical_filtering: {
            fields: uiFields
          }
        });
        
        // Wait for all fetches to complete, then update form
        await Promise.all(fetchPromises);
        setProfileForm({
          categorical_filtering: {
            fields: { ...uiFields }  // Trigger re-render with fetched values
          }
        });
      } else {
        // Reset to empty form
        setProfileForm({
          categorical_filtering: {
            fields: {}
          }
        });
      }
    } catch (err) {
      console.error('Error parsing query_profile:', err);
      alert('Warning: Could not parse existing query profile. Starting with empty form.');
      setProfileForm({
        categorical_filtering: {
          fields: {}
        }
      });
    }
    
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileTargetCollection(null);
    setProfileForm({
      categorical_filtering: {
        fields: {}
      }
    });
  };

  const validateProfile = () => {
    const errors = [];
    const fields = profileForm.categorical_filtering.fields;

    // Parse document_schema if stringified
    let schemaFields = [];
    try {
      const docSchema = profileTargetCollection?.metadata?.document_schema;
      if (docSchema) {
        const schema = typeof docSchema === 'string' ? JSON.parse(docSchema) : docSchema;
        schemaFields = schema.metadata_fields || [];
      }
    } catch (err) {
      console.error('Error parsing document_schema:', err);
    }

    // Validate each field
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      // Check if values are selected
      if (!fieldConfig.selectedValues || fieldConfig.selectedValues.length === 0) {
        errors.push(`Field "${fieldName}": No values selected. Please select at least one value or remove the field.`);
      }

      // Check if default value is in selected values
      if (fieldConfig.default && fieldConfig.selectedValues && !fieldConfig.selectedValues.includes(fieldConfig.default)) {
        errors.push(`Field "${fieldName}": Default value "${fieldConfig.default}" must be one of the selected values.`);
      }

      // Validate field name exists in schema
      if (!schemaFields.includes(fieldName)) {
        errors.push(`Field "${fieldName}": Not found in document schema metadata_fields.`);
      }
    }

    return errors;
  };

  const saveProfile = async () => {
    if (!profileTargetCollection) {
      alert('No collection selected');
      return;
    }

    // Validate before saving
    const validationErrors = validateProfile();
    if (validationErrors.length > 0) {
      alert('Validation errors:\n\n' + validationErrors.join('\n'));
      return;
    }

    try {
      // Clean up the form data: replace selectedValues with values
      const cleanedFields = {};
      for (const [fieldName, fieldConfig] of Object.entries(profileForm.categorical_filtering.fields)) {
        cleanedFields[fieldName] = {
          type: fieldConfig.type,
          values: fieldConfig.selectedValues || []  // Use selectedValues as the final values
        };
        // Only include default if it's set
        if (fieldConfig.default) {
          cleanedFields[fieldName].default = fieldConfig.default;
        }
      }

      const cleanedProfile = {
        categorical_filtering: {
          fields: cleanedFields
        }
      };

      // Stringify the profile for ChromaDB storage
      const profileJson = JSON.stringify(cleanedProfile);
      
      const response = await fetch(`/api/collections/${profileTargetCollection.name}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: profileTargetCollection.service,
          metadata: {
            query_profile: profileJson
          },
          merge: true  // Preserve other metadata fields
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      alert(`✅ Query profile saved for "${profileTargetCollection.metadata?.display_name || profileTargetCollection.name}"`);
      closeProfileModal();
      reloadConfig(); // Refresh collections list
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    }
  };

  // Filter collections if wrapper is specified
  const displayCollections = currentWrapper
    ? collections.filter(c => c.service === currentWrapper)
    : collections;

  // Find wrapper info to check if pinned
  const currentWrapperInfo = currentWrapper 
    ? wrappers.find(w => w.name === currentWrapper)
    : null;
  const isPinned = currentWrapperInfo?.collection;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-gray-600">Loading collections...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header with navigation */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">
            ← Home
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/chat" className="text-sm text-blue-600 hover:text-blue-800">
            Chat
          </Link>
          <div className="flex-1 text-center">
            <span className="text-lg font-semibold text-gray-800">Collection Management</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header with breadcrumb/title */}
        <div className="mb-8">
          {currentWrapper ? (
            <>
              {/* Breadcrumb - show if multiple wrappers exist */}
              {wrappers.length > 1 && (
                <div className="mb-3">
                  <Link
                    to="/collections"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to All Services
                  </Link>
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Managing: {currentWrapper}
              </h1>
              <p className="text-gray-600">Collections from this wrapper service</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Collections</h1>
              <p className="text-gray-600">Create and manage knowledge base collections</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Available Collections */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Available Collections</h2>
            {!isPinned && (
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  if (editingCollection) cancelEditing();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {showCreateForm ? 'Cancel' : '+ Create New Collection'}
              </button>
            )}
          </div>
          
          <div className="p-6">
            {displayCollections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {currentWrapper
                  ? `No collections found in "${currentWrapper}". Create one to get started!`
                  : 'No collections found. Create one to get started!'}
              </p>
            ) : (
              <div className="grid gap-4">
                {displayCollections.map((collection) => (
                  <div
                    key={collection.name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          📚 {collection.metadata?.display_name || collection.name}
                        </h3>
                        {collection.metadata?.display_name && (
                          <p className="text-xs text-gray-400 mb-1">
                            ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{collection.name}</code>
                          </p>
                        )}
                        {collection.metadata?.description && (
                          <p className="text-gray-600 text-sm mb-2">
                            {collection.metadata.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>{collection.count} documents</span>
                          {collection.metadata?.match_threshold !== undefined && (
                            <span>Threshold: {collection.metadata.match_threshold}</span>
                          )}
                          {collection.metadata?.partial_threshold !== undefined && (
                            <span>Fallback: {collection.metadata.partial_threshold}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => startEditing(collection)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                          title="Edit collection"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* Upload */}
                        <button
                          onClick={() => openUploadWizard(collection)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition"
                          title="Upload documents"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </button>
                        
                        {/* Test / Calibrate */}
                        {shouldShowTestButton(collection) ? (
                          <button
                            onClick={() => openTestModal(collection)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition"
                            title="Test queries and view distances"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                        ) : collection.count === 0 ? (
                          <button
                            disabled
                            className="p-2 text-gray-400 cursor-not-allowed rounded-full"
                            title="Upload documents first"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                        ) : !collection.metadata?.embedding_model ? (
                          <button
                            disabled
                            className="p-2 text-gray-400 cursor-not-allowed rounded-full"
                            title="No embedding model available"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                        ) : null}
                        
                        {/* Search Settings */}
                        {shouldShowProfileButton(collection) && (
                          <button
                            onClick={() => openProfileModal(collection)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition"
                            title="Configure search settings"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Empty */}
                        {collection.count > 0 && (
                          <button
                            onClick={() => emptyCollection(collection)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-full transition"
                            title="Remove all documents (keep collection)"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Delete */}
                        {!(isPinned && collection.name === currentWrapperInfo?.collection) && (
                          <button
                            onClick={() => deleteCollection(collection.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                            title="Delete collection permanently"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Collection Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <form onSubmit={createCollection} className="bg-white rounded-lg shadow w-full max-w-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New Collection</h2>
                <button type="button" onClick={() => setShowCreateForm(false)} className="text-gray-500 hover:text-gray-800">✕</button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={newCollection.displayName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewCollection({ ...newCollection, displayName: value });
                    // Generate and validate ID on change
                    const id = generateCollectionId(value);
                    setCollectionId(id);
                    const error = validateCollectionId(id);
                    setIdError(error);
                  }}
                  placeholder="e.g., Tofu Magic, Kubernetes Documentation"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    idError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  required
                />
                {collectionId && !idError ? (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Will be created as: <code className="bg-gray-100 px-1 py-0.5 rounded">{collectionId}</code>
                  </p>
                ) : idError ? (
                  <p className="text-xs text-red-600 mt-1">❌ {idError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a friendly name - we'll generate a valid ID automatically
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detection Description
                </label>
                <input
                  type="text"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  placeholder="e.g., if the query is about Red Hat OpenShift AI or related technologies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used by the AI to decide if this collection should be consulted</p>
              </div>

              {/* Embedding Model Selection */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Embedding Model</h3>
                  <p className="text-xs text-gray-600">Select the embedding model loaded in this RAG service.</p>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <select
                  value={newCollection.embedding_model || ''}
                  onChange={(e) => setNewCollection({ ...newCollection, embedding_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a model...</option>
                  {availableEmbeddingModels.length === 0 ? (
                    <option disabled>No embedding models loaded in this service</option>
                  ) : (
                    availableEmbeddingModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.dimensions}d)
                      </option>
                    ))
                  )}
                </select>
                {availableEmbeddingModels.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">⚠ No embedding models loaded. Check wrapper configuration.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Threshold
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={newCollection.match_threshold}
                    onChange={(e) => setNewCollection({ ...newCollection, match_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Direct match (lower = stricter)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fallback Threshold
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={newCollection.partial_threshold}
                    onChange={(e) => setNewCollection({ ...newCollection, partial_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For LLM assist (if no direct match)</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Collection Modal */}
        {editingCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <form onSubmit={updateCollection} className="bg-white rounded-lg shadow w-full max-w-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Edit Collection: {editForm.display_name}</h2>
                <button type="button" onClick={cancelEditing} className="text-gray-500 hover:text-gray-800">✕</button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="e.g., Red Hat OpenShift AI"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Human-readable name shown in UI (collection ID: {editingCollection})</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detection Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="e.g., if the query is about Red Hat OpenShift AI or related technologies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used by the AI to decide if this collection should be consulted</p>
              </div>

              {/* Advanced: Embedding - conditional re-model section */}
              {(() => {
                const currentCollection = collections.find(c => c.name === editingCollection);
                const meta = (currentCollection || {}).metadata || {};
                const isEmptyCollection = (currentCollection?.count || 0) === 0;
                
                if (isEmptyCollection) {
                  // Re-model: Editable embedding fields for empty collections
                  return (
                    <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Embedding (Re-model)</h3>
                        <p className="text-xs text-amber-700">
                          Collection is empty. You can change the embedding model before uploading documents.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Embedding Model *
                        </label>
                        <select
                          value={editForm.embedding_model || ''}
                          onChange={(e) => setEditForm({ ...editForm, embedding_model: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a model...</option>
                          {editAvailableEmbeddingModels.length === 0 ? (
                            <option disabled>No embedding models loaded in this service</option>
                          ) : (
                            editAvailableEmbeddingModels.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.id} - {m.name} ({m.dimensions}d)
                              </option>
                            ))
                          )}
                        </select>
                        {editAvailableEmbeddingModels.length === 0 && (
                          <p className="text-xs text-red-600 mt-1">⚠ No embedding models loaded. Check wrapper configuration.</p>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Read-only: Embedding settings for non-empty collections
                  return (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Embedding Model</h3>
                        <p className="text-xs text-gray-600">Embedding model is fixed for collections with documents.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Model</label>
                          <input type="text" value={meta.embedding_model || '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Dimensions</label>
                          <input type="text" value={meta.embedding_dimensions ?? '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Threshold
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={editForm.match_threshold}
                    onChange={(e) => setEditForm({ ...editForm, match_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Direct match (lower = stricter)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fallback Threshold
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={editForm.partial_threshold}
                    onChange={(e) => setEditForm({ ...editForm, partial_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For LLM assist (if no direct match)</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={cancelEditing} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document Upload Wizard */}
        {showUploadWizard && wizardTargetCollection && (
          <DocumentUploadWizard
            collectionName={wizardTargetCollection.name}
            serviceName={wizardTargetCollection.service}
            collectionMetadata={wizardTargetCollection.metadata}
            onClose={closeUploadWizard}
            onComplete={handleWizardComplete}
          />
        )}

        {/* Query Profile Modal */}
        {showProfileModal && profileTargetCollection && (() => {
          // Parse document_schema to get available metadata fields
          let availableFields = [];
          try {
            const docSchema = profileTargetCollection.metadata?.document_schema;
            if (docSchema) {
              const schema = typeof docSchema === 'string' ? JSON.parse(docSchema) : docSchema;
              availableFields = schema.metadata_fields || [];
            }
          } catch (err) {
            console.error('Error parsing document_schema in modal:', err);
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    🔍 Search Settings: "{profileTargetCollection.metadata?.display_name || profileTargetCollection.name}"
                  </h2>
                  <button type="button" onClick={closeProfileModal} className="text-gray-500 hover:text-gray-800">✕</button>
                </div>

                <p className="text-sm text-gray-600">
                  Configure categorical filtering for searches. Select metadata fields and specify which values should be included.
                </p>

              {/* Categorical Filtering Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Categorical Filters</h3>
                
                {Object.keys(profileForm.categorical_filtering.fields).map(fieldName => (
                  <div key={fieldName} className="border border-gray-300 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{fieldName}</h4>
                      <button
                        onClick={() => {
                          const newFields = { ...profileForm.categorical_filtering.fields };
                          delete newFields[fieldName];
                          setProfileForm({
                            ...profileForm,
                            categorical_filtering: {
                              ...profileForm.categorical_filtering,
                              fields: newFields
                            }
                          });
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Values</label>
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/collections/${profileTargetCollection.name}/metadata-values?field=${encodeURIComponent(fieldName)}&service=${profileTargetCollection.service}`
                              );
                              if (!response.ok) throw new Error('Failed to fetch values');
                              const data = await response.json();
                              
                              // Update the field with fetched values
                              setProfileForm({
                                ...profileForm,
                                categorical_filtering: {
                                  ...profileForm.categorical_filtering,
                                  fields: {
                                    ...profileForm.categorical_filtering.fields,
                                    [fieldName]: {
                                      ...profileForm.categorical_filtering.fields[fieldName],
                                      values: data.values
                                    }
                                  }
                                }
                              });
                            } catch (err) {
                              alert('Error fetching values: ' + err.message);
                            }
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Fetch from Documents
                        </button>
                      </div>

                      {profileForm.categorical_filtering.fields[fieldName].loading ? (
                        <p className="text-sm text-gray-500 italic">Loading available values...</p>
                      ) : profileForm.categorical_filtering.fields[fieldName].values?.length > 0 ? (
                        <div className="space-y-2">
                          {profileForm.categorical_filtering.fields[fieldName].values.map((value, idx) => (
                            <label key={idx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={profileForm.categorical_filtering.fields[fieldName].selectedValues?.includes(value) || false}
                                onChange={(e) => {
                                  const currentSelected = profileForm.categorical_filtering.fields[fieldName].selectedValues || [];
                                  const newSelected = e.target.checked
                                    ? [...currentSelected, value]
                                    : currentSelected.filter(v => v !== value);
                                  
                                  setProfileForm({
                                    ...profileForm,
                                    categorical_filtering: {
                                      ...profileForm.categorical_filtering,
                                      fields: {
                                        ...profileForm.categorical_filtering.fields,
                                        [fieldName]: {
                                          ...profileForm.categorical_filtering.fields[fieldName],
                                          selectedValues: newSelected
                                        }
                                      }
                                    }
                                  });
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">{value}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Click "Fetch from Documents" to load available values</p>
                      )}
                    </div>

                    {profileForm.categorical_filtering.fields[fieldName].selectedValues?.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Value (optional)</label>
                        <select
                          value={profileForm.categorical_filtering.fields[fieldName].default || ''}
                          onChange={(e) => {
                            setProfileForm({
                              ...profileForm,
                              categorical_filtering: {
                                ...profileForm.categorical_filtering,
                                fields: {
                                  ...profileForm.categorical_filtering.fields,
                                  [fieldName]: {
                                    ...profileForm.categorical_filtering.fields[fieldName],
                                    default: e.target.value || undefined
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">None</option>
                          {profileForm.categorical_filtering.fields[fieldName].selectedValues.map(value => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Field */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Categorical Filter</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setProfileForm({
                          ...profileForm,
                          categorical_filtering: {
                            ...profileForm.categorical_filtering,
                            fields: {
                              ...profileForm.categorical_filtering.fields,
                              [e.target.value]: {
                                type: 'exact_match',
                                values: [],
                                selectedValues: []
                              }
                            }
                          }
                        });
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value=""
                  >
                    <option value="">Select a field...</option>
                    {availableFields
                      .filter(field => !profileForm.categorical_filtering.fields[field])
                      .map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={closeProfileModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Test Modal */}
        {showTestModal && testTargetCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  🧪 Test Collection: "{testTargetCollection.metadata?.display_name || testTargetCollection.name}"
                </h2>
                <button 
                  type="button" 
                  onClick={closeTestModal} 
                  className="text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitTestQuery} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Query
                  </label>
                  <textarea
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Enter a test query to search this collection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    disabled={testLoading}
                  />
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Top K Results
                    </label>
                    <input
                      type="number"
                      value={testTopK}
                      onChange={(e) => setTestTopK(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                      min={1}
                      max={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={testLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testLoading || !testQuery.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {testLoading ? 'Testing...' : 'Test Query'}
                  </button>
                </div>
              </form>

              {testError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {testError}
                  </p>
                </div>
              )}

              {testResults && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <strong>Results:</strong> {testResults.results?.length || 0} documents
                      {testResults.embedding_dimensions && (
                        <span className="ml-4">
                          <strong>Dimensions:</strong> {testResults.embedding_dimensions}
                        </span>
                      )}
                      {testResults.execution_time_ms && (
                        <span className="ml-4">
                          <strong>Time:</strong> {testResults.execution_time_ms}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {testResults.results?.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Rank</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Distance</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 w-2/5">Content</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Metadata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {testResults.results.map((result, idx) => {
                            const isExpanded = expandedResults.has(idx);
                            const content = result.content || result.text || '';
                            const truncatedContent = content.length > 200 ? content.substring(0, 200) + '...' : content;

                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{result.rank || idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className={`font-mono ${
                                    result.distance < 0.3 ? 'text-green-700' :
                                    result.distance < 0.5 ? 'text-yellow-700' :
                                    'text-red-700'
                                  }`}>
                                    {result.distance?.toFixed(3)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  <div className="space-y-1">
                                    <p className={isExpanded ? '' : 'truncate'}>
                                      {isExpanded ? content : truncatedContent}
                                    </p>
                                    {content.length > 200 && (
                                      <button
                                        onClick={() => toggleResultExpansion(idx)}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        {isExpanded ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">
                                  {result.metadata && Object.keys(result.metadata).length > 0 ? (
                                    <pre className="font-mono max-w-xs overflow-x-auto">
                                      {JSON.stringify(result.metadata, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="text-gray-400 italic">No metadata</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <p className="mb-2">No results found for this query</p>
                      <p className="text-sm">Try a different query or check the collection contents</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Collections;

