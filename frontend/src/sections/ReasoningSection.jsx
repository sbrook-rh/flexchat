import React from 'react';
import ConfigSection from '../ConfigSection';

/**
 * ReasoningSection - Placeholder for Phase 5 reasoning configuration
 */
function ReasoningSection() {
  return (
    <ConfigSection
      title="Reasoning"
      description="Configure advanced reasoning capabilities for complex queries."
    >
      <div className="max-w-2xl">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🧠</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Coming in Phase 5
              </h3>
              <p className="text-sm text-indigo-800 mb-4">
                The Reasoning configuration UI is planned for Phase 5 of the Config Builder system.
                This section will allow you to:
              </p>
              <ul className="text-sm text-indigo-800 space-y-2 list-disc list-inside">
                <li>Enable chain-of-thought reasoning for complex queries</li>
                <li>Configure multi-step reasoning workflows</li>
                <li>Set up reasoning verification and self-correction</li>
                <li>Define reasoning strategies per intent or query type</li>
                <li>Monitor reasoning token usage and costs</li>
                <li>Integrate with specialized reasoning models</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <p className="text-xs text-indigo-700">
                  <strong>Current Status:</strong> Reasoning features are under development.
                  This will enable advanced capabilities like multi-hop question answering
                  and complex problem-solving workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

export default ReasoningSection;

