import React from 'react';
import ConfigSection from '../ConfigSection';

/**
 * IntentSection - Placeholder for Phase 3 intent detection configuration
 */
function IntentSection() {
  return (
    <ConfigSection
      title="Intent Detection"
      description="Configure intent-based routing for smarter query handling."
    >
      <div className="max-w-2xl">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🎯</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Coming in Phase 3
              </h3>
              <p className="text-sm text-purple-800 mb-4">
                The Intent Detection UI is planned for Phase 3 of the Config Builder system.
                This section will allow you to:
              </p>
              <ul className="text-sm text-purple-800 space-y-2 list-disc list-inside">
                <li>Define intent categories (e.g., "technical-question", "greeting", "feedback")</li>
                <li>Configure intent detection models and prompts</li>
                <li>Set confidence thresholds for intent matching</li>
                <li>Route queries to specific handlers based on detected intent</li>
                <li>Test intent detection with sample queries</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-xs text-purple-700">
                  <strong>Current Status:</strong> All queries are handled by the default response handler.
                  Intent-based routing will enable more sophisticated query processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
}

export default IntentSection;

