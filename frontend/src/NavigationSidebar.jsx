import React from 'react';

/**
 * NavigationSidebar - Vertical tab navigation for Configuration Builder
 * 
 * @param {Object} props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Callback when tab is clicked
 * @param {Object} props.tabStates - Object containing enabled/badge state for each tab
 * @param {boolean} props.tabStates.embeddings.enabled
 * @param {boolean} props.tabStates.intent.enabled
 * @param {boolean} props.tabStates.reasoning.enabled
 * @param {Object} props.tabStates.badges - Badge counts for each tab
 */
function NavigationSidebar({ activeTab, onTabChange, tabStates }) {
  const tabs = [
    {
      id: 'llm-providers',
      label: 'LLM Providers',
      icon: '🤖',
      enabled: true, // Always enabled
      tooltip: null,
      badge: tabStates.badges.llmProviders,
      description: 'Language models'
    },
    {
      id: 'rag-services',
      label: 'RAG Services',
      icon: '📚',
      enabled: true, // Always enabled
      tooltip: null,
      badge: tabStates.badges.ragServices,
      description: 'Knowledge sources'
    },
    {
      id: 'topic',
      label: 'Topic Detection',
      icon: '🎯',
      enabled: tabStates.topic.enabled,
      tooltip: tabStates.topic.enabled ? null : 'Configure at least one LLM Provider first',
      badge: null,
      description: 'Conversation topics'
    },
    {
      id: 'intent',
      label: 'Intent',
      icon: '🧐',
      enabled: tabStates.intent.enabled,
      tooltip: tabStates.intent.enabled ? null : 'Configure at least one LLM Provider first',
      badge: null, // Phase 3
      description: 'Intent classification'
    },
    {
      id: 'handlers',
      label: 'Handlers',
      icon: '🔀',
      enabled: true, // Always enabled
      tooltip: null,
      badge: tabStates.badges.handlers,
      description: 'Response handlers'
    },
    {
      id: 'reasoning',
      label: 'Reasoning',
      icon: '🧠',
      enabled: tabStates.reasoning.enabled,
      tooltip: tabStates.reasoning.enabled ? null : 'Configure at least one Response Handler first',
      badge: null, // Phase 5
      description: 'Advanced reasoning'
    }
  ];

  const handleTabClick = (tab) => {
    if (tab.enabled) {
      onTabChange(tab.id);
    }
  };

  return (
    <nav className="flex flex-col bg-gray-50 border-r border-gray-200 h-full" style={{ width: '220px' }}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Configuration</h2>
      </div>
      
      <div className="flex-1 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !tab.enabled;
          
          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => handleTabClick(tab)}
                disabled={isDisabled}
                title={tab.tooltip || ''}
                className={`
                  w-full text-left px-4 py-3 flex items-center gap-3
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900 font-semibold'
                    : isDisabled
                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : 'text-gray-700 hover:bg-gray-100 border-l-4 border-transparent hover:border-gray-300'
                  }
                `}
              >
                {/* Icon */}
                <span className="text-xl flex-shrink-0" style={{ width: '24px', textAlign: 'center' }}>
                  {tab.icon}
                </span>
                
                {/* Label and Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                    
                    {/* Badge */}
                    {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`
                        inline-flex items-center justify-center
                        min-w-[20px] h-5 px-1.5
                        text-xs font-medium rounded-full
                        ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-500 text-white'
                        }
                      `}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xs mt-0.5 ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                    {tab.description}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Footer hint */}
      <div className="p-4 border-t border-gray-200 bg-gray-100">
        <p className="text-xs text-gray-500">
          💡 <span className="font-medium">Tip:</span> Changes aren't saved until you click <strong>Apply</strong>
        </p>
      </div>
    </nav>
  );
}

export default NavigationSidebar;

