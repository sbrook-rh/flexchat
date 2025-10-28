import React from 'react';
import ConfigSection from '../ConfigSection';
import ProviderList from '../ProviderList';

/**
 * RAGServicesSection - Section for managing RAG service providers (ChromaDB, etc.)
 * Phase 2.5: Split from generic ProvidersSection
 */
function RAGServicesSection({ workingConfig, appliedConfig, onSave, onDelete, onAddLLMProvider, onAddRAGService, onEditProvider }) {
  return (
    <ConfigSection
      title="RAG Services"
      description="Configure Retrieval-Augmented Generation (RAG) services for context-aware responses. Connect to vector databases and knowledge sources."
    >
      <ProviderList
        workingConfig={workingConfig}
        appliedConfig={appliedConfig}
        onSave={onSave}
        onDelete={onDelete}
        onAddLLMProvider={onAddLLMProvider}
        onAddRAGService={onAddRAGService}
        onEditProvider={onEditProvider}
        filterType="rag"
      />
    </ConfigSection>
  );
}

export default RAGServicesSection;

