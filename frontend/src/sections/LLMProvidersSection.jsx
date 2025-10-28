import React from 'react';
import ConfigSection from '../ConfigSection';
import ProviderList from '../ProviderList';

/**
 * LLMProvidersSection - Section for managing LLM providers (OpenAI, Ollama, Gemini, etc.)
 * Phase 2.5: Split from generic ProvidersSection
 */
function LLMProvidersSection({ workingConfig, appliedConfig, onSave, onDelete, onAddLLMProvider, onAddRAGService, onEditProvider }) {
  return (
    <ConfigSection
      title="LLM Providers"
      description="Configure language model providers for generating AI responses. These are the core models that power your chat system."
    >
      <ProviderList
        workingConfig={workingConfig}
        appliedConfig={appliedConfig}
        onSave={onSave}
        onDelete={onDelete}
        onAddLLMProvider={onAddLLMProvider}
        onAddRAGService={onAddRAGService}
        onEditProvider={onEditProvider}
        filterType="llm"
      />
    </ConfigSection>
  );
}

export default LLMProvidersSection;

