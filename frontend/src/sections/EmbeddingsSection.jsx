import React from 'react';
import ConfigSection from '../ConfigSection';

/**
 * EmbeddingsSection - Placeholder for Phase 3 embeddings configuration
 */
function EmbeddingsSection() {
  return (
    <ConfigSection
      title="Embeddings"
      description="Configure embedding models for your RAG services."
    >
      <div className="max-w-2xl">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📦</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Coming in Phase 3
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                The Embeddings configuration UI is planned for Phase 3 of the Config Builder system.
                This section will allow you to:
              </p>
              <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                <li>Configure embedding models for vector search</li>
                <li>Select embedding providers (OpenAI, Cohere, local models)</li>
                <li>Set embedding dimensions and parameters</li>
                <li>Test embedding generation</li>
                <li>Manage embedding caching strategies</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Current Status:</strong> RAG services use default embedding configurations.
                  Advanced embedding control will be available in the next phase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

export default EmbeddingsSection;

