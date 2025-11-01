import React from 'react';
import ConfigSection from '../ConfigSection';
import LLMProviderList from '../LLMProviderList';

/**
 * LLMProvidersSection - Section for managing LLM providers (OpenAI, Ollama, Gemini, etc.)
 * Phase 2.5: Split from generic ProvidersSection
 * Refactor: Updated to use dedicated LLMProviderList component
 */
function LLMProvidersSection({ workingConfig, onAddLLMProvider, onEditLLMProvider, onDeleteLLMProvider }) {
  return (
    <ConfigSection
      title="LLM Providers"
      description="Configure language model providers for generating AI responses. These are the core models that power your chat system."
    >
      <LLMProviderList
        workingConfig={workingConfig}
        onAddLLMProvider={onAddLLMProvider}
        onEditLLMProvider={onEditLLMProvider}
        onDeleteLLMProvider={onDeleteLLMProvider}
      />
    </ConfigSection>
  );
}

export default LLMProvidersSection;

