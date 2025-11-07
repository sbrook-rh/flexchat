import React from 'react';
import ConfigSection from '../ConfigSection';

/**
 * HandlersSection - Placeholder for Phase 4 response handlers configuration
 */
function HandlersSection({ workingConfig }) {
  const handlerCount = workingConfig?.responses?.length || 0;
  // Find the default handler (the one without a "match" key)
  const defaultIndex = workingConfig?.responses?.findIndex(r => !r.match) ?? -1;
  
  return (
    <ConfigSection
      title="Response Handlers"
      description="Configure how the system processes and responds to queries."
    >
      <div className="max-w-2xl">
        {/* Current Handlers Summary */}
        {handlerCount > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 mb-2">
              ✅ {handlerCount} Response Handler{handlerCount !== 1 ? 's' : ''} Configured
            </h4>
            <div className="space-y-2">
              {workingConfig.responses.map((handler, idx) => (
                <div key={idx} className="text-sm text-green-800">
                  <code className="bg-green-100 px-2 py-0.5 rounded font-mono text-xs">
                    {handler.llm}/{handler.model}
                  </code>
                  {idx === defaultIndex && <span className="ml-2 text-xs text-green-600">(default)</span>}
                  {handler.match && <span className="ml-2 text-xs text-green-700">(conditional)</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Phase 4 Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🔀</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Full Management Coming in Phase 4
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                The Response Handlers management UI is planned for Phase 4 of the Config Builder system.
                This section will allow you to:
              </p>
              <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                <li>Create and edit multiple response handlers</li>
                <li>Configure prompts, temperature, and token limits per handler</li>
                <li>Set up RAG integration for specific handlers</li>
                <li>Define handler priority and fallback chains</li>
                <li>Test handlers with sample queries</li>
                <li>Enable/disable handlers without deleting them</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs text-amber-700">
                  <strong>Current Status:</strong> Response handlers are auto-created when you add LLM providers.
                  You can manually edit the configuration file for advanced setups, or wait for Phase 4 UI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

export default HandlersSection;

