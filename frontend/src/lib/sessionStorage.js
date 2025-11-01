/*
 * Chat session storage utilities (Phase 1 - client-side sessions)
 * -----------------------------------------------------------------------------
 * This module encapsulates all localStorage access for chat history so that the
 * React layer can remain purely declarative. It manages:
 *   - Versioned storage snapshots
 *   - Migration from legacy chatMessages/chatTopic keys
 *   - CRUD operations for chat sessions and messages
 *   - Metadata tracking (message count, timestamps, model info)
 *   - LocalStorage usage estimation & quota warnings
 */

const STORAGE_KEY = 'chatSessions_v2';
const STORAGE_VERSION = '2.0';

const LEGACY_MESSAGES_KEY = 'chatMessages';
const LEGACY_TOPIC_KEY = 'chatTopic';
const LEGACY_BACKUP_KEY = 'chatMessages_backup';

const DEFAULT_SESSION_TITLE = 'New Conversation';
const MESSAGE_RETENTION_LIMIT = 200; // Keep last N messages per session (Phase 1 recommendation)

const ESTIMATED_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB conservative browser localStorage quota
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%

const EMPTY_SNAPSHOT = Object.freeze({
  version: STORAGE_VERSION,
  activeSessionId: null,
  sessions: []
});

const nowIso = () => new Date().toISOString();

const generateSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const coerceIsoString = (value, fallback = nowIso()) => {
  if (typeof value !== 'string') return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
};

const createEmptySession = ({
  title = DEFAULT_SESSION_TITLE,
  topic = '',
  createdAt = nowIso(),
  id
} = {}) => ({
  id: id || generateSessionId(),
  title,
  topic,
  createdAt,
  updatedAt: createdAt,
  archived: false,
  titleManuallyEdited: false,  // Track if user manually renamed this session
  messages: [],
  metadata: {
    messageCount: 0,
    lastService: null,
    lastModel: null
  }
});

const updateSessionMetadata = (session) => {
  const updated = { ...session };
  const messageCount = updated.messages.length;
  let lastService = null;
  let lastModel = null;

  if (messageCount > 0) {
    for (let i = updated.messages.length - 1; i >= 0; i -= 1) {
      const message = updated.messages[i];
      if (message.type === 'bot') {
        lastService = message.service || null;
        lastModel = message.model || null;
        break;
      }
    }
  }

  updated.metadata = {
    messageCount,
    lastService,
    lastModel
  };

  return updated;
};

const readSnapshot = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('[chat-history] Failed to parse session snapshot. Resetting storage.', error);
    return null;
  }
};

const writeSnapshot = (snapshot) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return { success: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        success: false,
        error: 'quota-exceeded',
        originalError: error
      };
    }
    console.error('[chat-history] Failed to write session snapshot', error);
    return {
      success: false,
      error: 'write-failed',
      originalError: error
    };
  }
};

const isQuotaExceededError = (error) => {
  if (!error) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const backupLegacyData = (messages, topic) => {
  try {
    const backupPayload = {
      backupVersion: 'legacy-v1',
      createdAt: nowIso(),
      messages,
      topic
    };
    localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(backupPayload));
  } catch (error) {
    console.warn('[chat-history] Failed to create legacy backup', error);
  }
};

const migrateLegacyStorage = () => {
  const rawMessages = localStorage.getItem(LEGACY_MESSAGES_KEY);
  if (!rawMessages) {
    return null;
  }

  let parsedMessages;
  try {
    parsedMessages = JSON.parse(rawMessages);
    if (!Array.isArray(parsedMessages)) {
      throw new Error('Legacy messages is not an array');
    }
  } catch (error) {
    console.error('[chat-history] Failed to parse legacy chatMessages. Skipping migration.', error);
    return null;
  }

  const legacyTopic = localStorage.getItem(LEGACY_TOPIC_KEY) || '';

  backupLegacyData(parsedMessages, legacyTopic);

  const session = createEmptySession({
    title: legacyTopic || DEFAULT_SESSION_TITLE,
    topic: legacyTopic,
    createdAt: nowIso()
  });
  session.messages = parsedMessages
    .map((rawMessage) => ({
      type: rawMessage.type || 'bot',
      text: rawMessage.text || '',
      topic: rawMessage.topic || legacyTopic || null,
      service: rawMessage.service || null,
      model: rawMessage.model || null,
      timestamp: rawMessage.timestamp || nowIso()
    }))
    .slice(-MESSAGE_RETENTION_LIMIT);

  const migratedSession = updateSessionMetadata({
    ...session,
    updatedAt: nowIso()
  });

  const snapshot = {
    version: STORAGE_VERSION,
    activeSessionId: migratedSession.id,
    sessions: [migratedSession]
  };

  writeSnapshot(snapshot);

  // Clean up legacy keys to avoid duplicate migration attempts
  localStorage.removeItem(LEGACY_MESSAGES_KEY);
  localStorage.removeItem(LEGACY_TOPIC_KEY);

  return snapshot;
};

const ensureSnapshot = () => {
  const existing = readSnapshot();
  if (existing) {
    return existing;
  }

  const migrated = migrateLegacyStorage();
  if (migrated) {
    return migrated;
  }

  const fresh = clone(EMPTY_SNAPSHOT);
  writeSnapshot(fresh);
  return fresh;
};

const persistSnapshot = (updater) => {
  const current = ensureSnapshot();
  const next = typeof updater === 'function' ? updater(current) : updater;
  const result = writeSnapshot(next);
  return { snapshot: next, ...result };
};

const setActiveSession = (snapshot, sessionId) => ({
  ...snapshot,
  activeSessionId: sessionId
});

const ensureActiveSession = (snapshot) => {
  if (snapshot.activeSessionId && snapshot.sessions.some((s) => s.id === snapshot.activeSessionId)) {
    return snapshot;
  }
  const firstActive = snapshot.sessions.find((session) => !session.archived);
  return {
    ...snapshot,
    activeSessionId: firstActive ? firstActive.id : null
  };
};

const appendMessageToSession = (session, message) => {
  const next = clone(session);
  next.messages.push({
    ...message,
    timestamp: message.timestamp || nowIso()
  });

  if (next.messages.length > MESSAGE_RETENTION_LIMIT) {
    next.messages = next.messages.slice(-MESSAGE_RETENTION_LIMIT);
  }

  next.updatedAt = nowIso();
  return updateSessionMetadata(next);
};

const upsertSession = (snapshot, session) => {
  const exists = snapshot.sessions.some((s) => s.id === session.id);
  const sessions = exists
    ? snapshot.sessions.map((s) => (s.id === session.id ? session : s))
    : [...snapshot.sessions, session];

  return {
    ...snapshot,
    sessions
  };
};

const deleteSessionById = (snapshot, sessionId) => ({
  ...snapshot,
  sessions: snapshot.sessions.filter((session) => session.id !== sessionId)
});

const archiveSessionById = (snapshot, sessionId, archived = true) => ({
  ...snapshot,
  sessions: snapshot.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      archived,
      updatedAt: nowIso()
    };
  })
});

const renameSession = (snapshot, sessionId, title) => ({
  ...snapshot,
  sessions: snapshot.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      title,
      titleManuallyEdited: true,  // Mark as manually edited to prevent auto-updates
      updatedAt: nowIso()
    };
  })
});

const AUTO_TITLE_MESSAGE_THRESHOLD = 5;  // Auto-update title for first N messages

const updateSessionTopic = (snapshot, sessionId, topic) => ({
  ...snapshot,
  sessions: snapshot.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    
    const updated = {
      ...session,
      topic,
      updatedAt: nowIso()
    };
    
    // Auto-update title from topic if:
    // 1. User hasn't manually edited the title
    // 2. Message count is below threshold (conversation still starting)
    // 3. New topic is not empty
    const shouldAutoUpdateTitle = 
      !session.titleManuallyEdited &&
      (session.metadata?.messageCount || 0) < AUTO_TITLE_MESSAGE_THRESHOLD &&
      topic && topic.trim();
    
    if (shouldAutoUpdateTitle) {
      updated.title = topic;
    }
    
    return updated;
  })
});

const createSession = (snapshot, { title, topic } = {}) => {
  const session = createEmptySession({ title, topic });
  return setActiveSession(upsertSession(snapshot, session), session.id);
};

const addMessageToSnapshot = (snapshot, sessionId, message) => {
  const targetId = sessionId || snapshot.activeSessionId;
  if (!targetId) {
    const withSession = createSession(snapshot, {});
    return addMessageToSnapshot(withSession, withSession.activeSessionId, message);
  }

  const targetSession = snapshot.sessions.find((session) => session.id === targetId);
  const session = targetSession || createEmptySession({ id: targetId });
  const updatedSession = appendMessageToSession(session, message);
  const next = upsertSession(snapshot, updatedSession);
  return setActiveSession(next, updatedSession.id);
};

const getApproximateStorageUsage = () => {
  let totalBytes = 0;

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) || '';
    totalBytes += key.length + value.length;
  }

  const usageRatio = totalBytes / ESTIMATED_QUOTA_BYTES;

  return {
    bytesUsed: totalBytes,
    megabytesUsed: totalBytes / (1024 * 1024),
    estimatedQuotaBytes: ESTIMATED_QUOTA_BYTES,
    usageRatio,
    nearQuota: usageRatio >= STORAGE_WARNING_THRESHOLD,
    exceededQuota: usageRatio >= 1
  };
};

const sanitizeMessage = (message = {}, defaultTopic = '') => {
  const type = message.type === 'user' ? 'user' : 'bot';
  const text = typeof message.text === 'string' ? message.text : JSON.stringify(message.text ?? '');
  const topic = typeof message.topic === 'string' ? message.topic : defaultTopic || null;
  const service = typeof message.service === 'string' ? message.service : null;
  const model = typeof message.model === 'string' ? message.model : null;
  const timestamp = coerceIsoString(message.timestamp, nowIso());

  return {
    type,
    text,
    topic,
    service,
    model,
    timestamp
  };
};

const prepareImportedSession = (rawSession = {}) => {
  if (typeof rawSession !== 'object' || rawSession === null) {
    throw new Error('Imported session must be an object');
  }

  const prepared = {
    id: typeof rawSession.id === 'string' && rawSession.id.trim() ? rawSession.id.trim() : generateSessionId(),
    title: typeof rawSession.title === 'string' && rawSession.title.trim() ? rawSession.title.trim() : DEFAULT_SESSION_TITLE,
    topic: typeof rawSession.topic === 'string' ? rawSession.topic : '',
    createdAt: coerceIsoString(rawSession.createdAt, nowIso()),
    updatedAt: coerceIsoString(rawSession.updatedAt, nowIso()),
    archived: Boolean(rawSession.archived),
    messages: Array.isArray(rawSession.messages)
      ? rawSession.messages.map((msg) => sanitizeMessage(msg, rawSession.topic)).slice(-MESSAGE_RETENTION_LIMIT)
      : [],
    metadata: typeof rawSession.metadata === 'object' && rawSession.metadata !== null
      ? { ...rawSession.metadata }
      : {}
  };

  return updateSessionMetadata(prepared);
};

const importSessionIntoSnapshot = (snapshot, rawSession, { replaceExisting = false } = {}) => {
  let prepared = prepareImportedSession(rawSession);
  let sessions = snapshot.sessions.slice();
  const existing = sessions.find((session) => session.id === prepared.id);
  let conflictResolved = false;
  let replaced = false;

  if (existing) {
    if (replaceExisting) {
      sessions = sessions.map((session) => (session.id === prepared.id ? prepared : session));
      replaced = true;
    } else {
      prepared = {
        ...prepared,
        id: generateSessionId(),
        createdAt: coerceIsoString(prepared.createdAt, nowIso()),
        updatedAt: nowIso()
      };
      sessions.push(prepared);
      conflictResolved = true;
    }
  } else {
    sessions.push(prepared);
  }

  const nextSnapshot = ensureActiveSession({
    ...snapshot,
    sessions
  });

  return {
    snapshot: nextSnapshot,
    session: prepared,
    conflictResolved,
    replaced
  };
};

/**
 * Cleanup empty session (delete if it has no messages)
 * @param {string} sessionId - Session ID to check and cleanup
 * @returns {boolean} - True if session was deleted, false otherwise
 */
const cleanupEmptySession = (sessionId) => {
  const snapshot = ensureSnapshot();
  const session = snapshot.sessions.find((s) => s.id === sessionId);
  
  if (session && session.messages.length === 0) {
    const updated = deleteSessionById(snapshot, sessionId);
    persistSnapshot(updated);
    return true;
  }
  
  return false;
};

export {
  STORAGE_KEY,
  STORAGE_VERSION,
  MESSAGE_RETENTION_LIMIT,
  STORAGE_WARNING_THRESHOLD,
  ensureSnapshot,
  persistSnapshot,
  ensureActiveSession,
  createSession,
  createEmptySession,
  addMessageToSnapshot,
  deleteSessionById,
  archiveSessionById,
  renameSession,
  updateSessionTopic,
  setActiveSession,
  upsertSession,
  appendMessageToSession,
  updateSessionMetadata,
  getApproximateStorageUsage,
  isQuotaExceededError,
  prepareImportedSession,
  importSessionIntoSnapshot,
  cleanupEmptySession
};
