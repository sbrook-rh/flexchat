import React from 'react';
import ConfigSection from '../ConfigSection';
import RAGProviderList from '../RAGProviderList';

/**
 * RAGServicesSection - Section for managing RAG service providers (ChromaDB, etc.)
 * Phase 2.5: Split from generic ProvidersSection
 * Refactor: Updated to use dedicated RAGProviderList component
 */
function RAGServicesSection({ workingConfig, onAddRAGService, onEditRAGService, onDeleteRAGService }) {
  return (
    <ConfigSection
      title="RAG Services"
      description="Configure Retrieval-Augmented Generation (RAG) services for context-aware responses. Connect to vector databases and knowledge sources."
    >
      <RAGProviderList
        workingConfig={workingConfig}
        onAddRAGService={onAddRAGService}
        onEditRAGService={onEditRAGService}
        onDeleteRAGService={onDeleteRAGService}
      />
    </ConfigSection>
  );
}

export default RAGServicesSection;

