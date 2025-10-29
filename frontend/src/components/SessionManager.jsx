import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  STORAGE_KEY,
  ensureSnapshot,
  ensureActiveSession,
  persistSnapshot,
  createSession as createSessionSnapshot,
  deleteSessionById,
  archiveSessionById,
  renameSession,
  updateSessionTopic,
  setActiveSession,
  addMessageToSnapshot,
  createEmptySession,
  getApproximateStorageUsage,
  STORAGE_WARNING_THRESHOLD,
  importSessionIntoSnapshot
} from '../lib/sessionStorage';
import SessionManagerContext from './sessionManagerContext';

const createInitialState = () => ensureActiveSession(ensureSnapshot());

const SessionManagerProvider = ({ children }) => {
  const [snapshot, setSnapshot] = useState(createInitialState);
  const [storageUsage, setStorageUsage] = useState(getApproximateStorageUsage);
  const [lastMigrationNoticeAt, setLastMigrationNoticeAt] = useState(null);

  const hydrateSnapshot = useCallback(() => {
    const next = ensureActiveSession(ensureSnapshot());
    setSnapshot(next);
    setStorageUsage(getApproximateStorageUsage());
    return next;
  }, []);

  useEffect(() => {
    hydrateSnapshot();
  }, [hydrateSnapshot]);

  const applyAndPersist = useCallback((updater) => {
    const { snapshot: next, success, error } = persistSnapshot((current) => {
      const base = ensureActiveSession(current);
      const updated = typeof updater === 'function' ? updater(base) : updater;
      return ensureActiveSession(updated);
    });

    setSnapshot(next);
    setStorageUsage(getApproximateStorageUsage());

    return { snapshot: next, success, error };
  }, []);

  const createSession = useCallback((options = {}) => {
    const { snapshot: next } = applyAndPersist((state) => createSessionSnapshot(state, options));
    return next
      ? next.sessions.find((session) => session.id === next.activeSessionId) ?? createEmptySession()
      : null;
  }, [applyAndPersist]);

  useEffect(() => {
    if (snapshot.sessions.length === 0) {
      createSession();
    }
  }, [snapshot.sessions.length, createSession]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        hydrateSnapshot();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [hydrateSnapshot]);

  const switchSession = useCallback((sessionId) => {
    applyAndPersist((state) => ensureActiveSession(setActiveSession(state, sessionId)));
  }, [applyAndPersist]);

  const archiveSession = useCallback((sessionId, archived = true) => {
    const { snapshot: next } = applyAndPersist((state) => archiveSessionById(state, sessionId, archived));
    if (!next.activeSessionId || next.activeSessionId === sessionId) {
      const hydrated = hydrateSnapshot();
      if (!hydrated.activeSessionId && hydrated.sessions.length === 0) {
        createSession();
      }
    }
  }, [applyAndPersist, hydrateSnapshot, createSession]);

  const deleteSession = useCallback((sessionId) => {
    const { snapshot: next } = applyAndPersist((state) => deleteSessionById(state, sessionId));
    if (!next.activeSessionId) {
      const hydrated = hydrateSnapshot();
      if (!hydrated.activeSessionId && hydrated.sessions.length === 0) {
        createSession();
      }
    }
  }, [applyAndPersist, hydrateSnapshot, createSession]);

  const rename = useCallback((sessionId, title) => {
    applyAndPersist((state) => renameSession(state, sessionId, title));
  }, [applyAndPersist]);

  const updateTopic = useCallback((sessionId, topic) => {
    applyAndPersist((state) => updateSessionTopic(state, sessionId, topic));
  }, [applyAndPersist]);

  const addMessage = useCallback((message, sessionId) => {
    const result = applyAndPersist((state) => addMessageToSnapshot(state, sessionId, message));
    return result;
  }, [applyAndPersist]);

  const importSession = useCallback((rawSession, options = {}) => {
    let importResult = null;
    const { snapshot: next } = applyAndPersist((state) => {
      importResult = importSessionIntoSnapshot(state, rawSession, options);
      return ensureActiveSession(setActiveSession(importResult.snapshot, importResult.session.id));
    });

    const imported = next.sessions.find((session) => session.id === importResult.session.id) || importResult.session;

    return {
      session: imported,
      conflictResolved: importResult.conflictResolved,
      replaced: importResult.replaced
    };
  }, [applyAndPersist]);

  const setActiveTopic = useCallback((topic) => {
    applyAndPersist((state) => {
      if (!state.activeSessionId) return state;
      return updateSessionTopic(state, state.activeSessionId, topic);
    });
  }, [applyAndPersist]);

  useEffect(() => {
    if (storageUsage.nearQuota && !lastMigrationNoticeAt) {
      setLastMigrationNoticeAt(Date.now());
    }
  }, [storageUsage, lastMigrationNoticeAt]);

  const value = useMemo(() => {
    const activeSession = snapshot.sessions.find((session) => session.id === snapshot.activeSessionId) || null;
    const activeMessages = activeSession ? activeSession.messages : [];

    return {
      snapshot,
      sessions: snapshot.sessions,
      activeSession,
      activeSessionId: snapshot.activeSessionId,
      activeMessages,
      storageUsage,
      storageWarningThreshold: STORAGE_WARNING_THRESHOLD,
      createSession,
      switchSession,
      archiveSession,
      deleteSession,
      renameSession: rename,
      updateTopic,
      addMessage,
      setActiveTopic,
      importSession,
      refresh: hydrateSnapshot
    };
  }, [snapshot, storageUsage, createSession, switchSession, archiveSession, deleteSession, rename, updateTopic, addMessage, setActiveTopic, importSession, hydrateSnapshot]);

  return (
    <SessionManagerContext.Provider value={value}>
      {children}
    </SessionManagerContext.Provider>
  );
};

export default SessionManagerProvider;
export { SessionManagerContext };
