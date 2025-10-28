# Configuration Builder System - Design Decisions

## Context

Flex Chat currently requires a valid configuration file at startup, making it impossible to start the application without pre-existing configuration. This creates a chicken-and-egg problem for new users and makes UI-driven configuration impossible.

The Configuration Builder System transforms Flex Chat from config-file-first to UI-first while maintaining full backward compatibility with existing JSON-based workflows.

**Current Behavior:**
- `resolveConfigPath()` always returns a path (defaults to `config/config.json`)
- Server exits with error if config file doesn't exist or is invalid
- Server exits if any configured LLM or RAG provider fails to connect
- Chat UI is always visible, even without valid configuration
- Home screen assumes working configuration exists

**Stakeholders:**
- New users (need zero-config getting started experience)
- Existing users (must maintain current workflows)
- Developers (simpler local setup without config files)
- Ops teams (easier deployment with UI-driven config)

---

## Goals / Non-Goals

### Goals
1. **Zero-config startup**: Application starts with no configuration file
2. **UI-first authoring**: Complete configuration building through UI
3. **Backward compatibility**: Existing JSON workflows continue unchanged
4. **Provider resilience**: Graceful degradation if providers fail to connect
5. **Live configuration**: Apply changes without restart (where possible)

### Non-Goals
1. **Replace JSON entirely**: JSON configs remain the deployment standard
2. **Runtime provider hot-swap**: Changing providers still requires reload
3. **Multi-user configuration**: No conflict resolution for concurrent edits
4. **Configuration versioning**: No built-in version control (Phase 5 optional)

---

## Decisions

### Decision 1: Zero-Config Bootstrap Strategy

**Options Considered:**

**A) Explicit `--zero-config` flag**
```bash
npm start -- --zero-config
```
- ✅ Clear intent, no ambiguity
- ❌ Extra step, not beginner-friendly
- ❌ Doesn't help when config file is missing unintentionally

**B) Fallback to empty config file (current behavior)**
```bash
# Falls back to config/config.json even if missing
npm start
```
- ✅ Simple, no changes needed
- ❌ Still exits with error if file missing
- ❌ Confusing: is empty file intentional or error?

**C) Smart detection: missing file = zero-config mode** ✅ **CHOSEN**
```bash
# No config file? Start in zero-config mode
npm start
# Config file exists? Use it
npm start -- --config my-config.json
```
- ✅ Beginner-friendly: just works
- ✅ Backward compatible: existing configs still work
- ✅ Clear intent: missing = intentional zero-config
- ✅ Error messages can guide users to UI builder

**Decision:** Use **Option C** - Smart detection

**Key Constraint:** Must preserve existing environment variable precedence:
1. CLI argument (`--config`)
2. `FLEX_CHAT_CONFIG_FILE_PATH` (full file path)
3. `FLEX_CHAT_CONFIG_DIR` (directory path, combined with `FLEX_CHAT_CONFIG_FILE` or default `config.json`)
4. Default: `./config/config.json`

**ONLY CHANGE:** When resolved path doesn't exist, return `null` instead of returning path that will fail later

**Implementation:**
```javascript
// Modified resolveConfigPath behavior:
// KEEP existing precedence and logic, ONLY change behavior when file doesn't exist

function resolveConfigPath(providedPath) {
  let configPath;
  
  function resolveFileName() {
    return process.env.FLEX_CHAT_CONFIG_FILE || 'config.json';
  }
  
  if (providedPath) {
    // 1. CLI argument provided - EXISTING LOGIC UNCHANGED
    //    Can be file or directory, absolute or relative
    //    Resolves relative to FLEX_CHAT_CONFIG_DIR if set
    let resolvedPath;
    
    if (path.isAbsolute(providedPath)) {
      resolvedPath = providedPath;
    } else {
      const baseDir = process.env.FLEX_CHAT_CONFIG_DIR || process.cwd();
      resolvedPath = path.resolve(baseDir, providedPath);
    }
    
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      configPath = path.join(resolvedPath, resolveFileName());
    } else {
      configPath = resolvedPath;
    }
    
  } else if (process.env.FLEX_CHAT_CONFIG_FILE_PATH) {
    // 2. FLEX_CHAT_CONFIG_FILE_PATH - EXISTING LOGIC UNCHANGED
    configPath = process.env.FLEX_CHAT_CONFIG_FILE_PATH;
    
  } else if (process.env.FLEX_CHAT_CONFIG_DIR) {
    // 3. FLEX_CHAT_CONFIG_DIR - EXISTING LOGIC UNCHANGED
    //    Also respects FLEX_CHAT_CONFIG_FILE for filename
    configPath = path.join(process.env.FLEX_CHAT_CONFIG_DIR, resolveFileName());
    
  } else {
    // 4. Default: config/config.json - EXISTING LOGIC UNCHANGED
    configPath = path.join(process.cwd(), 'config', 'config.json');
  }
  
  // NEW: Return null if file doesn't exist (instead of returning path that will fail later)
  //      This allows loadConfig to detect zero-config scenario
  if (!fs.existsSync(configPath)) {
    return null;  // Signal zero-config mode
  }
  
  return configPath;
}

// Modified loadConfig behavior:
function loadConfig(configPath) {
  if (!configPath) {
    console.log('⚠️  No configuration file found - starting in zero-config mode');
    console.log('   Open http://localhost:3000/config to build your configuration');
    return createEmptyConfig(); // Returns minimal structure
  }
  
  // Normal config loading...
}

function createEmptyConfig() {
  return {
    llms: {},
    rag_services: {},
    embedding: null,
    intent: null,
    responses: []
  };
}
```

**Rationale:** Most intuitive for new users, doesn't break existing workflows, provides clear path forward.

---

### Decision 2: Provider Connection Failure Handling

**Current Behavior:**
- Server exits if ANY configured provider fails to connect
- Makes sense for production (fail-fast)
- Problematic for zero-config mode (no providers = exit)

**Options Considered:**

**A) Continue fail-fast approach**
- ✅ Production-safe
- ❌ Impossible to start in zero-config mode
- ❌ Can't build config if server won't start

**B) Allow startup with failed providers** ✅ **CHOSEN**
```javascript
// Track provider connection status separately
const providerStatus = {
  llms: {},      // { "chatgpt": { connected: true }, "local": { connected: false, error: "..." } }
  rag_services: {} // { "recipes": { connected: true }, ... }
};

// Don't exit on provider failure, log and continue
async function initializeProviders(config) {
  for (const [name, cfg] of Object.entries(config.llms)) {
    try {
      await providers.initialize(name, cfg);
      providerStatus.llms[name] = { connected: true };
    } catch (error) {
      console.warn(`⚠️  LLM provider '${name}' failed to connect: ${error.message}`);
      providerStatus.llms[name] = { connected: false, error: error.message };
      // Don't exit - continue with other providers
    }
  }
}
```

**Strict Mode Option:**
```bash
# For production: fail-fast on any provider error
npm start -- --config prod.json --strict
```

**Decision:** **Option B** with optional `--strict` mode

**Rationale:** 
- Enables zero-config startup (no providers = no failures)
- Allows building configuration while server runs
- Connection status visible in UI for debugging
- `--strict` mode preserves production safety
- Degrades gracefully: routes check provider status before use

---

### Decision 3: UI Route Visibility & Home Screen

**Current Behavior:**
- Chat route always visible
- Home screen assumes working configuration
- No indication if configuration is missing/invalid

**New Behavior:**

**Home Screen Logic:**
```javascript
// Home.jsx
function Home() {
  const { hasConfig, isValid, providerCount } = useConfigStatus();
  
  if (!hasConfig) {
    return <WelcomeScreen />; // "Get Started" → Config Builder
  }
  
  if (!isValid || providerCount === 0) {
    return <ConfigIssuesScreen />; // Warning + link to config builder
  }
  
  return <StandardHomeScreen />; // Normal landing page
}
```

**Navigation Logic:**
```javascript
// App.jsx - Routes configured at app level
// Note: NavBar.jsx exists but is not currently used in architecture
// Uses EXISTING /api/ui-config endpoint (extended with provider status)

function App() {
  const [uiConfig, setUiConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load UI config - EXISTING endpoint, will be extended
  // Currently returns: { collections, wrappers, modelSelection }
  // Will add: { ...existing, hasConfig, providerStatus, isZeroConfig }
  useEffect(() => {
    fetch('/api/ui-config')
      .then(res => res.json())
      .then(data => {
        setUiConfig(data);
        setLoading(false);
      });
  }, []);
  
  // Routes are always registered, but pages handle their own state
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home uiConfig={uiConfig} />} />
        <Route path="/config" element={<ConfigBuilder uiConfig={uiConfig} />} />
        <Route path="/chat" element={<Chat uiConfig={uiConfig} />} />
        <Route path="/collections" element={<Collections uiConfig={uiConfig} />} />
      </Routes>
    </Router>
  );
}
```

**Extended `/api/ui-config` Response:**
```javascript
// CURRENT (backend/chat/routes/collections.js):
{
  collections: [...],           // List of available collections
  wrappers: [...],              // RAG service wrappers
  modelSelection: { ... }       // Model selection config
}

// EXTENDED (add provider status for zero-config support):
{
  // Existing fields (unchanged)
  collections: [...],
  wrappers: [...],
  modelSelection: { ... },
  
  // NEW fields for configuration builder
  hasConfig: true,                   // Is there a config file?
  isZeroConfig: false,               // Started in zero-config mode?
  providerStatus: {
    llms: {
      "chatgpt": { connected: true },
      "local": { connected: false, error: "Connection timeout" }
    },
    rag_services: {
      "recipes": { connected: true },
      "tech_docs": { connected: false, error: "Service unreachable" }
    }
  },
  hasWorkingProviders: true,         // At least one LLM connected?
  hasResponseHandlers: true,         // At least one response handler configured?
  chatReady: true                    // hasWorkingProviders AND hasResponseHandlers
}
```

**Page-Level Guards:**
```javascript
// Chat.jsx - Guard at page level
function Chat({ uiConfig }) {
  // Need BOTH working provider AND response handler
  if (!uiConfig?.hasWorkingProviders) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2>No LLM Providers Configured</h2>
          <p>Add and test an LLM provider to start chatting</p>
          <Link to="/config">Configure Providers →</Link>
        </div>
      </div>
    );
  }
  
  if (!uiConfig?.hasResponseHandlers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2>No Response Handlers Configured</h2>
          <p>Create at least one response handler to start chatting</p>
          <Link to="/config">Configure Response Handlers →</Link>
        </div>
      </div>
    );
  }
  
  // Normal chat UI
  return <div>...</div>;
}
```

**Decision:** Dynamic UI based on configuration state, with page-level guards

**Architecture:**
- All routes always registered (no conditional routing)
- Pages receive `uiConfig` prop with provider status
- Each page guards itself based on required capabilities
- Navigation handled through in-page links, not navbar

**States:**
1. **Zero-config**: Home shows welcome → configuration builder
2. **Invalid config**: Home shows warning → fix in config builder
3. **No working providers**: Chat shows "add LLM provider" message
4. **No response handlers**: Chat shows "create response handler" message
5. **Working config**: All pages function normally (chatReady = true)

**Chat Requirements:**
- ✅ At least one working LLM provider
- ✅ At least one response handler with model selected
- ✅ Response handler references valid provider

**Rationale:** 
- Simpler routing (no conditional route registration)
- Clear user guidance at point of use
- Each page knows its own requirements
- Follows existing architecture pattern (no navbar)
- Progressive disclosure (shows specific missing piece)

---

### Decision 4: Configuration Naming Consistency

**Current Issue:**
- Backend uses `llms`, `rag_services`, `responses`
- Inconsistent naming: `llms` vs `rag_services` (one plural, one compound)

**Proposal for Future Refactor** (not part of this change):
```javascript
// More consistent naming:
{
  "llm_providers": {},      // or "llm_services"
  "rag_providers": {},      // consistent with llm_providers
  "embedding_config": {},   // clearer than just "embedding"
  "intent_config": {},      // clearer than just "intent"
  "response_handlers": []   // clearer than "responses"
}
```

**Decision for THIS change:**
- **Keep existing names** for backward compatibility
- Document inconsistency as known issue
- Consider migration in future major version (v3.0?)
- UI can use clearer labels internally ("LLM Providers", "RAG Services")

**Rationale:** Breaking change not worth the benefit right now, but worth noting for future

---

### Decision 5: Configuration Persistence Strategy

**Options:**

**A) Persist to file immediately on every change**
- ❌ Lots of disk I/O
- ❌ Hard to undo mistakes
- ❌ Config file constantly changing during editing

**B) Keep in memory, explicit download action** ✅ **CHOSEN**
```javascript
// In-memory working copy
let workingConfig = { ...loadedConfig };

// UI makes changes to workingConfig
// User clicks "Apply Changes" → validates and hot-reloads
// User clicks "Download Config" → exports JSON for user to save
```
- ✅ Explicit user control
- ✅ Easy undo (just reload from original)
- ✅ Can test changes before downloading
- ✅ Batch multiple edits
- ✅ Works in containerized environments (no filesystem writes)
- ✅ User controls where file is saved

**C) Auto-save with history**
- ✅ No lost work
- ❌ Complex implementation
- ❌ Needs storage for history

**Decision:** **Option B** - Explicit download with "Unsaved Changes" indicator

**Flow:**
1. User edits configuration in UI → `workingConfig` modified
2. "Unapplied Changes" indicator appears
3. User clicks "Apply Changes" → validates and hot-reloads (`POST /api/config/reload`)
4. User clicks "Download Config" → exports JSON (browser download, user saves locally)
5. User can "Revert" to last loaded state

**Why Download, Not Server Save:**
- ✅ Works in containerized environments (OpenShift, Kubernetes)
- ✅ Config often mounted as ConfigMap/volume (read-only)
- ✅ User controls where file is saved (local dev, shared drive, etc.)
- ✅ No filesystem permissions issues
- ✅ Simpler security model (no server-side file writing)

**Deployment Workflow:**
1. User builds config in UI
2. User clicks "Apply Changes" (live testing in dev)
3. User clicks "Download Config" when satisfied
4. User deploys config via their deployment process (ConfigMap, volume mount, etc.)

**Rationale:** Cloud-native, secure, flexible deployment

---

### Decision 6: Hot-Reload vs Restart

**What CAN be hot-reloaded:**
- Adding/removing/editing providers (reinitialize provider instances)
- Changing response handlers (just update in-memory array)
- Modifying embeddings (update configuration, warn about existing collections)
- Changing intent detection (reinitialize classifier)

**What CANNOT be hot-reloaded:**
- Server configuration (port, CORS, etc.) - requires restart
- Fundamental architecture changes - requires restart

**Decision:** Support hot-reload for configuration changes via `/api/config/reload`

```javascript
app.post('/api/config/reload', async (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate
    validateConfig(newConfig);
    
    // Reinitialize providers
    await reinitializeProviders(newConfig);
    
    // Update global config
    config = newConfig;
    
    res.json({ 
      success: true, 
      message: 'Configuration reloaded successfully',
      status: providerStatus 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

**Rationale:** Faster iteration, better UX, most config changes don't need restart

---

### Decision 7: Schema-Driven Forms vs Hardcoded UI

**Options:**

**A) Hardcoded forms for each provider**
```jsx
function OpenAIForm() {
  return (
    <>
      <Input label="API Key" name="api_key" type="secret" />
      <Input label="Base URL" name="base_url" type="url" />
      <Input label="Organization" name="organization" />
    </>
  );
}
```
- ✅ Full control over UI
- ❌ New provider = new UI code
- ❌ Duplicate logic across providers
- ❌ Hard to maintain

**B) Schema-driven dynamic forms** ✅ **CHOSEN**
```javascript
// Provider exposes schema
class OpenAIProvider {
  static getConnectionSchema() {
    return {
      provider: "openai",
      display_name: "OpenAI",
      fields: [
        { name: "api_key", type: "secret", required: true, 
          env_var_suggestion: "OPENAI_API_KEY" },
        { name: "base_url", type: "url", required: true,
          default: "https://api.openai.com/v1" },
        { name: "organization", type: "string", required: false }
      ]
    };
  }
}

// UI generates form from schema
function DynamicProviderForm({ schema }) {
  return schema.fields.map(field => 
    <FormField key={field.name} field={field} />
  );
}
```
- ✅ New providers work automatically
- ✅ Consistent UI across providers
- ✅ Easy to maintain
- ✅ Schema can be validated

**Decision:** **Option B** - Schema-driven forms

**Rationale:** Extensibility, consistency, reduced maintenance, aligns with provider abstraction

---

### Decision 8: Environment Variable Substitution Strategy

**Context:** 
- Config files use `${ENV_VAR}` placeholders for security
- UI needs to display/edit placeholders (not actual values)
- Backend needs actual values for API calls
- Export must preserve placeholders

**Options Considered:**

**A) Hold processed config, lose placeholders**
- ❌ Can't re-export with placeholders
- ❌ UI would show actual API keys (security issue)
- ❌ No way to edit placeholders

**B) Hold raw + processed config (dual state)** 
- ✅ Have both versions available
- ❌ Sync complexity (which is source of truth?)
- ❌ Memory overhead (two copies)
- ❌ Error-prone (easy to use wrong one)

**C) Hold raw config, substitute on-demand** ✅ **CHOSEN**
```javascript
// Global state
let rawConfig = null;          // Source of truth, with ${PLACEHOLDERS}
let providers = {};            // Initialized from processed config
let ragProviders = {};

// On-demand substitution (pure function, no mutation)
function substituteEnvVars(obj) {
  const json = JSON.stringify(obj);
  const processed = json.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    return value !== undefined ? value : match;
  });
  return JSON.parse(processed);
}

// Usage patterns
function getProcessedConfig() {
  return substituteEnvVars(rawConfig);
}

// Provider initialization uses processed config
async function initializeProviders() {
  const processed = getProcessedConfig();
  for (const [name, cfg] of Object.entries(processed.llms)) {
    providers[name] = await createProvider(cfg); // Gets real API keys
  }
}

// UI endpoints return raw config (placeholders visible)
app.get('/api/config/export', (req, res) => {
  res.json(rawConfig); // ${PLACEHOLDERS} intact
});

// Hot-reload accepts raw config with placeholders
app.post('/api/config/reload', async (req, res) => {
  rawConfig = req.body;                      // Save with placeholders
  const processed = getProcessedConfig();    // Substitute for providers
  await reinitializeProviders(processed);    // Use real values
  res.json({ success: true });
});

// Chat endpoint uses processed config
app.post('/api/chat', (req, res) => {
  const processed = getProcessedConfig();
  // Use processed.llms, processed.rag_services with real values
});
```

**Decision:** **Option C** - Raw config as source of truth, substitute on-demand

**Rationale:**
- ✅ Single source of truth (no sync issues)
- ✅ Security (placeholders never exposed to UI unless intended)
- ✅ Clean separation (raw = storage, processed = runtime)
- ✅ Testable (can mock env vars for testing)
- ✅ Memory efficient (lazy substitution)
- ✅ Simple mental model (always know which version you need)

**Performance Impact:** None - substitution only happens at startup and hot-reload, not per-request. Providers are initialized once with real values and reused.

**Implementation Notes:**
- `loadConfig()` returns raw config (doesn't substitute)
- New `getProcessedConfig()` helper called at startup/reload only
- Provider initialization uses `getProcessedConfig()` (real values)
- Initialized providers stored in `aiProviders` and `ragProviders` objects (reused for all requests)
- UI APIs always return/accept raw config (placeholders visible)
- Export always returns raw config (security)

**Security Pattern from CONNECTION_BUILDER.md:**
- UI never accepts actual API keys (only env var names)
- Dropdown shows only `FLEX_CHAT_*` prefixed vars (by name, never value)
- Pattern-based filtering per provider (e.g., `FLEX_CHAT_OPENAI_*`)
- Form validation rejects strings that look like actual secrets
- Reserved `FLEX_CHAT_CONFIG*` vars excluded from suggestions

---

### Decision 9: Secret Handling Policy (UI)

**Decision:** Secret fields in the UI must be provided via environment variable references. Plaintext entry is disallowed, and secret values are never exposed in the browser.

**Rationale:** Eliminates risk of secrets leaking via UI state, logs, or network captures; aligns with raw-config-with-placeholders strategy.

**Implications:**
- Provider schemas mark secret fields; UI renders env-var picker only.
- EnvVarManager supplies allowlisted suggestions by name (never value).
- Validation rejects plaintext-like inputs for secret fields.

---

### Decision 10: DRY Connection Payload for Test/Models

**Decision:** Use a shared `connection` payload `{ provider_id, type, fields }` and a single validation/normalization pipeline for both `/api/connections/test` and `/api/connections/providers/:id/models`.

**Rationale:** Reduces duplication, ensures consistent validation across endpoints, simplifies frontend integration.

**Implications:**
- Both endpoints accept the same body structure.
- Backend resolves env placeholders on-demand for operation only.
- Add unit tests for the shared validator.

---

### Decision 11: Builder Mode Navigation Guard

**Decision:** While there are unapplied changes in the configuration builder, block route navigation except for explicit Export or Cancel. Apply triggers hot-reload.

**Rationale:** Prevents user confusion from diverging UI state vs runtime config.

**Implications:**
- Global route guard keyed on `hasUnappliedChanges`.
- Export does not apply changes; Cancel discards and returns to home.

---

### Decision 12: Endpoint Separation (ui-config vs export/reload)

**Decision:** Use `/api/ui-config` for summarized status across the app, and `/api/config/export` (full raw config) + `/api/config/reload` (apply) for the builder.

**Rationale:** Keeps general UI fast and safe while giving the builder the full authoring payload; clear separation of concerns.

**Implications:**
- Builder initializes from `GET /api/config/export` and applies via `POST /api/config/reload`.
- After apply, UI refreshes `/api/ui-config` and returns to Home.

---

### Decision 13: Validation Gating (Apply/Export)

**Decision:** Require an explicit validation step in the builder. Edits mark the draft as dirty; Apply and Export remain disabled until `POST /api/config/validate` succeeds. Apply still re-validates server-side.

**Rationale:** Improves UX predictability and prevents exporting invalid configs.

**Implications:**
- Add `POST /api/config/validate` endpoint.
- Builder tracks `validationStatus: 'dirty' | 'valid' | 'invalid'`.
- Buttons state derives from validation status.

---

## Configuration Path Resolution

The system uses a sophisticated config path resolution strategy (implemented in `backend/chat/lib/config-loader.js:resolveConfigPath()`):

**Priority order:**
1. CLI argument (`--config`)
   - Absolute paths: used as-is
   - **Relative paths: resolved from `FLEX_CHAT_CONFIG_DIR` if set, otherwise `process.cwd()`**
   - If path is a directory, looks for `config.json` (or `FLEX_CHAT_CONFIG_FILE`) inside
2. `FLEX_CHAT_CONFIG_FILE_PATH` env var (full file path)
3. `FLEX_CHAT_CONFIG_DIR` env var (directory containing config.json)
4. Default: `./config/config.json` from `process.cwd()`

**Critical:** When `FLEX_CHAT_CONFIG_DIR` is set (e.g., in `backend/chat/.env`), relative config paths like `--config config-simon.json` are resolved from that directory, **not** from the server's working directory.

Example:
```bash
# In backend/chat/.env:
FLEX_CHAT_CONFIG_DIR=../../config

# Then from backend/chat/:
node server.js --config config-simon.json
# Resolves to: ../../config/config-simon.json (relative to backend/chat/)
```

This allows the server to be run from any working directory while maintaining consistent config paths.

## Risks / Trade-offs

### Risk 1: Zero-config complexity
**Risk:** Logic branches for zero-config vs normal mode increase complexity  
**Mitigation:** 
- Treat zero-config as special case of "valid config with no providers"
- Use same validation logic, just skip provider initialization
- Clear state tracking: `isZeroConfig`, `hasValidConfig`, `providerStatus`

### Risk 2: Provider failure handling changes behavior
**Risk:** Existing deployments expect fail-fast, might mask real issues  
**Mitigation:**
- Add `--strict` mode for production (fail-fast)
- Log warnings prominently for failed providers
- Health check endpoint shows provider status
- UI displays connection status clearly

### Risk 3: Hot-reload could leave system in inconsistent state
**Risk:** Partial provider reinitialization could cause undefined behavior  
**Mitigation:**
- Validate entire config before applying any changes
- Rollback mechanism if initialization fails
- Keep old provider instances until new ones are confirmed working
- Comprehensive error handling with clear error messages

### Risk 4: Backward compatibility
**Risk:** Changes to config loading might break existing setups  
**Mitigation:**
- Explicit CLI arg behavior unchanged (must exist)
- Env var behavior unchanged
- Only default path behavior changed (allow missing)
- Comprehensive testing of existing config scenarios

### Risk 5: UI state management complexity
**Risk:** Managing draft vs applied vs saved config states is complex  
**Mitigation:**
- Clear state model: `loadedConfig` → `workingConfig` → `appliedConfig`
- Visual indicators for each state (Unsaved, Unapplied)
- Explicit user actions for state transitions
- Confirmation dialogs for destructive actions

---

## Migration Plan

### Phase 1: Backend Foundation
1. Modify `resolveConfigPath()` to allow missing config
2. Modify `loadConfig()` to return empty config when no file
3. Modify provider initialization to continue on failure
4. Add provider status tracking
5. Add `/api/config/*` endpoints
6. **Rollback:** Revert config loader changes, exit on missing config

### Phase 2: UI Bootstrap
1. Add config status hook (`useConfigStatus()`)
2. Modify home screen to detect zero-config
3. Add welcome screen component
4. Hide chat/collections routes when no providers
5. **Rollback:** Restore original home screen, always show routes

### Phase 3: Configuration Builder
1. Implement provider forms (schema-driven)
2. Add configuration state management
3. Implement apply/save workflow
4. **Rollback:** Remove config builder routes, require config file

### Testing Strategy
- Unit tests for zero-config detection
- Integration tests for provider failure scenarios
- E2E tests for complete zero-config → working config flow
- Regression tests for existing config workflows

---

## Open Questions

### Q1: Auto-create fallback response handler when first provider added?

**Context:** Chat requires both working provider AND response handler. When user adds first provider successfully:

**Option A:** Auto-create catch-all response handler
```javascript
// When first LLM provider tested successfully:
{
  "responses": [
    {
      "llm": "chatgpt",           // The provider they just added
      "model": "gpt-3.5-turbo",   // Default/suggested model
      "max_tokens": 500,
      "prompt": "You are a helpful assistant."
    }
  ]
}
```
- ✅ User can chat immediately
- ✅ Sensible defaults
- ❌ Need to pick a model (or suggest one from discovery)
- ❌ Might be unexpected (auto-magic)

**Option B:** Require explicit response handler creation
- ✅ User understands what they're building
- ✅ No surprises
- ❌ Extra step before first chat
- ❌ Might be confusing for beginners

**Option C:** Offer to create handler (prompt)
```javascript
// After first provider tested:
"✓ Provider configured! Would you like to create a response handler to start chatting? [Yes] [Later]"
```
- ✅ User in control
- ✅ Guided experience
- ✅ Clear next step

**Recommendation:** **Option C** - Prompt to create handler after first provider

**Rationale:** Balance between ease-of-use and transparency. User knows what's happening, but path is clear.

### Q2: Should there be a "Getting Started" wizard?
**Options:**
- **A)** Multi-step wizard (choose LLM → configure → test → add RAG)
- **B)** Free-form builder (add whatever you want in any order)
- **Decision:** Start with **B**, can add wizard in Phase 2 if users struggle

### Q2: How to handle config file conflicts?
**Scenario:** User edits config.json manually while server is running with UI changes

**Options:**
- **A)** Auto-reload from file, lose UI changes (with warning)
- **B)** Show diff, let user choose (file vs UI)
- **C)** Lock file while server running (prevent manual edits)

**Recommendation:** **B** - Show diff and let user choose (Phase 5)

### Q3: Should empty config file vs missing config file behave differently?
**Options:**
- **A)** Treat the same (both zero-config)
- **B)** Empty file = error, missing file = zero-config

**Recommendation:** **A** - Simpler, less confusing

### Q4: API authentication for config endpoints?
**Concern:** `/api/config/*` endpoints are powerful, should they require auth?

**Current Decision:** No auth in Phase 1 (dev tool, localhost)  
**Future:** Consider adding API key or session-based auth in production deployments

---

## Summary

The Configuration Builder System enables zero-config startup while maintaining backward compatibility through:

1. **Smart detection**: Missing config = zero-config mode (not error)
2. **Graceful degradation**: Failed providers don't crash server
3. **Dynamic UI**: Routes/features adapt to configuration state
4. **Explicit persistence**: Draft → Apply → Save workflow
5. **Hot-reload**: Configuration changes without restart
6. **Schema-driven**: Providers define their own UI requirements

These decisions balance ease-of-use for new users with reliability for production deployments.

---

## Implementation Notes

### Route File Structure (Decided: Phase 1)

**Decision:** Route files should NOT include redundant path prefixes. The mount point in `server.js` defines the URL namespace.

**Correct Pattern (used in `routes/connections.js`):**
```javascript
// server.js
app.use('/api/connections', connectionsRouter);

// routes/connections.js
router.get('/providers', ...);         // Mounted at /api/connections/providers
router.post('/test', ...);             // Mounted at /api/connections/test
```

**Incorrect Pattern (currently in `routes/collections.js`):**
```javascript
// server.js  
app.use('/api', collectionsRouter);    // ❌ Too broad

// routes/collections.js
router.get('/collections', ...);       // ❌ Redundant prefix
router.get('/ui-config', ...);         // ❌ Unrelated endpoint
```

**Phase 5 Refactoring TODO:**
1. Move `/api/ui-config` from `collections.js` to new `routes/config.js`
2. Change `collections.js` routes from `/collections` to `/`
3. Update server.js: `app.use('/api/collections', collectionsRouter)`

**Rationale:**
- Clear separation of concerns (one file = one resource domain)
- Mount point defines URL namespace, route file defines resource operations
- Easier to find and maintain endpoints

