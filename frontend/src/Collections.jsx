import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

function Collections({ uiConfig, reloadConfig }) {
  const [searchParams] = useSearchParams();
  const currentWrapper = searchParams.get('wrapper');
  
  const [collections, setCollections] = useState([]);
  const [wrappers, setWrappers] = useState([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  
  // New collection form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    displayName: '',
    description: '',
    match_threshold: 0.3,
    partial_threshold: 0.5
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
  
  // Upload form
  const [selectedCollection, setSelectedCollection] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Populate from uiConfig on mount
  useEffect(() => {
    if (uiConfig) {
      setCollections(uiConfig.collections || []);
      setWrappers(uiConfig.wrappers || []);
      setLoading(false);
    }
  }, [uiConfig]);

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
    
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionId,  // Use generated ID as the actual collection name
          service: currentWrapper,
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
        partial_threshold: 0.5
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
      const response = await fetch(`/api/collections/${editingCollection}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: currentWrapper,
          metadata: {
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

  const uploadDocuments = async (e) => {
    e.preventDefault();
    
    if (!selectedCollection) {
      alert('Please select a collection');
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
      const response = await fetch(`/api/collections/${selectedCollection}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documents,
          service: currentWrapper
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload documents');
      }
      
      const result = await response.json();
      alert(`Successfully uploaded ${result.count} document(s) to "${selectedCollection}"`);
      
      // Reset form
      setUploadText('');
      setUploadFiles([]);
      setSelectedCollection('');
      
      // Reload to update counts
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
                          onClick={() => {
                            setSelectedCollection(collection.name);
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                          }}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                        >
                          Upload Docs
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

        {/* Create Collection Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Collection</h2>
            </div>
            
            <form onSubmit={createCollection} className="p-6 space-y-4">
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

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Collection
              </button>
            </form>
          </div>
        )}

        {/* Edit Collection Form */}
        {editingCollection && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Edit Collection: {editingCollection}</h2>
              <button
                onClick={cancelEditing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={updateCollection} className="p-6 space-y-4">
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

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Upload Documents */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
          </div>
          
          <form onSubmit={uploadDocuments} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Collection *
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a collection...</option>
                {displayCollections.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count} docs)
                  </option>
                ))}
              </select>
            </div>

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

            <button
              type="submit"
              disabled={uploading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload to Collection'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Collections;

