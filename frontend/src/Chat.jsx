import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import './Chat.css';
import LogoSection from './LogoSection';
import SessionManagerProvider from './components/SessionManager';
import useSessionManager from './components/useSessionManager';
import ChatHistory from './components/ChatHistory';
import { cleanupEmptySession } from './lib/sessionStorage';

const chatApiUrl = '/chat/api';

const ChatView = ({ uiConfig }) => {
  const navigate = useNavigate();
  
  // Guard: Check if chat is ready (has working LLM + response handlers)
  if (!uiConfig?.hasWorkingProviders) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No LLM Providers Configured</h2>
          <p className="text-gray-600 mb-6">Add and test an LLM provider to start chatting</p>
          <button
            onClick={() => navigate('/config')}
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Configure Providers →
          </button>
        </div>
      </div>
    );
  }
  
  if (!uiConfig?.hasResponseHandlers) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Response Handlers Configured</h2>
          <p className="text-gray-600 mb-6">Response handlers are automatically created when you add your first LLM provider</p>
          <button
            onClick={() => navigate('/config')}
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Configuration →
          </button>
        </div>
      </div>
    );
  }
  
  const {
    activeSession,
    activeSessionId,
    activeMessages,
    addMessage,
    setActiveTopic,
    archiveSession,
    deleteSession,
    importSession,
    createSession,
    switchSession
  } = useSessionManager();
  const [input, setInput] = useState('');
  const [sendButtonText, setSendButtonText] = useState('Send');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryTracker, setRetryTracker] = useState(-1);

  // Check if we should create a new chat after config apply
  useEffect(() => {
    const shouldCreateNew = sessionStorage.getItem('createNewChat') === 'true';
    
    if (shouldCreateNew) {
      sessionStorage.removeItem('createNewChat');
      const newSession = createSession();
      if (newSession) {
        switchSession(newSession.id);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [collections, setCollections] = useState([]);
  const [wrappers, setWrappers] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(new Set());

  const [availableModels, setAvailableModels] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const [loadingModels, setLoadingModels] = useState(false);

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(localStorage.getItem('leftSidebarCollapsed') === 'true');
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(localStorage.getItem('rightSidebarCollapsed') === 'true');

  const LEFT_FULL = 256;
  const RIGHT_FULL = 256;
  const RAIL = 48;
  const leftPx = leftSidebarCollapsed ? RAIL : LEFT_FULL;
  const rightPx = rightSidebarCollapsed ? RAIL : RIGHT_FULL;

  useEffect(() => {
    if (retryTracker === -1) {
      setIsLoading(false);
      setSendButtonText('Send');
    } else {
      const states = ['Sending..', 'Trying again....', 'One more attempt....'];
      setIsLoading(true);
      setSendButtonText(states[retryTracker]);
    }
  }, [retryTracker]);

  const topic = activeSession?.topic || '';

  const previousMessages = useMemo(() => activeMessages.slice(-4), [activeMessages]);

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

  useEffect(() => {
    if (uiConfig) {
      const cols = uiConfig.collections || [];
      const wraps = uiConfig.wrappers || [];
      setCollections(cols);
      setWrappers(wraps);

      if (cols.length > 0) {
        setSelectedCollections(new Set(cols.map(c => `${c.service}:${c.name}`)));
      }

      const modelSelection = uiConfig.modelSelection || { enabled: false, providers: {} };
      if (modelSelection.enabled) {
        const defaults = {};
        const models = {};
        for (const [provider, info] of Object.entries(modelSelection.providers)) {
          if (info.defaultModel) {
            defaults[provider] = info.defaultModel;
            models[provider] = info.models;
          }
          if (info.reasoningEnabled) {
            defaults[`${provider}_reasoning`] = '';
            models[`${provider}_reasoning`] = info.reasoningModels;
          }
        }
        setSelectedModels(defaults);
        setAvailableModels(models);
      }
      setLoadingModels(false);
    }
  }, [uiConfig]);

  const handleSend = async (retryCount = 0) => {
    if (!input.trim()) return;
    const inputText = input.trim();
    const userMessage = { type: 'user', text: inputText, topic };
    addMessage(userMessage, activeSessionId);
    setInput('');
    setRetryTracker(retryCount);

    try {
      const selectedCollectionsArray = Array.from(selectedCollections).map(key => {
        const [service, name] = key.split(':');
        return { service, name };
      });
      const payload = { prompt: inputText, previousMessages, retryCount, selectedCollections: selectedCollectionsArray, selectedModels, topic };
      const response = await fetch(chatApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();

      if (response.status === 429) {
        const retryAfter = data.retryAfter || 5;
        if (retryCount < 2) {
          setRetryTracker(retryCount + 1);
          setTimeout(() => handleSend(retryCount + 1), retryAfter * 1000);
          return;
        }
        setErrorMessage('The AI assistant is currently busy. Please try again later.');
        setRetryTracker(-1);
        return;
      }
      if (data.response) {
        addMessage({
          type: 'bot',
          text: data.response,
          topic: data.topic,
          service: data.service,
          model: data.model
        }, activeSessionId);
        setRetryTracker(-1);
      }
      if (data.topic) setActiveTopic(data.topic);
    } catch (err) {
      console.error('Error sending message:', err);
      setErrorMessage('Network error. Please try again.');
      setRetryTracker(-1);
    }
  };

  const handleArchiveCurrent = () => {
    if (!activeSessionId) return;
    const confirmed = window.confirm('Archive this conversation? You can restore it from chat history.');
    if (!confirmed) return;
    archiveSession(activeSessionId, true);
  };

  const handleDeleteCurrent = () => {
    if (!activeSessionId || !activeSession) return;
    const confirmed = window.confirm(`Delete conversation "${activeSession.title || 'Untitled conversation'}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteSession(activeSessionId);
  };

  const handleExportSession = (session) => {
    if (!session) return;
    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      session
    };
    const rawSlug = (session.topic || session.title || 'conversation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const topicSlug = rawSlug || 'conversation';
    const filename = `flex-chat-session-${topicSlug}.json`;

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const extractSessionPayload = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Imported file must contain a JSON object');
    }

    if (data.session && typeof data.session === 'object') {
      return data.session;
    }

    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
      return data.sessions[0];
    }

    if (data.id && Array.isArray(data.messages)) {
      return data;
    }

    throw new Error('Unsupported session file format');
  };

  const handleImportSessions = async (files) => {
    const fileList = Array.isArray(files) ? files : files ? [files] : [];
    if (fileList.length === 0) return;

    const successes = [];
    for (const file of fileList) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const sessionPayload = extractSessionPayload(parsed);
        const result = importSession(sessionPayload);
        const title = result.session?.title || 'Conversation';
        successes.push(`${title}${result.conflictResolved ? ' (duplicate ID resolved)' : ''}`);
      } catch (error) {
        console.error('Failed to import session from file', file?.name, error);
        window.alert(`Failed to import "${file?.name || 'session'}": ${error.message}`);
      }
    }

    if (successes.length > 0) {
      const summary = successes.map((title) => `• ${title}`).join('\n');
      window.alert(`Imported ${successes.length} session${successes.length === 1 ? '' : 's'}:\n${summary}`);
    }
  };

  if (!activeSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
        Initializing chat history...
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-gray-50"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: `${leftPx}px 1fr ${rightPx}px`,
        transition: 'grid-template-columns 300ms ease'
      }}
    >
      <div className="col-span-3">
        <LogoSection />
      </div>

      {/* Left Sidebar */}
      <aside className="relative bg-white border-r border-gray-200 overflow-y-auto">
        <button
          className="edge-toggle edge-toggle-right"
          onClick={toggleLeftSidebar}
          title={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {leftSidebarCollapsed ? '→' : '←'}
        </button>
        <div className={leftSidebarCollapsed ? 'hidden' : 'flex flex-col h-full px-4 pb-4 pt-14 overflow-y-auto'}>
          {/* Full sidebar content preserved */}
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
                      <label className="block text-xs text-gray-600 mb-1 capitalize">
                        {provider} - Response Model
                      </label>
                      <select
                        value={selectedModels[provider]}
                        onChange={(e) => setSelectedModels({ ...selectedModels, [provider]: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        disabled={loadingModels}
                      >
                        {availableModels[provider]?.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        )) || (
                          <option value={selectedModels[provider]}>{selectedModels[provider]}</option>
                        )}
                      </select>

                      {hasReasoning && (
                        <>
                          <label className="block text-xs text-gray-600 mb-1 capitalize">
                            {provider} - Reasoning Model
                          </label>
                          <select
                            value={selectedModels[reasoningKey]}
                            onChange={(e) => setSelectedModels({ ...selectedModels, [reasoningKey]: e.target.value })}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loadingModels}
                          >
                            <option value="">(None - use response model)</option>
                            {availableModels[reasoningKey]?.map(model => (
                              <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1 italic">🧠 Used for complex queries</p>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Collections */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Collections</h3>
          {wrappers.length > 0 ? (
            wrappers.map((wrapper) => {
              const wrapperCollections = collections.filter(c => c.service === wrapper.name);
              return (
                <div key={wrapper.name} className="mb-4">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-600">{wrapper.name}</h4>
                    {!wrapper.collection && (
                      <button
                        onClick={() => navigate(`/collections?wrapper=${wrapper.name}`)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                        title="Manage collections for this service"
                      >
                        → Manage
                      </button>
                    )}
                  </div>

                  {wrapperCollections.length > 0 ? (
                    <div className="space-y-2">
                      {wrapperCollections.map((collection) => {
                        const collectionKey = `${collection.service}:${collection.name}`;
                        return (
                          <label
                            key={collectionKey}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedCollections.has(collectionKey)
                                ? 'bg-blue-50 border-2 border-blue-400'
                                : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                            title={`${collection.metadata?.display_name || collection.name} (${collection.service})`}
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
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-800">📚 {collection.metadata?.display_name || collection.name}</div>
                                  <div className="text-xs text-gray-500">{collection.count} docs</div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/collections?wrapper=${collection.service}`);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 ml-2 px-2 py-1"
                                  title="Edit this collection"
                                >
                                  ✏️ Edit
                                </button>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic ml-2">No collections yet</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 italic">No wrapper services configured</p>
          )}
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex flex-col bg-white h-full overflow-y-auto">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-40">
          <div className="max-w-6xl mx-auto px-4">
            {activeMessages.map((message, index) => (
              <div key={`${message.timestamp || index}-${index}`} className={`message-container ${message.type}`}>
                <div className={`${message.type}-message`}>
                  {message.type === 'bot' ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                      {(message.topic || message.service) && (
                        <div className="topic-badge">
                          {message.topic && <span>{message.topic}</span>}
                          {message.service && message.model && (
                            <span className="text-gray-400">
                              {message.topic && ' · '}via {message.service} / {message.model}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    message.text.split('\n').map((line, idx) => (
                      <span key={idx}>{line}<br /></span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {errorMessage && (
          <div className="p-3 mb-2 bg-red-100 border border-red-400 text-red-700 rounded-lg fixed bottom-[180px] left-1/2 -translate-x-1/2 max-w-md shadow-lg">
            {errorMessage}
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="relative bg-white border-l border-gray-200 overflow-y-auto">
        <button className="edge-toggle edge-toggle-left" onClick={toggleRightSidebar} title={rightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {rightSidebarCollapsed ? '←' : '→'}
        </button>
        <div className={rightSidebarCollapsed ? 'hidden' : 'px-4 pb-4 pt-14 h-full overflow-y-auto'}>
          <ChatHistory onExportSession={handleExportSession} onImportSessions={handleImportSessions} />
        </div>
      </aside>

      {/* Input */}
      <div className="fixed bottom-0 bg-white border-t border-gray-200" style={{ left: leftPx, right: rightPx }}>
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handleArchiveCurrent}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Archive Session
            </button>
            <button
              onClick={handleDeleteCurrent}
              className="text-sm text-red-500 hover:text-red-600 underline"
            >
              Delete Session
            </button>
            {topic && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-1">
                  <span className="opacity-60">Topic:</span>
                  <span className="font-medium text-gray-600">{topic}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(0);
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
              onClick={() => handleSend(0)}
              disabled={isLoading}
            >
              {sendButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Chat = ({ uiConfig }) => (
  <SessionManagerProvider>
    <ChatView uiConfig={uiConfig} />
  </SessionManagerProvider>
);

export default Chat;
