import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
// import 'highlight.js/styles/github.css';
import './Chat.css';
import NavBar from './NavBar';
import LogoSection from './LogoSection';

const chatApiUrl = '/chat/api';

const Chat = () => {
  const [messages, setMessages] = useState(JSON.parse(localStorage.getItem('chatMessages')) || [
    { type: 'bot', text: 'Hello! I\'m your AI assistant. How can I help you today?' }
  ]);

  const [input, setInput] = useState('');
  const [sendButtonText, setSendButtonText] = useState('Send');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryTracker, setRetryTracker] = useState(-1);
  
  // Collection management
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(new Set());
  const [showCollections, setShowCollections] = useState(false);

  // Model selection
  const [availableModels, setAvailableModels] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const [loadingModels, setLoadingModels] = useState(false);

  // Sidebar collapse state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(
    localStorage.getItem('leftSidebarCollapsed') === 'true'
  );
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(
    localStorage.getItem('rightSidebarCollapsed') === 'true'
  );

  useEffect(() => {
    if (retryTracker === -1) {
      setIsLoading(false);
      setSendButtonText('Send')
    } else {
      console.log({ retryTracker });
      const buttonStates = ['Sending..', 'Trying again....', 'One more attempt....'];
      setIsLoading(true);
      setSendButtonText(buttonStates[retryTracker]);
    }
  }, [retryTracker]);

  // Toggle sidebar functions
  const toggleLeftSidebar = () => {
    const newState = !leftSidebarCollapsed;
    setLeftSidebarCollapsed(newState);
    localStorage.setItem('leftSidebarCollapsed', newState.toString());
  };

  const toggleRightSidebar = () => {
    const newState = !rightSidebarCollapsed;
    setRightSidebarCollapsed(newState);
    localStorage.setItem('rightSidebarCollapsed', newState.toString());
  };

  // Load available collections on mount
  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(data => {
        const cols = data.collections || [];
        setCollections(cols);
        // Select all by default - store as "knowledgeBase:name" string
        setSelectedCollections(new Set(cols.map(c => `${c.knowledgeBase}:${c.name}`)));
        setShowCollections(cols.length > 0);
      })
      .catch(err => console.error('Error loading collections:', err));
  }, []);

  // Load model selection configuration on mount
  useEffect(() => {
    const loadModelSelection = async () => {
      try {
        setLoadingModels(true);
        
        // Check sessionStorage for cached model data
        const cachedData = sessionStorage.getItem('modelSelectionData');
        if (cachedData) {
          try {
            const { defaults, models } = JSON.parse(cachedData);
            setSelectedModels(defaults);
            setAvailableModels(models);
            setLoadingModels(false);
            console.log('📦 Using cached model selection data');
            return;
          } catch (e) {
            console.warn('Failed to parse cached model data, refetching...');
          }
        }
        
        // Fetch from API if not cached
        const res = await fetch('/api/config/model-selection');
        const data = await res.json();
        
        if (!data.enabled || Object.keys(data.providers).length === 0) {
          setLoadingModels(false);
          return; // No model selection enabled
        }
        
        // Extract defaults and available models from response
        const defaults = {};
        const models = {};
        
        for (const [provider, info] of Object.entries(data.providers)) {
          // Response models
          if (info.defaultModel) {
            defaults[provider] = info.defaultModel;
            models[provider] = info.models;
          }
          
          // Reasoning models
          if (info.reasoningEnabled) {
            defaults[`${provider}_reasoning`] = ''; // Empty string = (None)
            models[`${provider}_reasoning`] = info.reasoningModels;
          }
        }
        
        // Cache the data in sessionStorage
        sessionStorage.setItem('modelSelectionData', JSON.stringify({ defaults, models }));
        
        setSelectedModels(defaults);
        setAvailableModels(models);
        setLoadingModels(false);
      } catch (error) {
        console.error('Error loading model selection:', error);
        setLoadingModels(false);
      }
    };
    
    loadModelSelection();
  }, []);

  const handleSend = async (retryCount = 0, event) => {
    if (input.trim()) {
      const inputText = input.trim();
      const userMessage = { type: 'user', text: inputText };
      setMessages([...messages, userMessage]);
      setInput('');

      setRetryTracker(retryCount);

      try {
        const previousMessages = messages.slice(3).slice(-5).slice(0,4);

        // Convert selected collections to proper format: { knowledgeBase, collection }
        const selectedCollectionsArray = Array.from(selectedCollections).map(key => {
          const [knowledgeBase, name] = key.split(':');
          return { knowledgeBase, collection: name };
        });

        const promptWithContext = {
          prompt: inputText,
          previousMessages,
          retryCount,
          selectedCollections: selectedCollectionsArray,
          selectedModels
        };

        const response = await fetch(chatApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(promptWithContext)
        });

        const data = await response.json();

        if (response.status === 429) {
          const retryAfter = data.retryAfter || 5;
          console.warn(`Too many requests. Retrying after ${retryAfter} seconds.`);

          if (retryCount < 2) {
            setRetryTracker(retryCount + 1);
            setTimeout(() => handleSend(retryCount + 1), retryAfter * 1000);
            return;
          } else {
            setErrorMessage('The AI assistant is currently busy. Please try again later.');
            setRetryTracker(-1);
            return;
          }
        }

        if (data.response) {
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, { type: 'bot', text: data.response }];
            localStorage.setItem('chatMessages', JSON.stringify(updatedMessages.slice(-50)));
            setRetryTracker(-1);
            return updatedMessages;
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        setErrorMessage('Network error. Please try again.');
        setRetryTracker(-1);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <LogoSection />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Settings & Collections */}
        <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${
          leftSidebarCollapsed ? 'w-12' : 'w-64'
        }`}>
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
            {!leftSidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
            )}
            <button
              onClick={toggleLeftSidebar}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {leftSidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          <div className={`flex-1 overflow-y-auto pb-64 ${leftSidebarCollapsed ? 'hidden' : 'p-4'}`}>
            {/* Model Selection */}
            {Object.keys(selectedModels).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Model Selection</h3>
                {Object.keys(selectedModels)
                  .filter(key => !key.includes('_reasoning'))
                  .map(provider => {
                    const reasoningKey = `${provider}_reasoning`;
                    const hasReasoning = selectedModels[reasoningKey] !== undefined;
                    
                    return (
                      <div key={provider} className="mb-4">
                        {/* Response Model */}
                        <label className="block text-xs text-gray-600 mb-1 capitalize">
                          {provider} - Response Model
                        </label>
                        <select
                          value={selectedModels[provider]}
                          onChange={(e) => {
                            setSelectedModels({
                              ...selectedModels,
                              [provider]: e.target.value
                            });
                          }}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                          disabled={loadingModels}
                        >
                          {availableModels[provider]?.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          )) || (
                            <option value={selectedModels[provider]}>
                              {selectedModels[provider]}
                            </option>
                          )}
                        </select>
                        
                        {/* Reasoning Model (if enabled) */}
                        {hasReasoning && (
                          <>
                            <label className="block text-xs text-gray-600 mb-1 capitalize">
                              {provider} - Reasoning Model
                            </label>
                            <select
                              value={selectedModels[reasoningKey]}
                              onChange={(e) => {
                                setSelectedModels({
                                  ...selectedModels,
                                  [reasoningKey]: e.target.value
                                });
                              }}
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={loadingModels}
                            >
                              <option value="">(None - use response model)</option>
                              {availableModels[reasoningKey]?.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1 italic">
                              🧠 Used for complex queries
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Collections */}
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Collections</h3>
            {showCollections && collections.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-600">Search in:</span>
                  <button
                    onClick={() => {
                      if (selectedCollections.size === collections.length) {
                        setSelectedCollections(new Set());
                      } else {
                        setSelectedCollections(new Set(collections.map(c => `${c.knowledgeBase}:${c.name}`)));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedCollections.size === collections.length ? 'None' : 'All'}
                  </button>
                </div>
                <div className="space-y-2">
                  {collections.map((collection) => {
                    const collectionKey = `${collection.knowledgeBase}:${collection.name}`;
                    return (
                      <label
                        key={collectionKey}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCollections.has(collectionKey)
                            ? 'bg-blue-50 border-2 border-blue-400'
                            : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                        title={`${collection.name} (${collection.knowledgeBase})`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCollections.has(collectionKey)}
                          onChange={(e) => {
                            const newSet = new Set(selectedCollections);
                            if (e.target.checked) {
                              newSet.add(collectionKey);
                            } else {
                              newSet.delete(collectionKey);
                            }
                            setSelectedCollections(newSet);
                          }}
                          className="mr-3"
                        />
                        <div className="flex-grow">
                          <div className="text-sm font-medium text-gray-800">📚 {collection.name}</div>
                          <div className="text-xs text-gray-500">{collection.count} docs • {collection.knowledgeBase}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">No collections available</p>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Chat messages container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-64">
            <div className="max-w-6xl mx-auto px-4">
              {messages.map((message, index) => (
                <div key={index} className={`message-container ${message.type}`}>
                  <div className={`${message.type}-message`}>
                    {message.type === 'bot' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.text.split('\n').map((line, idx) => (
                        <span key={idx}>
                          {line}
                          <br />
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 mb-2 bg-red-100 border border-red-400 text-red-700 rounded-lg fixed bottom-[180px] left-1/2 -translate-x-1/2 max-w-md shadow-lg">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat History */}
        <div className={`bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-300 ${
          rightSidebarCollapsed ? 'w-12' : 'w-64'
        }`}>
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
            <button
              onClick={toggleRightSidebar}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title={rightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {rightSidebarCollapsed ? '←' : '→'}
            </button>
            {!rightSidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
            )}
          </div>
          <div className={`flex-1 flex items-center justify-center pb-64 overflow-y-auto ${
            rightSidebarCollapsed ? 'hidden' : 'p-4'
          }`}>
            <p className="text-sm text-gray-400 italic">Coming soon...</p>
          </div>
        </div>
      </div>

      {/* Chat input and send button */}
      <div className="fixed bottom-16 left-0 right-0 bg-gray-50">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => {
                if (messages.length > 0 && window.confirm('Are you sure you want to clear the chat history?')) {
                  setMessages([]);
                  setInput('');
                  setErrorMessage('');
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear Chat
            </button>
          </div>
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(0, e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              aria-label="Chat input area"
              className="flex-grow p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              disabled={isLoading}
            />
            <button
              className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => handleSend(0, e)}
              disabled={isLoading}
            >
              {sendButtonText}
            </button>
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  );
};

export default Chat;
