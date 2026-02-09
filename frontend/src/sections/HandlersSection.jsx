import React, { useState } from 'react';
import ConfigSection from '../ConfigSection';
import HandlerModal from '../components/HandlerModal';

/**
 * HandlersSection - Response handler management (Phase 4)
 * Allows users to create, edit, and manage response handlers with match criteria
 */
function HandlersSection({ workingConfig, onUpdate, modelsCache, setModelsCache, fetchModelsForProvider }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const handlers = workingConfig?.responses || [];
  const hasLLMs = Object.keys(workingConfig?.llms || {}).length > 0;

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newHandlers = [...handlers];
    [newHandlers[index - 1], newHandlers[index]] = [newHandlers[index], newHandlers[index - 1]];
    onUpdate({ ...workingConfig, responses: newHandlers });
  };

  const handleMoveDown = (index) => {
    if (index === handlers.length - 1) return;
    const newHandlers = [...handlers];
    [newHandlers[index], newHandlers[index + 1]] = [newHandlers[index + 1], newHandlers[index]];
    onUpdate({ ...workingConfig, responses: newHandlers });
  };

  const handleDelete = (index) => {
    if (handlers.length === 1) {
      alert('Cannot delete the last response handler. At least one handler is required.');
      return;
    }
    if (window.confirm('Delete this response handler?')) {
      const newHandlers = handlers.filter((_, idx) => idx !== index);
      onUpdate({ ...workingConfig, responses: newHandlers });
    }
  };

  const handleDuplicate = (index) => {
    const newHandlers = [...handlers];
    const duplicate = JSON.parse(JSON.stringify(handlers[index]));
    newHandlers.splice(index + 1, 0, duplicate);
    onUpdate({ ...workingConfig, responses: newHandlers });
  };

  const handleSaveHandler = (handlerData) => {
    const newHandlers = [...handlers];
    if (editingIndex !== null) {
      // Edit existing handler
      newHandlers[editingIndex] = handlerData;
    } else {
      // Add new handler
      newHandlers.push(handlerData);
    }
    onUpdate({ ...workingConfig, responses: newHandlers });
    setEditingIndex(null);
    setShowAddModal(false);
  };

  const handleCloseModal = () => {
    setEditingIndex(null);
    setShowAddModal(false);
  };

  return (
    <ConfigSection
      title="Response Handlers"
      description="Configure how the system processes and responds to queries. Handlers are evaluated in order (first match wins)."
    >
      <div className="max-w-4xl">
        {/* Info Tip */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Response handlers are evaluated top-to-bottom.
            The first handler whose match criteria are satisfied will be used to generate the response.
            Handlers without match criteria act as catch-all (fallback) and should be placed last.
          </p>
        </div>

        {/* Handler List */}
        {handlers.length > 0 ? (
          <div className="space-y-3 mb-6">
            {handlers.map((handler, index) => (
              <HandlerCard
                key={index}
                handler={handler}
                index={index}
                totalHandlers={handlers.length}
                isCatchAll={!handler.match}
                onEdit={() => setEditingIndex(index)}
                onDelete={() => handleDelete(index)}
                onDuplicate={() => handleDuplicate(index)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                workingConfig={workingConfig}
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded text-center">
            <p className="text-gray-600">No response handlers configured.</p>
          </div>
        )}

        {/* Add Handler Button */}
        {hasLLMs ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + Add Handler
          </button>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Add at least one LLM provider before creating response handlers.
            </p>
          </div>
        )}

        {/* Warnings */}
        <HandlerWarnings handlers={handlers} />

        {/* Modals */}
        {(showAddModal || editingIndex !== null) && (
          <HandlerModal
            handler={editingIndex !== null ? handlers[editingIndex] : null}
            workingConfig={workingConfig}
            onSave={handleSaveHandler}
            onCancel={handleCloseModal}
            modelsCache={modelsCache}
            setModelsCache={setModelsCache}
            fetchModelsForProvider={fetchModelsForProvider}
          />
        )}
      </div>
    </ConfigSection>
  );
}

/**
 * HandlerCard - Display individual handler with actions
 */
function HandlerCard({ handler, index, totalHandlers, isCatchAll, onEdit, onDelete, onDuplicate, onMoveUp, onMoveDown, workingConfig }) {
  const matchSummary = getMatchSummary(handler.match, workingConfig);
  const llmConfig = workingConfig?.llms?.[handler.llm];
  const llmDisplayName = llmConfig?.description || handler.llm;
  
  return (
    <div className={`border rounded-lg p-4 ${isCatchAll ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-300'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-500">Handler #{index + 1}</span>
            {isCatchAll && (
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-semibold rounded">
                CATCH-ALL
              </span>
            )}
          </div>
          <div className="text-sm">
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
              {llmDisplayName}/{handler.model}
            </code>
            {handler.max_tokens && (
              <span className="ml-2 text-xs text-gray-600">
                max: {handler.max_tokens} tokens
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalHandlers - 1}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Duplicate"
          >
            📋
          </button>
          <button
            onClick={onEdit}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Match Criteria */}
      {matchSummary.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-1">Match Criteria:</div>
          <div className="space-y-1">
            {matchSummary.map((criteria, idx) => (
              <div key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>{criteria}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Preview */}
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">Prompt:</div>
        <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded font-mono overflow-hidden">
          {handler.prompt ? (
            handler.prompt.length > 150 ? handler.prompt.slice(0, 150) + '...' : handler.prompt
          ) : (
            <span className="text-gray-400 italic">No prompt configured</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * HandlerWarnings - Display warnings about handler configuration
 */
function HandlerWarnings({ handlers }) {
  const warnings = [];

  // Check if catch-all is not last
  const catchAllIndex = handlers.findIndex(h => !h.match);
  if (catchAllIndex !== -1 && catchAllIndex !== handlers.length - 1) {
    warnings.push({
      type: 'warning',
      message: `Catch-all handler is at position #${catchAllIndex + 1} but should be last. Handlers after it will never be evaluated.`
    });
  }

  // Check for unreachable handlers (basic detection)
  const hasMultipleCatchAlls = handlers.filter(h => !h.match).length > 1;
  if (hasMultipleCatchAlls) {
    warnings.push({
      type: 'error',
      message: 'Multiple catch-all handlers detected. Only the first one will be used.'
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          className={`p-3 rounded border ${
            warning.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{warning.type === 'error' ? '🚫' : '⚠️'}</span>
            <p className="text-sm flex-1">{warning.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get human-readable match criteria summary
 */
function getMatchSummary(match, workingConfig) {
  if (!match) return [];
  
  const summary = [];
  
  if (match.service) {
    const serviceConfig = workingConfig?.rag_services?.[match.service];
    const serviceDisplayName = serviceConfig?.description || match.service;
    let text = `RAG Service: ${serviceDisplayName}`;
    if (match.collection) {
      text += ` → Collection: ${match.collection}`;
    } else if (match.collection_contains) {
      text += ` → Collection contains: "${match.collection_contains}"`;
    }
    summary.push(text);
  }
  
  if (match.intent) {
    const intentDesc = workingConfig?.intent?.detection?.[match.intent];
    summary.push(`Intent: ${match.intent}${intentDesc ? ` (${intentDesc})` : ''}`);
  }
  
  if (match.rag_results) {
    summary.push(`RAG Results: ${match.rag_results}`);
  }
  
  if (match.reasoning) {
    summary.push('Requires: Reasoning enabled');
  }
  
  return summary;
}

export default HandlersSection;

