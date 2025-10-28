import React from 'react';
import ConfigSection from '../ConfigSection';
import ProviderList from '../ProviderList';

/**
 * ProvidersSection - Wraps the existing ProviderList in ConfigSection layout
 * This is the main section for configuring LLM and RAG providers
 */
function ProvidersSection({ workingConfig, appliedConfig, onSave, onDelete }) {
  return (
    <ConfigSection
      title="Providers"
      description="Configure your LLM and RAG service providers. Add connections, test them, and manage your AI infrastructure."
    >
      <ProviderList
        workingConfig={workingConfig}
        appliedConfig={appliedConfig}
        onSave={onSave}
        onDelete={onDelete}
      />
    </ConfigSection>
  );
}

export default ProvidersSection;

