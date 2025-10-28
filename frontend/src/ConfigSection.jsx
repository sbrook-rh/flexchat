import React from 'react';

/**
 * ConfigSection - Reusable wrapper for configuration sections
 * Provides consistent layout, styling, and header for all config sections
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description/subtitle
 * @param {React.ReactNode} props.children - Section content
 * @param {React.ReactNode} props.actions - Optional header actions (buttons, etc.)
 */
function ConfigSection({ title, description, children, actions }) {
  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          
          {actions && (
            <div className="ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}

export default ConfigSection;

