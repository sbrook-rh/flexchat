# Phase 2 Frontend Testing Guide

This document describes how to test the Phase 2 frontend implementation.

## Phase 2.1: Zero-Config Bootstrap - Testing

### Architecture Overview

The system now properly separates concerns:

**Endpoint Separation (Decision 12):**
- `/api/ui-config` - Summary status used by ALL routes
  - Returns: `hasConfig`, `chatReady`, `providerStatus`, etc.
  - Used to determine UI state across the application
- `/api/config/export` - Full raw config used ONLY by builder
  - Returns: Complete configuration object with ${ENV_VAR} placeholders
  - Used when initializing the configuration builder

**Route Accessibility:**
- `/` (Home) - Always accessible, shows warning if `!chatReady`
- `/chat` - Always accessible, will show "not ready" message if `!chatReady` (TODO Phase 2.2)
- `/collections` - Always accessible
- `/config` - Always accessible (for creating OR editing configuration)

**No Special Zero-Config Flow:**
- There is NO separate "zero-config mode"
- The UI simply checks `chatReady` from `/api/ui-config`
- If `!chatReady`, show appropriate messages and link to `/config`

## Test Scenarios

### Test 1: Normal Operation (Config Exists, Chat Ready)

**Preconditions:**
- Server started with valid config: `./start.sh --config config/config-simon.json`
- At least one working LLM provider configured
- At least one response handler configured

**Steps:**
1. Open browser to http://localhost:3000/
2. Observe Home page

**Expected Results:**
- ✅ No yellow "Configuration incomplete" banner visible
- ✅ Blue "Start Chatting →" button displayed
- ✅ **Top-right "Configuration" button visible** (gear icon, always accessible)
- ✅ Can click "Start Chatting" to navigate to /chat successfully
- ✅ Can click "Configuration" to navigate to /config

3. Navigate to http://localhost:3000/config

**Expected Results:**
- ✅ Shows "Configuration Builder" heading
- ✅ Shows "Back to Home" button
- ✅ Displays current config as JSON in a `<pre>` block
- ✅ Config includes all LLMs, RAG services, and responses from config-simon.json

4. Test /api/config/export endpoint:
```bash
curl -s http://localhost:5005/api/config/export | jq
```

**Expected Results:**
- ✅ Returns full configuration object as JSON
- ✅ Includes `llms`, `rag_services`, `responses` sections
- ✅ Contains ${ENV_VAR} placeholders (not resolved values)

### Test 2: Incomplete Configuration (Config Exists, Chat NOT Ready)

**Preconditions:**
- Server started with incomplete config (e.g., no LLMs or no response handlers)
- OR temporarily modify `/api/ui-config` to return `chatReady: false`

**Steps:**
1. Open browser to http://localhost:3000/
2. Observe Home page

**Expected Results:**
- ✅ Yellow "Configuration incomplete" banner visible
- ✅ Banner text: "Configuration incomplete. Configure providers to start chatting."
- ✅ "Configure providers" is a clickable link
- ✅ Yellow "Configure System →" button displayed (instead of blue "Start Chatting")

3. Click "Configure System →" button

**Expected Results:**
- ✅ Navigates to /config
- ✅ Shows current (incomplete) config for editing

### Test 3: Zero-Config Mode (No Config File)

**Preconditions:**
- Temporarily rename or move your config file to simulate zero-config
- Start server normally: `./start.sh` (no --config argument)
- Server should start successfully (not exit with error)

**Expected Server Console Output:**
```
🚀 Starting Flex Chat Server v2.0...

📝 Using default config: config/config.json
📝 Config file not found: /Users/.../flex-chat/config/config.json
⚠️  No configuration file found - starting in zero-config mode
   Use the Configuration Builder UI at /config to set up providers

   ⚠️  Zero-config mode: No providers or responses configured
   ℹ️  Visit http://localhost:5005/config to set up the system

✅ Server initialized successfully

🎯 Chat server listening on http://localhost:5005
```

**Steps:**
1. Open browser to http://localhost:3000/
2. Observe automatic behavior

**Expected Results:**
- ✅ Home page shows yellow "Configuration incomplete" banner
- ✅ Yellow "Configure System →" button

3. Click "Configure System →" or manually navigate to /config

**Expected Results:**
- ✅ Shows zero-config welcome screen (gradient blue/indigo background)
- ✅ "Welcome to Flex Chat" heading
- ✅ "No Configuration Found" info box
- ✅ Blue "Build Configuration" button (primary action)
- ✅ White "Import Configuration File" button (secondary action)
- ✅ "Recommended Providers" section showing:
  - Ollama (green checkmark, local, no API key)
  - OpenAI (blue checkmark, requires API key)
  - Google Gemini (purple checkmark, requires API key)

4. Click "Build Configuration" button

**Expected Results:**
- ✅ Console log: "Starting configuration wizard..."
- ⏸️ Full wizard UI (Phase 2.2-2.3 implementation)

### Test 4: Builder Initialization from Export Endpoint

**Preconditions:**
- Server running with valid config

**Steps:**
1. Open browser DevTools Network tab
2. Navigate to http://localhost:3000/config
3. Observe network requests

**Expected Results:**
- ✅ Initial page load calls `GET /api/ui-config`
- ✅ ConfigBuilder component calls `GET /api/config/export`
- ✅ Export endpoint returns full config object
- ✅ Config is displayed in the builder UI

### Test 5: Manual Navigation to Builder (Always Accessible)

**Preconditions:**
- Server running (any config state)

**Steps:**
1. From any route (Home, Chat, Collections), manually navigate to /config
2. Example: Type http://localhost:3000/config in address bar

**Expected Results:**
- ✅ Builder loads successfully regardless of current route
- ✅ No redirects or access denied messages
- ✅ Shows appropriate UI based on `hasConfig` status:
  - If `hasConfig: true` → show builder with current config
  - If `hasConfig: false` → show zero-config welcome screen

## API Endpoint Tests

### GET /api/ui-config
```bash
curl -s http://localhost:5005/api/ui-config | jq
```

**Expected Response:**
```json
{
  "collections": [...],
  "wrappers": [...],
  "modelSelection": {...},
  "hasConfig": true,
  "isZeroConfig": false,
  "providerStatus": {
    "llms": {
      "local": { "connected": true, "provider": "ollama" },
      "chatgpt": { "connected": true, "provider": "openai" }
    },
    "rag_services": {...}
  },
  "hasWorkingProviders": true,
  "hasResponseHandlers": true,
  "chatReady": true
}
```

### GET /api/config/export
```bash
curl -s http://localhost:5005/api/config/export | jq
```

**Expected Response:**
```json
{
  "llms": {
    "local": {
      "provider": "ollama",
      "baseUrl": "http://127.0.0.1:11434"
    },
    "chatgpt": {
      "provider": "openai",
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1"
    }
  },
  "rag_services": {...},
  "responses": [...]
}
```

**Key Points:**
- ✅ Includes ${ENV_VAR} placeholders (NOT resolved values)
- ✅ Complete configuration structure
- ✅ Can be used to reinitialize builder

### POST /api/config/reload (Placeholder)
```bash
curl -s -X POST http://localhost:5005/api/config/reload \
  -H 'Content-Type: application/json' \
  -d '{"llms":{}}' | jq
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Hot-reload not yet implemented (Phase 5.1.2)"
}
```

**Status Code:** 501 (Not Implemented)

## Common Issues

### Issue: Config builder shows loading forever
**Cause:** `/api/config/export` endpoint not responding
**Fix:** Check server logs, verify endpoint is mounted correctly

### Issue: Home page always shows "Configuration incomplete"
**Cause:** `chatReady` is false in `/api/ui-config` response
**Debug:** Check `/api/ui-config` response:
- `hasWorkingProviders` - at least one LLM connected?
- `hasResponseHandlers` - response array has entries?
- Both must be true for `chatReady: true`

### Issue: Zero-config welcome screen not showing
**Cause:** `hasConfig` is true even with empty/minimal config
**Debug:** Server needs zero-config mode support (Phase 1 backend)

## Phase 2.1 Completion Status

✅ **Completed:**
- Task 2.1.1: Detect missing configuration (check `hasConfig` from `/api/ui-config`)
- Task 2.1.2: Show welcome screen with "Build Configuration" button
- Task 2.1.3: Initialize empty configuration structure (workingConfig state)
- Task 2.1.4: Suggest default providers (Ollama, OpenAI, Gemini listed)
- Added `GET /api/config/export` endpoint
- Added `POST /api/config/reload` placeholder
- Updated Home to check `chatReady` and show status banner
- Builder initialization from export endpoint
- Proper endpoint separation (ui-config vs export)
- **Zero-config backend support:**
  - Modified `resolveConfigPath()` to return `null` when config file missing
  - Modified `loadConfig()` to return empty config `{}` for zero-config mode
  - Modified `validateConfig()` to allow empty config
  - Modified `server.js` to skip provider initialization when zero-config
  - Server starts successfully without config file

⏸️ **Deferred to Phase 2.2+:**
- Full provider list/edit UI
- Connection wizard
- Model discovery
- Environment variable UI
- Actual configuration persistence and hot-reload

## Next Steps

Phase 2.2 will implement:
- Provider list component showing configured LLMs/RAG services
- "Add Provider" button to start wizard
- Connection status indicators
- Edit/delete actions per provider

