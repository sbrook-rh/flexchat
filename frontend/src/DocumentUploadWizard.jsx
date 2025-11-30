import React, { useState, useRef } from 'react';

/**
 * DocumentUploadWizard - Multi-step modal for uploading documents to collections
 * 
 * Steps:
 * 1. File Upload - Select and parse JSON/JSONL file
 * 2. Field Mapping - Configure schema (text_fields, id_field, metadata_fields)
 * 3. Preview & Upload - Review transformed documents and confirm upload
 * 
 * Features:
 * - Batch upload: Splits large uploads (>1000 docs) into sequential batches
 * - Progress tracking: Real-time progress bar with time estimates
 * - Cancellation: Cancel button to abort in-progress uploads
 * - Single-batch optimization: Small uploads (<1000 docs) use single request
 * 
 * Props:
 * - collectionName: Target collection for upload
 * - serviceName: RAG service name
 * - collectionMetadata: Collection metadata (embedding model, etc.)
 * - onClose: Callback when wizard closes
 * - onComplete: Callback when upload succeeds (receives result data)
 */
function DocumentUploadWizard({ collectionName, serviceName, collectionMetadata, onClose, onComplete }) {
  // Cancellation ref (used to cancel upload between batches)
  const cancelUploadRef = useRef(false);

  // Wizard state
  const [wizardState, setWizardState] = useState(() => {
    // Parse saved schema from metadata (stored as JSON string)
    let savedSchema = null;
    if (collectionMetadata?.document_schema) {
      try {
        savedSchema = JSON.parse(collectionMetadata.document_schema);
      } catch (e) {
        console.warn('Failed to parse document_schema:', e);
      }
    }
    
    return {
      currentStep: 1,
      rawDocuments: null, // Parsed JSON array from uploaded file
      fileName: null,
      schema: {
        text_fields: savedSchema?.text_fields || [],
        id_field: savedSchema?.id_field || null,
        metadata_fields: savedSchema?.metadata_fields || []
      },
      transformedPreview: null,
      uploading: false,
      uploadCancelled: false,
      uploadProgress: null, // { current: 0, total: 0, percentage: 0, estimatedSeconds: 0 }
      failedAtBatch: null, // Track which batch failed for smart retry
      saveSchema: !savedSchema // Smart default: checked for new, unchecked for existing
    };
  });

  // Check if wizard has any data (for close confirmation)
  const hasData = wizardState.rawDocuments !== null || 
                  wizardState.schema.text_fields.length > 0;

  // Update wizard state (passed to step components)
  const updateWizardState = (updates) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  // Validation: Can user advance to next step?
  const canAdvance = () => {
    switch (wizardState.currentStep) {
      case 1:
        // Step 1: Need file uploaded and parsed
        return wizardState.rawDocuments && wizardState.rawDocuments.length > 0;
      case 2:
        // Step 2: Need at least one text field selected
        return wizardState.schema.text_fields.length > 0;
      case 3:
        // Step 3: Preview step is always valid
        return true;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (!canAdvance()) return;
    
    if (wizardState.currentStep < 3) {
      updateWizardState({ currentStep: wizardState.currentStep + 1 });
    }
  };

  const handleBack = () => {
    if (wizardState.currentStep > 1) {
      updateWizardState({ currentStep: wizardState.currentStep - 1 });
    }
  };

  const handleClose = () => {
    if (hasData) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close and discard your progress?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleUpload = async () => {
    if (wizardState.uploading) return;

    const BATCH_SIZE = 50;
    const totalDocs = wizardState.rawDocuments.length;
    const batches = [];
    
    // Split documents into batches
    for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
      batches.push(wizardState.rawDocuments.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    const useBatching = totalBatches > 1;
    const startTime = Date.now(); // Store start time locally

    // Smart retry: Resume from failed batch if retrying
    const startBatch = wizardState.failedAtBatch !== null ? wizardState.failedAtBatch : 0;
    const uploadedCount = startBatch * BATCH_SIZE; // Docs already uploaded in previous attempts

    // Reset cancel flag
    cancelUploadRef.current = false;

    updateWizardState({
      uploading: true,
      uploadCancelled: false,
      failedAtBatch: null, // Clear failure state on retry
      uploadProgress: useBatching ? {
        current: startBatch,
        total: totalBatches,
        docsUploaded: uploadedCount,
        totalDocs: totalDocs,
        percentage: Math.round((startBatch / totalBatches) * 100),
        estimatedSeconds: null
      } : null
    });

    let progressInterval = null;

    try {
      let currentUploadedCount = uploadedCount;

      for (let batchIndex = startBatch; batchIndex < totalBatches; batchIndex++) {
        // Check for cancellation between batches using ref
        if (cancelUploadRef.current) {
          if (progressInterval) clearInterval(progressInterval);
          updateWizardState({
            uploading: false,
            uploadProgress: null,
            failedAtBatch: batchIndex // Save position for potential retry
          });
          alert(`Upload cancelled. ${currentUploadedCount.toLocaleString()} of ${totalDocs.toLocaleString()} documents uploaded.`);
          return;
        }

        const batch = batches[batchIndex];
        const isFirstBatch = batchIndex === 0;

        // Start micro-progress animation for this batch
        if (useBatching) {
          const currentBatch = batchIndex;
          const nextBatch = batchIndex + 1;
          const currentPercentage = Math.round((currentBatch / totalBatches) * 100);
          const nextPercentage = Math.round((nextBatch / totalBatches) * 100);
          
          // Calculate average time per batch based on THIS attempt (not total index)
          const elapsed = (Date.now() - startTime) / 1000;
          const batchesCompletedSoFar = batchIndex - startBatch;
          const avgTimePerBatch = batchesCompletedSoFar > 0 ? elapsed / batchesCompletedSoFar : 11; // Default to 11s for first batch
          
          // Animate progress gradually over estimated batch time
          const animationDuration = avgTimePerBatch * 1000; // Convert to ms
          const steps = Math.max(20, (nextPercentage - currentPercentage) * 2); // At least 20 steps
          const increment = (nextPercentage - currentPercentage) / steps;
          const intervalTime = animationDuration / steps;
          
          let animatedPercentage = currentPercentage;
          
          progressInterval = setInterval(() => {
            animatedPercentage = Math.min(animatedPercentage + increment, nextPercentage - 0.5);
            
            const remaining = (totalBatches - batchIndex) * avgTimePerBatch - (Date.now() - startTime - elapsed * 1000) / 1000;
            
            updateWizardState({
              uploadProgress: {
                current: batchIndex + 1, // Display as 1-based (batch 1, 2, 3...)
                total: totalBatches,
                docsUploaded: currentUploadedCount,
                totalDocs: totalDocs,
                percentage: Math.round(animatedPercentage),
                estimatedSeconds: Math.max(0, Math.ceil(remaining))
              }
            });
          }, intervalTime);
        }

        const response = await fetch(`/api/collections/${collectionName}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Wizard-specific (transformation):
            raw_documents: batch,
            schema: wizardState.schema,
            save_schema: isFirstBatch ? wizardState.saveSchema : false, // Save schema on FIRST batch
            
            // Standard (same as existing "Upload Docs"):
            service: serviceName
          })
        });

        // Clear animation interval once batch completes
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        if (!response.ok) {
          let errorMessage = 'Unknown error';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // JSON parse failed - likely network error or server crash
            errorMessage = `Network error (${response.status || 'connection failed'})`;
          }
          throw new Error(`Upload failed at batch ${batchIndex + 1} of ${totalBatches}: ${errorMessage}`);
        }

        currentUploadedCount += batch.length;

        // Update progress after each batch (jumps to actual completion)
        if (useBatching) {
          const currentBatch = batchIndex + 1;
          const percentage = Math.round((currentBatch / totalBatches) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const batchesCompleted = currentBatch - startBatch;
          const avgTimePerBatch = batchesCompleted > 0 ? elapsed / batchesCompleted : 11;
          const remaining = (totalBatches - currentBatch) * avgTimePerBatch;

          updateWizardState({
            uploadProgress: {
              current: currentBatch,
              total: totalBatches,
              docsUploaded: currentUploadedCount,
              totalDocs: totalDocs,
              percentage: percentage,
              estimatedSeconds: Math.ceil(remaining)
            }
          });
        }
      }

      // Clear interval if still running
      if (progressInterval) clearInterval(progressInterval);

      // Success - all batches uploaded
      const result = { 
        count: currentUploadedCount,
        message: `Successfully uploaded ${currentUploadedCount} documents` 
      };
      onComplete(result);
      onClose();
    } catch (error) {
      // Clear interval on error
      if (progressInterval) clearInterval(progressInterval);
      
      // Store which batch failed for smart retry
      const failedBatchMatch = error.message.match(/batch (\d+) of/);
      const failedBatch = failedBatchMatch ? parseInt(failedBatchMatch[1]) - 1 : null;
      
      alert(`Upload failed: ${error.message}\n\nClick Upload to retry from batch ${failedBatch !== null ? failedBatch + 1 : 'beginning'}.`);
      updateWizardState({
        uploading: false,
        uploadProgress: null,
        failedAtBatch: failedBatch
      });
    }
  };

  const handleCancelUpload = () => {
    cancelUploadRef.current = true;
    updateWizardState({ uploadCancelled: true });
  };

  // Render current step
  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <FileUploadStep
            wizardState={wizardState}
            onUpdate={updateWizardState}
          />
        );
      case 2:
        return (
          <FieldMappingStep
            wizardState={wizardState}
            onUpdate={updateWizardState}
          />
        );
      case 3:
        return (
          <PreviewUploadStep
            wizardState={wizardState}
            collectionName={collectionName}
            serviceName={serviceName}
            collectionMetadata={collectionMetadata}
            onUpdate={updateWizardState}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Documents</h2>
            <p className="text-sm text-gray-600 mt-1">
              {collectionName} • Step {wizardState.currentStep} of 3
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close wizard"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {wizardState.currentStep === 1 && 'Upload a JSON file to begin'}
            {wizardState.currentStep === 2 && 'Select fields to extract from your documents'}
            {wizardState.currentStep === 3 && !wizardState.uploading && 'Review and confirm upload'}
            {wizardState.currentStep === 3 && wizardState.uploading && 'Upload in progress...'}
          </div>
          
          <div className="flex gap-3">
            {!wizardState.uploading && (
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {wizardState.uploading && wizardState.uploadProgress && (
              <button
                onClick={handleCancelUpload}
                className="px-4 py-2 border border-red-300 rounded text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Upload
              </button>
            )}
            
            {wizardState.currentStep > 1 && !wizardState.uploading && (
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            
            {wizardState.currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className={`px-4 py-2 rounded transition-colors ${
                  canAdvance()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleUpload}
                disabled={wizardState.uploading}
                className={`px-4 py-2 rounded transition-colors ${
                  wizardState.uploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {wizardState.uploading 
                  ? 'Uploading...' 
                  : wizardState.failedAtBatch !== null 
                    ? `Retry from Batch ${wizardState.failedAtBatch + 1}`
                    : 'Upload'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 1: File Upload
 * User selects a JSON file or JSONL file, which is parsed and validated
 * Supports both JSON array (.json) and JSONL (.jsonl) formats
 */
function FileUploadStep({ wizardState, onUpdate }) {
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parseInfo, setParseInfo] = useState(null);

  const handleFileRead = (fileContent, fileName, fileSize) => {
    try {
      setParseError(null);
      setParseInfo(null);

      // File size validation
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const WARNING_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      if (fileSize > MAX_FILE_SIZE) {
        setParseError(
          `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). ` +
          `Maximum size is 50MB. Consider splitting your file or processing in batches.`
        );
        return;
      }

      if (fileSize > WARNING_FILE_SIZE) {
        setParseInfo(
          `⚠️ Large file detected (${(fileSize / 1024 / 1024).toFixed(1)}MB). ` +
          `Parsing may take a few seconds.`
        );
      }

      let parsed;
      let skippedCount = 0;

      // Format detection: JSONL vs JSON array
      if (fileName.endsWith('.jsonl')) {
        // Parse JSONL (newline-delimited)
        const lines = fileContent.trim().split('\n');
        
        parsed = lines
          .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) {
              skippedCount++;
              return false;
            }
            return true;
          })
          .map((line, index) => {
            try {
              return JSON.parse(line);
            } catch (e) {
              throw new Error(`Parse error at line ${index + 1}: ${e.message}`);
            }
          });
        
        // Info message about skipped lines
        if (skippedCount > 0) {
          setParseInfo(`ℹ️ Skipped ${skippedCount} empty line${skippedCount > 1 ? 's' : ''}. Parsed ${parsed.length} document${parsed.length !== 1 ? 's' : ''}.`);
        }
      } else {
        // Parse JSON array (existing behavior)
        parsed = JSON.parse(fileContent);
      }
      
      // Validate: Must be an array
      if (!Array.isArray(parsed)) {
        throw new Error('File must contain a JSON array or JSONL format');
      }
      
      if (parsed.length === 0) {
        throw new Error('File contains no documents');
      }

      // Validate: All items must be objects
      if (!parsed.every(item => typeof item === 'object' && item !== null)) {
        throw new Error('All items in array must be JSON objects');
      }

      // Document count limits
      const MAX_DOCUMENTS = 10000;
      const WARNING_DOCUMENTS = 2000;

      if (parsed.length > MAX_DOCUMENTS) {
        setParseError(
          `File contains ${parsed.length.toLocaleString()} documents. ` +
          `Maximum is ${MAX_DOCUMENTS.toLocaleString()} documents per upload. ` +
          `For large datasets, consider using the batch upload API.`
        );
        return;
      }

      if (parsed.length > WARNING_DOCUMENTS) {
        const estimatedMinutes = Math.ceil(parsed.length / 88 / 60); // Based on 88 docs/sec observed
        setParseInfo(
          `⚠️ Large upload: ${parsed.length.toLocaleString()} documents. ` +
          `This may take ${estimatedMinutes}-${estimatedMinutes + 1} minutes to upload.`
        );
      }

      onUpdate({
        rawDocuments: parsed,
        fileName: fileName
      });
    } catch (error) {
      setParseError(error.message);
      onUpdate({
        rawDocuments: null,
        fileName: null
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => handleFileRead(e.target.result, file.name, file.size);
    reader.readAsText(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => handleFileRead(e.target.result, file.name, file.size);
    reader.readAsText(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload JSON File</h3>
        <p className="text-sm text-gray-600">
          Select a JSON file containing an array of documents. Each document should be a JSON object
          with the fields you want to index.
        </p>
      </div>

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-4">
          <div className="text-5xl">📄</div>
          <div>
            <p className="text-gray-700 font-medium mb-2">
              Drag and drop your JSON file here
            </p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors">
              Choose File
              <input
                type="file"
                accept=".json,.jsonl,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Parse info */}
      {parseInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {parseInfo}
          </p>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {parseError}
          </p>
        </div>
      )}

      {/* Success message */}
      {wizardState.rawDocuments && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>✓ File loaded:</strong> {wizardState.fileName}
          </p>
          <p className="text-sm text-green-700 mt-1">
            Found {wizardState.rawDocuments.length} document(s)
          </p>
        </div>
      )}

      {/* Format example */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Expected format:</p>
        <pre className="text-xs text-gray-600 overflow-x-auto">
{`[
  {
    "title": "Document 1",
    "content": "Text content...",
    "author": "John Doe",
    "date": "2024-01-01"
  },
  ...
]

JSONL (.jsonl) also supported - one JSON object per line.`}
        </pre>
      </div>
    </div>
  );
}

/**
 * Step 2: Field Mapping
 * User configures schema: which fields are text, id, metadata
 */
function FieldMappingStep({ wizardState, onUpdate }) {
  if (!wizardState.rawDocuments || wizardState.rawDocuments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No documents available. Please go back and upload a file.
      </div>
    );
  }

  // Extract all unique field names from documents
  const allFields = new Set();
  wizardState.rawDocuments.forEach(doc => {
    Object.keys(doc).forEach(key => allFields.add(key));
  });
  const fieldNames = Array.from(allFields);

  const { text_fields, id_field, metadata_fields } = wizardState.schema;

  const toggleTextField = (field) => {
    const newTextFields = text_fields.includes(field)
      ? text_fields.filter(f => f !== field)
      : [...text_fields, field];
    
    onUpdate({
      schema: { ...wizardState.schema, text_fields: newTextFields }
    });
  };

  const setIdField = (field) => {
    onUpdate({
      schema: { ...wizardState.schema, id_field: field === id_field ? null : field }
    });
  };

  const toggleMetadataField = (field) => {
    const newMetadataFields = metadata_fields.includes(field)
      ? metadata_fields.filter(f => f !== field)
      : [...metadata_fields, field];
    
    onUpdate({
      schema: { ...wizardState.schema, metadata_fields: newMetadataFields }
    });
  };

  // Sample values from first document
  const sampleDoc = wizardState.rawDocuments[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure Field Mapping</h3>
        <p className="text-sm text-gray-600">
          Select which fields to extract from your documents. At least one text field is required.
        </p>
      </div>

      {/* Field mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Field Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Sample Value
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Text Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                ID Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Metadata
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fieldNames.map(field => {
              const sampleValue = sampleDoc[field];
              let displayValue;
              if (typeof sampleValue === 'string') {
                displayValue = sampleValue.substring(0, 50) + (sampleValue.length > 50 ? '...' : '');
              } else {
                const jsonStr = JSON.stringify(sampleValue);
                displayValue = jsonStr !== undefined 
                  ? jsonStr.substring(0, 50) + (jsonStr.length > 50 ? '...' : '')
                  : '(undefined)';
              }

              return (
                <tr key={field} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {field}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {displayValue}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={text_fields.includes(field)}
                      onChange={() => toggleTextField(field)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="radio"
                      checked={id_field === field}
                      onChange={() => setIdField(field)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={metadata_fields.includes(field)}
                      onChange={() => toggleMetadataField(field)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Text Fields:</strong> Content to be indexed and searched (required)</li>
          <li><strong>ID Field:</strong> Unique identifier for each document (optional)</li>
          <li><strong>Metadata:</strong> Additional fields to store with each document (optional)</li>
        </ul>
      </div>

      {/* Validation warning */}
      {text_fields.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>⚠ Warning:</strong> You must select at least one text field to proceed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Step 3: Preview & Upload
 * User reviews transformed documents before uploading
 */
function PreviewUploadStep({ wizardState, collectionName, serviceName, collectionMetadata, onUpdate }) {
  if (!wizardState.rawDocuments || wizardState.rawDocuments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No documents available. Please go back and configure your upload.
      </div>
    );
  }

  // Simulate transformation for preview (first 3 documents)
  const previewDocs = wizardState.rawDocuments.slice(0, 3).map((doc, idx) => {
    const { text_fields, id_field, metadata_fields } = wizardState.schema;
    
    // Combine text fields
    const textParts = text_fields.map(field => doc[field]).filter(Boolean);
    const text = textParts.join('\n\n');
    
    // Extract ID
    const id = id_field ? String(doc[id_field]) : `doc-${idx + 1}`;
    
    // Extract metadata
    const metadata = {};
    metadata_fields.forEach(field => {
      if (doc[field] !== undefined) {
        metadata[field] = doc[field];
      }
    });

    return { id, text, metadata };
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview & Upload</h3>
        <p className="text-sm text-gray-600">
          Review the transformed documents before uploading to <strong>{collectionName}</strong> in {serviceName}.
        </p>
      </div>

      {/* Upload summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-700 font-semibold">Documents:</p>
            <p className="text-blue-900">{wizardState.rawDocuments.length}</p>
          </div>
          <div>
            <p className="text-blue-700 font-semibold">Text Fields:</p>
            <p className="text-blue-900">{wizardState.schema.text_fields.join(', ')}</p>
          </div>
          <div>
            <p className="text-blue-700 font-semibold">ID Field:</p>
            <p className="text-blue-900">{wizardState.schema.id_field || 'Auto-generated'}</p>
          </div>
          <div>
            <p className="text-blue-700 font-semibold">Metadata Fields:</p>
            <p className="text-blue-900">
              {wizardState.schema.metadata_fields.length > 0
                ? wizardState.schema.metadata_fields.join(', ')
                : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar (shown during upload) */}
      {wizardState.uploading && wizardState.uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-blue-900">
              Uploading batch {wizardState.uploadProgress.current} of {wizardState.uploadProgress.total}...
            </span>
            <span className="text-blue-700">
              {wizardState.uploadProgress.percentage}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${wizardState.uploadProgress.percentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-blue-700">
            <span>
              {wizardState.uploadProgress.docsUploaded.toLocaleString()} of {wizardState.uploadProgress.totalDocs.toLocaleString()} documents
            </span>
            {wizardState.uploadProgress.estimatedSeconds !== null && (
              <span>
                ~{wizardState.uploadProgress.estimatedSeconds}s remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preview samples */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Preview (first {Math.min(3, wizardState.rawDocuments.length)} document{wizardState.rawDocuments.length !== 1 ? 's' : ''})
        </h4>
        <div className="space-y-4">
          {previewDocs.map((doc, idx) => (
            <div key={idx} className="border rounded-lg p-4 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                Document {idx + 1}: {doc.id}
              </div>
              <div className="text-sm text-gray-800 mb-3 max-h-24 overflow-y-auto">
                {doc.text.substring(0, 200)}
                {doc.text.length > 200 && '...'}
              </div>
              {Object.keys(doc.metadata).length > 0 && (
                <div className="text-xs text-gray-600">
                  <strong>Metadata:</strong> {JSON.stringify(doc.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save schema checkbox */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wizardState.saveSchema ?? !collectionMetadata?.document_schema}
            onChange={(e) => onUpdate({ saveSchema: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            {collectionMetadata?.document_schema
              ? 'Update existing schema'
              : 'Save this configuration for future uploads'}
          </span>
        </label>
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          Clicking <strong>Upload</strong> will send {wizardState.rawDocuments.length} document(s) to the backend for processing.
        </p>
      </div>
    </div>
  );
}

export default DocumentUploadWizard;

