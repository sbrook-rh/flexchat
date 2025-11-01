import React, { useMemo, useState } from 'react';
import useSessionManager from './useSessionManager';
import { cleanupEmptySession } from '../lib/sessionStorage';

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
};

const formatMessageCount = (count) => {
  if (!count) return 'No messages yet';
  if (count === 1) return '1 message';
  return `${count} messages`;
};

const ActionButton = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="pointer-events-auto rounded-md p-1 text-gray-500 transition hover:bg-white/80 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
    title={label}
    aria-label={label}
  >
    {children}
  </button>
);

const ChatHistory = ({ onExportSession, onImportSessions }) => {
  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    archiveSession,
    deleteSession,
    renameSession,
    storageUsage
  } = useSessionManager();

  const [isImporting, setIsImporting] = useState(false);

  const { activeSessions, archivedSessions } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      activeSessions: sorted.filter((session) => !session.archived),
      archivedSessions: sorted.filter((session) => session.archived)
    };
  }, [sessions]);

  const handleSwitchSession = (targetSessionId) => {
    // Cleanup current session if it's empty before switching
    if (activeSessionId && activeSessionId !== targetSessionId) {
      cleanupEmptySession(activeSessionId);
    }
    switchSession(targetSessionId);
  };

  const handleCreateSession = () => {
    const newSession = createSession();
    if (newSession) {
      handleSwitchSession(newSession.id);
    }
  };

  const handleRename = (session) => {
    const nextTitle = window.prompt('Rename conversation', session.title ?? 'Conversation');
    if (nextTitle && nextTitle.trim() && nextTitle.trim() !== session.title) {
      renameSession(session.id, nextTitle.trim());
    }
  };

  const handleArchiveToggle = (session) => {
    archiveSession(session.id, !session.archived);
  };

  const handleDelete = (session) => {
    const confirmed = window.confirm(`Delete conversation "${session.title}"? This cannot be undone.`);
    if (confirmed) {
      deleteSession(session.id);
    }
  };

  const handleExport = (session) => {
    if (onExportSession) {
      onExportSession(session);
    }
  };

  const handleImport = async (event) => {
    if (!onImportSessions) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsImporting(true);
    try {
      await onImportSessions(files);
    } finally {
      setIsImporting(false);
      // reset input so same file can be selected again later
      event.target.value = '';
    }
  };

  const renderSessionRow = (session) => {
    const isActive = session.id === activeSessionId;

    return (
      <div
        key={session.id}
        className={`group relative cursor-pointer rounded-lg border px-3 py-2 transition-colors ${
          isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onClick={() => handleSwitchSession(session.id)}
      >
        <div className="pr-10">
          <div className="text-sm font-semibold text-gray-800 truncate" title={session.title}>
            {session.title || 'Untitled conversation'}
          </div>
          <div className="text-xs text-gray-500">
            {formatMessageCount(session.metadata?.messageCount)} · Updated {formatRelativeTime(session.updatedAt)}
          </div>
        </div>
        <div
          className="pointer-events-none absolute top-1.5 right-1.5 flex gap-1 rounded-md bg-white/60 p-1 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionButton label="Rename conversation" onClick={() => handleRename(session)}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-7.778 7.778a1 1 0 0 1-.414.242l-3.11.777a.5.5 0 0 1-.606-.606l.777-3.11a1 1 0 0 1 .242-.414l7.778-7.778Z" />
              <path d="M12.172 2.172a4 4 0 1 1 5.657 5.657l-7.778 7.778a3 3 0 0 1-1.242.727l-3.11.777a2.5 2.5 0 0 1-3.03-3.03l.777-3.11a3 3 0 0 1 .727-1.242l7.778-7.778Z" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </ActionButton>
          <ActionButton label={session.archived ? 'Restore conversation' : 'Archive conversation'} onClick={() => handleArchiveToggle(session)}>
            {session.archived ? (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-.293.707L15 8.414V15a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V8.414L2.293 6.707A1 1 0 0 1 2 6V3Zm6 0v4h2V3H9Zm-2 10a1 1 0 1 1 2 0v2h2v-2a1 1 0 1 1 2 0v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2Z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-.293.707l-7 7a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6V3Zm2 1v1.586L10 10.586 15 5.586V4H5Zm3 12a2 2 0 0 1-2-2v-1h2v1h4v-1h2v1a2 2 0 0 1-2 2H8Z" />
              </svg>
            )}
          </ActionButton>
          <ActionButton label="Export conversation" onClick={() => handleExport(session)}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 3a1 1 0 0 1 1 1v6.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 1.414-1.414L9 10.586V4a1 1 0 0 1 1-1Z" />
              <path d="M4 13a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1a2 2 0 0 0-2-2h-1a1 1 0 1 0 0 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1a1 1 0 1 0 0-2H4Z" />
            </svg>
          </ActionButton>
          <ActionButton label="Delete conversation" onClick={() => handleDelete(session)}>
            <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2h3a1 1 0 1 1 0 2h-1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4H3a1 1 0 1 1 0-2h3Zm10 2H4v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4ZM8 6a1 1 0 0 1 1 1v6a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v6a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1Z" />
            </svg>
          </ActionButton>
        </div>
        {session.topic && (
          <div className="mt-1 text-xs text-gray-400 truncate" title={session.topic}>
            Topic: {session.topic}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
        <button
          type="button"
          onClick={handleCreateSession}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
        >
          + New Chat
        </button>
      </div>

      {storageUsage.nearQuota && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          Storage nearly full ({(storageUsage.usageRatio * 100).toFixed(0)}% of ~{Math.round(storageUsage.estimatedQuotaBytes / (1024 * 1024))}MB). Export or archive old sessions.
        </div>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto">
        {activeSessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          activeSessions.map(renderSessionRow)
        )}

        {archivedSessions.length > 0 && (
          <details className="rounded-lg border border-gray-200 bg-white" open>
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700">
              Archived ({archivedSessions.length})
            </summary>
            <div className="flex flex-col gap-2 border-t border-gray-100 px-3 py-2">
              {archivedSessions.map(renderSessionRow)}
            </div>
          </details>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 text-xs text-gray-500">
        <div>
          Storage usage: {(storageUsage.megabytesUsed).toFixed(2)} MB of ~{Math.round(storageUsage.estimatedQuotaBytes / (1024 * 1024))} MB
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="chat-history-import"
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Import
          </label>
          <input
            id="chat-history-import"
            type="file"
            accept="application/json"
            className="hidden"
            multiple
            disabled={isImporting}
            onChange={handleImport}
          />
          {isImporting && <span className="text-blue-500">Importing…</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
