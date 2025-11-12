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
  const [embeddingModels, setEmbeddingModels] = useState([]);
  
  // New collection form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    displayName: '',
    description: '',
    match_threshold: 0.3,
    partial_threshold: 0.5,
    embedding_connection: '',
    embedding_model: ''
  });
  const [collectionId, setCollectionId] = useState('');
  const [idError, setIdError] = useState('');
  
  // Edit collection form
  const [editingCollection, setEditingCollection] = useState(null);
  const [editForm, setEditForm] = useState({
    description: '',
    match_threshold: 0.3,
    partial_threshold: 0.5
  });
  
  // Upload form (modal)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTargetCollection, setUploadTargetCollection] = useState(null);
  const [uploadText, setUploadText] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [resolvedConnection, setResolvedConnection] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [resolvingConnection, setResolvingConnection] = useState(false);

  // Document Upload Wizard state
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [wizardTargetCollection, setWizardTargetCollection] = useState(null);

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

  // Fetch embedding-capable models for a given connection
  const fetchEmbeddingModelsForConnection = async (connectionId) => {
    const conn = llms[connectionId];
    if (!conn) {
      setEmbeddingModels([]);
      return;
    }
    try {
      const res = await fetch('/api/connections/llm/discovery/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: conn.provider,
          config: conn
        })
      });
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];
      const embeddingOnly = models.filter(m =>
        m.type === 'embedding' || (m.capabilities || []).includes('embedding')
      );
      setEmbeddingModels(embeddingOnly);
    } catch (e) {
      console.error('Failed to fetch models:', e);
      setEmbeddingModels([]);
    }
  };

  // When opening the create modal, preselect defaults if available
  useEffect(() => {
    if (showCreateForm && defaultEmbedding && Object.keys(llms).includes(defaultEmbedding.llm)) {
      // Preselect connection and fetch models
      setNewCollection(prev => ({ ...prev, embedding_connection: defaultEmbedding.llm }));
      fetchEmbeddingModelsForConnection(defaultEmbedding.llm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm]);

  // When embedding models load, preselect default model if it's in the list
  useEffect(() => {
    if (showCreateForm && defaultEmbedding && newCollection.embedding_connection === defaultEmbedding.llm && embeddingModels.length > 0) {
      const defaultModelInList = embeddingModels.some(m => m.id === defaultEmbedding.model);
      if (defaultModelInList) {
        setNewCollection(prev => ({ ...prev, embedding_model: defaultEmbedding.model }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embeddingModels, showCreateForm]);

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
    if (!newCollection.embedding_connection) {
      alert('Please select an embedding connection');
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
          embedding_connection: newCollection.embedding_connection,
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
        embedding_connection: '',
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
    
    try {
      // Get existing collection metadata to preserve embedding fields
      const existingCollection = collections.find(c => c.name === editingCollection);
      const existingMetadata = existingCollection?.metadata || {};
      
      // Remove hnsw:space - ChromaDB doesn't allow changing it after creation
      const { 'hnsw:space': _, ...preservedMetadata } = existingMetadata;
      
      const response = await fetch(`/api/collections/${editingCollection}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: currentWrapper,
          metadata: {
            ...preservedMetadata,  // Preserve all existing metadata except hnsw:space
            description: editForm.description,
            match_threshold: parseFloat(editForm.match_threshold),
            partial_threshold: parseFloat(editForm.partial_threshold),
            updated_at: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }
      
      alert(`Collection "${editingCollection}" updated successfully!`);
      
      // Reset edit form
      setEditingCollection(null);
      setEditForm({
        description: '',
        match_threshold: 0.3,
        partial_threshold: 0.5
      });
      
      // Reload UI config to update all pages
      reloadConfig();
    } catch (err) {
      alert('Error updating collection: ' + err.message);
    }
  };

  const startEditing = (collection) => {
    setEditingCollection(collection.name);
    setEditForm({
      description: collection.metadata?.description || '',
      threshold: collection.metadata?.threshold || 0.3,
      partial_threshold: collection.metadata?.partial_threshold || 0.5
    });
    setShowCreateForm(false); // Close create form if open
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingCollection(null);
    setEditForm({
      description: '',
      match_threshold: 0.3,
      partial_threshold: 0.5
    });
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

  const openUploadModal = async (collection) => {
    setUploadTargetCollection(collection);
    setShowUploadModal(true);
    setUploadText('');
    setUploadFiles([]);
    setResolvedConnection(null);
    setConnectionError(null);
    setResolvingConnection(true);

    // Try to resolve a compatible connection
    await resolveCompatibleConnection(collection);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadTargetCollection(null);
    setUploadText('');
    setUploadFiles([]);
    setResolvedConnection(null);
    setConnectionError(null);
    setResolvingConnection(false);
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
    // Optionally refresh collections or show success message
  };

  const resolveCompatibleConnection = async (collection) => {
    try {
      const meta = collection.metadata;
      if (!meta || !meta.embedding_provider || !meta.embedding_model) {
        setConnectionError('Collection is missing embedding metadata.');
        setResolvingConnection(false);
        return;
      }

      // Step 1: Try to match by embedding_connection_id
      if (meta.embedding_connection_id && llms[meta.embedding_connection_id]) {
        setResolvedConnection(meta.embedding_connection_id);
        setResolvingConnection(false);
        return;
      }

      // Step 2: Search all LLM connections by discovering models
      const requiredProvider = meta.embedding_provider;
      const requiredModel = meta.embedding_model;

      for (const [connectionId, connectionConfig] of Object.entries(llms)) {
        if (connectionConfig.provider !== requiredProvider) continue;

        // Discover models for this connection
        try {
          const res = await fetch('/api/connections/llm/discovery/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: connectionConfig.provider,
              config: connectionConfig
            })
          });
          const data = await res.json();
          const models = Array.isArray(data.models) ? data.models : [];
          const embeddingModels = models.filter(m =>
            m.type === 'embedding' || (m.capabilities || []).includes('embedding')
          );

          // Check if required model is in the list (exact match only)
          if (embeddingModels.some(m => m.id === requiredModel)) {
            setResolvedConnection(connectionId);
            setResolvingConnection(false);
            return;
          }
        } catch (err) {
          console.warn(`Failed to discover models for ${connectionId}:`, err);
        }
      }

      // Step 3: No match found
      setConnectionError(
        `No configured LLM connection supports ${requiredProvider}/${requiredModel}. ` +
        `Please configure an ${requiredProvider} connection with this model.`
      );
      setResolvingConnection(false);
    } catch (err) {
      setConnectionError(`Error resolving connection: ${err.message}`);
      setResolvingConnection(false);
    }
  };

  const uploadDocuments = async (e) => {
    e.preventDefault();
    
    if (!uploadTargetCollection) {
      alert('No collection selected');
      return;
    }

    if (!resolvedConnection) {
      alert('No compatible embedding connection found. Please check the error message.');
      return;
    }
    
    const documents = [];
    
    // Process text input
    if (uploadText.trim()) {
      documents.push({
        text: uploadText.trim(),
        metadata: {
          source: 'text_input',
          uploaded_at: new Date().toISOString()
        }
      });
    }
    
    // Process files
    if (uploadFiles.length > 0) {
      for (const file of uploadFiles) {
        try {
          const text = await file.text();
          
          // If it's a JSON file, try to parse it
          if (file.name.endsWith('.json')) {
            try {
              const jsonData = JSON.parse(text);
              
              // If it's an array, treat each element as a separate document
              if (Array.isArray(jsonData)) {
                for (const item of jsonData) {
                  // Extract text based on common fields
                  let docText = '';
                  if (item.text) {
                    docText = item.text;
                  } else if (item.content) {
                    docText = item.content;
                  } else {
                    // If no text/content field, stringify the whole object
                    docText = JSON.stringify(item);
                  }
                  
                  // Include title if available
                  if (item.title) {
                    docText = `${item.title}\n\n${docText}`;
                  }
                  
                  documents.push({
                    text: docText,
                    metadata: {
                      source: 'file',
                      filename: file.name,
                      title: item.title || 'Untitled',
                      uploaded_at: new Date().toISOString()
                    }
                  });
                }
                console.log(`Parsed ${jsonData.length} documents from ${file.name}`);
              } else {
                // Single JSON object - treat as one document
                documents.push({
                  text: jsonData.text || jsonData.content || JSON.stringify(jsonData),
                  metadata: {
                    source: 'file',
                    filename: file.name,
                    uploaded_at: new Date().toISOString()
                  }
                });
              }
            } catch (error) {
              // If JSON parsing fails, treat as plain text
              console.warn(`Could not parse ${file.name} as JSON, treating as text`, error);
              documents.push({
                text: text,
                metadata: {
                  source: 'file',
                  filename: file.name,
                  uploaded_at: new Date().toISOString()
                }
              });
            }
          } else {
            // Non-JSON files: treat entire content as one document
            documents.push({
              text: text,
              metadata: {
                source: 'file',
                filename: file.name,
                uploaded_at: new Date().toISOString()
              }
            });
          }
        } catch (err) {
          console.error(`Error reading file ${file.name}:`, err);
        }
      }
    }
    
    if (documents.length === 0) {
      alert('Please provide text or files to upload');
      return;
    }
    
    try {
      setUploading(true);
      const response = await fetch(`/api/collections/${uploadTargetCollection.name}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documents,
          service: uploadTargetCollection.service,
          embedding_connection: resolvedConnection,
          embedding_model: uploadTargetCollection.metadata?.embedding_model
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload documents');
      }
      
      const result = await response.json();
      alert(`Successfully uploaded ${result.count} document(s) to "${uploadTargetCollection.metadata?.display_name || uploadTargetCollection.name}"`);
      
      // Close modal and reload
      closeUploadModal();
      reloadConfig();
    } catch (err) {
      alert('Error uploading documents: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    setUploadFiles(Array.from(e.target.files));
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(collection)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openUploadModal(collection)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                        >
                          Upload Docs
                        </button>
                        <button
                          onClick={() => openUploadWizard(collection)}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                        >
                          Upload JSON
                        </button>
                        {!(isPinned && collection.name === currentWrapperInfo?.collection) && (
                          <button
                            onClick={() => deleteCollection(collection.name)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                          >
                            Delete
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

              {/* Advanced: Embedding preset */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Embedding Preset</h3>
                  <p className="text-xs text-gray-600">Choose which LLM connection to use for embeddings.</p>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Embedding Connection *
                </label>
                <select
                  value={newCollection.embedding_connection || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCollection({ ...newCollection, embedding_connection: val, embedding_model: '' });
                    if (val) fetchEmbeddingModelsForConnection(val);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select connection...</option>
                  {Object.keys(llms).map((id) => (
                    <option key={id} value={id}>{id} ({llms[id].provider})</option>
                  ))}
                </select>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Embedding Model *
                  </label>
                  <select
                    value={newCollection.embedding_model || (defaultEmbedding && defaultEmbedding.llm === newCollection.embedding_connection ? defaultEmbedding.model : '')}
                    onChange={(e) => setNewCollection({ ...newCollection, embedding_model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!newCollection.embedding_connection}
                  >
                    <option value="">Select a model...</option>
                    {embeddingModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.id}</option>
                    ))}
                  </select>
                </div>
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
                <h2 className="text-xl font-semibold text-gray-900">Edit Collection: {editingCollection}</h2>
                <button type="button" onClick={cancelEditing} className="text-gray-500 hover:text-gray-800">✕</button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={editingCollection}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Collection name cannot be changed</p>
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

              {/* Advanced: Embedding (read-only) */}
              {(() => {
                const meta = (collections.find(c => c.name === editingCollection) || {}).metadata || {};
                return (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Embedding</h3>
                      <p className="text-xs text-gray-600">Embedding settings are fixed for this collection.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Provider</label>
                        <input type="text" value={meta.embedding_provider || '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Model</label>
                        <input type="text" value={meta.embedding_model || '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Dimensions</label>
                        <input type="text" value={meta.embedding_dimensions ?? '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Connection ID</label>
                        <input type="text" value={meta.embedding_connection_id || '-'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700" />
                      </div>
                    </div>
                  </div>
                );
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

        {/* Upload Documents Modal */}
        {showUploadModal && uploadTargetCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <form onSubmit={uploadDocuments} className="bg-white rounded-lg shadow w-full max-w-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Documents to "{uploadTargetCollection.metadata?.display_name || uploadTargetCollection.name}"
                </h2>
                <button type="button" onClick={closeUploadModal} className="text-gray-500 hover:text-gray-800">✕</button>
              </div>

              {/* Connection Resolution Status */}
              {resolvingConnection ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">🔍 Resolving compatible embedding connection...</p>
                </div>
              ) : connectionError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800"><strong>⚠️ Connection Error:</strong></p>
                  <p className="text-sm text-red-700 mt-1">{connectionError}</p>
                </div>
              ) : resolvedConnection ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>✓ Embedding Connection:</strong> {resolvedConnection}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Using model: {uploadTargetCollection.metadata?.embedding_provider}/{uploadTargetCollection.metadata?.embedding_model}
                  </p>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".txt,.md,.json"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: .txt, .md, .json
                  {uploadFiles.length > 0 && ` (${uploadFiles.length} file(s) selected)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or Paste Text
                </label>
                <textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste document text here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeUploadModal} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                <button
                  type="submit"
                  disabled={uploading || !resolvedConnection || resolvingConnection}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : resolvingConnection ? 'Resolving...' : 'Upload Documents'}
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
            onClose={closeUploadWizard}
            onComplete={handleWizardComplete}
          />
        )}
      </div>
    </div>
  );
}

export default Collections;

