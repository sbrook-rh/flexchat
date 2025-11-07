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

**Security Pattern:**
- UI never accepts actual API keys (only env var names)
- Dropdown shows available env vars (by name, never value)
- Auto-wraps user input with `${}` syntax
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

### Decision 14: Auto-Wrap Environment Variables and Dynamic Suggestions

**Decision:** Automatically wrap user input with `${}` syntax when they tab out of secret fields, and display dynamic env var suggestions from the backend.

**Rationale:** Users were confused about needing to type `${VARNAME}` manually. Auto-wrapping on blur reduces cognitive load while maintaining flexibility for users who type the full syntax. Dynamic suggestions from `GET /api/connections/env-vars` show which vars are actually available vs. just schema suggestions.

**Implications:**
- `onBlur` handler checks if input starts with `${` and auto-wraps if not
- Fetch available env vars on wizard mount
- Display static (blue) and dynamic (green checkmark) suggestions
- Filter suggestions by field name and provider name relevance
- Limit to top 3 suggestions to avoid UI clutter
- Show tooltip explaining auto-wrap behavior

**UX Flow:**
1. User types "OPENAI_API_KEY" in secret field
2. User tabs to next field → auto-wraps to `${OPENAI_API_KEY}`
3. Or user clicks green "✓ $OPENAI_API_KEY" button → fills `${OPENAI_API_KEY}`

---

### Decision 15: Separate LLM and RAG Workflows with Auto-Generated Response Handler

**Decision:** Split "Add Provider" into separate "Add LLM Provider" and "Add RAG Service" actions, remove provider type selection step, and automatically create a default response handler when adding the first LLM.

**Rationale:** 
- Asking users to choose "LLM or RAG?" is confusing - they usually know which they want to add
- Having separate buttons makes intent clearer and reduces wizard steps
- Without a response handler, users can't Apply their config (validation fails)
- Auto-creating a basic response handler on first LLM addition solves validation blocker
- Users get a working chat immediately without needing Phase 4 (Response Handler Builder)

**Implications:**
- Split ProviderList into two sections: "LLM Providers" and "RAG Services"
- Each section has its own "Add" button
- ConnectionWizard accepts `initialType` prop to skip Step 1 (type selection)
- Add Step 4 to LLM wizard: "Select Default Model" (from discovered models)
- First LLM saves creates default response handler:
  ```json
  {
    "llm": "provider_name",
    "model": "selected_model",
    "prompt": "You are a helpful AI assistant."
  }
  ```
  Note: The prompt is a system prompt only. User queries are appended by the provider's chat handler as message objects with `role: "user"`. Variables like `{{rag_context}}` are only added when RAG is configured (Phase 4).
- Subsequent LLMs do not auto-create handlers (Phase 4 will allow manual management)

**UX Flow:**
1. User clicks "Add LLM Provider" (no type selection needed)
2. Select Provider (Ollama, OpenAI, Gemini)
3. Configure (API key, base URL)
4. Test & Discover Models
5. **NEW: Select Default Model** (from discovered models list)
6. Name & Save → auto-creates response handler if first LLM

**Benefits:**
- Clearer UX (intent-driven buttons)
- One fewer wizard step (no type selection)
- Immediate working configuration (validation passes)
- No validation blocker preventing Apply
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

---

### Decision 16: Frontend Static Data Caching

**Problem:** LLMWizard and RAGWizard each fetch `/api/connections/providers` on mount, causing duplicate requests for essentially static data.

**Current Behavior:**
- Every wizard open = new fetch to `/api/connections/providers`
- Every wizard open = new fetch to `/api/connections/env-vars` (if implemented)
- Data doesn't change during session (backend caches for 5 minutes anyway)

**Decision:** Fetch static data once at ConfigBuilder level, pass as props to wizards

**Implementation:**
```javascript
// ConfigBuilder.jsx
const [staticData, setStaticData] = useState(null);

useEffect(() => {
  Promise.all([
    fetch('/api/connections/providers').then(r => r.json()),
    fetch('/api/connections/env-vars').then(r => r.json())
  ]).then(([providers, envVars]) => {
    setStaticData({ providers, envVars });
  });
}, []);

// Pass to wizards
<LLMWizard 
  llmProviders={staticData?.providers.llm}
  envVars={staticData?.envVars}
  ... 
/>

<RAGWizard 
  ragProviders={staticData?.providers.rag}
  envVars={staticData?.envVars}
  ... 
/>
```

**Benefits:**
- ✅ Eliminates duplicate network requests
- ✅ Faster wizard open (no loading state for providers)
- ✅ Simpler wizard code (no fetch logic)
- ✅ Consistent data across wizards
- ✅ Single source of truth

**Deferred to:** Phase 3 (Performance & UX Polish)

**Rationale:** Current behavior works correctly, just not optimally. Backend caching (5min TTL) mitigates the issue. Frontend optimization is a nice-to-have improvement, not blocking Phase 2 completion.

---

### Decision 17: Store Default Model in LLM Configuration

**Context:**  
During the LLM wizard, users select a preferred model, but this selection was only used for the auto-generated response handler (first LLM only). The selected model information was discarded for subsequent providers.

**Decision:**  
Store the user's selected model as a `default_model` field in the LLM provider configuration:

```json
{
  "llms": {
    "ollama": {
      "provider": "ollama",
      "baseUrl": "http://localhost:11434",
      "default_model": "qwen2.5:3b-instruct"
    }
  }
}
```

**Rationale:**
- Preserves user's model preference for future use
- Useful for UI hints (e.g., "Recommended: qwen2.5:3b-instruct")
- Could be used for auto-suggesting models in response handler forms
- Makes configuration more complete and self-documenting
- No breaking change - field is optional, ignored by current provider initialization
- Low implementation cost (single line in `ConfigBuilder.jsx`)

**Future Uses:**
- Phase 3: Auto-populate model dropdown in response handler editor
- Phase 3: Show "default" badge in model selection UIs
- Phase 4: Support provider-level default for response handlers without explicit model

---

### Decision 18: Provider Abstraction - Split LLM and RAG Management

**Context:**  
The original `ProviderList.jsx` component handled both LLM and RAG providers using type-conditional logic (`provider.type === 'llm'`). This created confusion and made the code harder to reason about. Backend endpoints also used a generic `/api/connections/test` with type discrimination.

**Decision:**  
Complete separation of LLM and RAG provider management:

**Frontend:**
- Split `ProviderList.jsx` → `LLMProviderList.jsx` + `RAGProviderList.jsx`
- Split ConfigBuilder handlers:
  - `handleEditProvider` → `handleEditLLMProvider` + `handleEditRAGService`
  - `handleDeleteProvider` → `handleDeleteLLMProvider` + `handleDeleteRAGService`
  - `handleWizardSave` → `handleLLMSave` + `handleRAGSave`
- Update sections to use type-specific components

**Backend:**
- Split endpoints:
  - `POST /api/connections/test` → `POST /api/connections/llm/test` + `POST /api/connections/rag/test`
  - `POST /api/connections/providers/:id/models` → `POST /api/connections/llm/discovery/models`
- Update `normalizeConnectionPayload` to accept `implicitType` parameter
- Keep shared utilities (env var processing, validation) DRY

**Benefits:**
- ✅ Eliminates type-conditional logic
- ✅ Clearer component responsibilities
- ✅ Better type safety and error messages
- ✅ Easier to add type-specific features
- ✅ Fixed delete provider bug (immutability issue)

**Trade-offs:**
- ❌ More files/functions (but each is simpler)
- ❌ Shared utilities still needed for common tasks

**Implemented:** Phase 3c.1

---

### Decision 19: Topic Detection as Separate Navigation Tab

**Context:**  
Initial plan (task 3b.5) suggested adding Topic Detection as a subsection within the Intent tab. However, topic and intent serve different purposes in the chat flow, and topic detection is used independently of intent configuration.

**Decision:**  
Implement Topic Detection as a separate top-level navigation tab with:
- Dedicated icon (🎯) - moved from Intent
- Intent icon changed to 🧐
- Provider and model selector
- Chat-only model filtering (excludes reasoning/audio/video/embedding)
- Static hint for model recommendations
- Auto-correction if configured provider is deleted
- Warning banner for invalid provider references

**Rationale:**
- Topic detection runs for every chat message (Phase 1 of 6)
- Intent detection is optional and runs separately (Phase 3 of 6)
- Users may want topic detection without intent detection
- Separate tab provides better visual hierarchy
- Follows pattern of separate tabs for each major configuration area

**Implemented:** Phase 3b.5

---

### Decision 20: Model Caching at ConfigBuilder Level

**Context:**  
The Topic Detection UI and LLM Wizard both fetch models from the same providers. Initially, each component managed its own models state, causing duplicate API calls when switching between sections or opening/closing wizards.

**Decision:**  
Lift models cache to `ConfigBuilder.jsx` and pass it down as props:

```javascript
const [modelsCache, setModelsCache] = useState({});
// Shape: { [providerId]: { models: [...], loading: bool, error: string } }

<TopicSection
  modelsCache={modelsCache}
  setModelsCache={setModelsCache}
  ...
/>
```

**Benefits:**
- ✅ Eliminates duplicate API calls
- ✅ Persists models across tab switches
- ✅ Faster UI (no loading spinner after first fetch)
- ✅ Single source of truth for model data

**Future Enhancement:**
- Could extend to LLMWizard to share cache globally
- Could add TTL or invalidation on provider config changes

**Implemented:** Phase 3b.5.6

---

### Decision 21: Referential Integrity Validation

**Context:**  
Configuration can reference LLM providers in multiple places (`topic.provider.llm`, `intent.provider.llm`, `responses[].llm`). If a user deletes a provider, these references become invalid ("dangling references"), but validation didn't catch this.

**Decision:**  
Add explicit referential integrity checks to `POST /api/config/validate`:

1. Check `config.topic?.provider?.llm` exists in `config.llms`
2. Check `config.intent?.provider?.llm` exists in `config.llms`
3. Check each `config.responses[].llm` exists in `config.llms`
4. Return clear error messages: `"Topic detection references non-existent LLM provider: openai"`

**UI Behavior:**
- Display validation errors in ConfigBuilder
- Disable Apply/Export until errors resolved
- Show warning banner in TopicSection if auto-corrected

**Rationale:**
- Prevents runtime errors from invalid config
- Catches issues before user applies configuration
- Clear error messages guide user to fix

**Implemented:** Phase 3c.2

---

### Decision 22: Auto-Create New Chat on Provider Changes

**Context:**  
After applying a configuration that adds/removes/renames LLM or RAG providers, users return to chat and see their previous session - which may have been created with a different configuration. This is confusing and may lead to errors if the old session references deleted providers.

**Decision:**  
Automatically create a new, empty chat session when provider changes are applied:

**Flow:**
1. `ConfigBuilder.handleApply()` detects provider changes using `hasProviderChanges(oldConfig, newConfig)`
2. Sets `sessionStorage.setItem('createNewChat', 'true')` if changes detected
3. `Chat.jsx` checks flag on mount:
   - Creates new session
   - Switches to new session
   - Removes flag
4. `ChatHistory.jsx` cleans up empty sessions when switching away

**Benefits:**
- ✅ Clean slate for new configuration
- ✅ Avoids confusion from old session context
- ✅ Prevents errors from referencing deleted providers
- ✅ User can still access old sessions from history

**Trade-offs:**
- ❌ User's active session is replaced (but kept in history)
- ✅ Mitigated: Only happens on *provider* changes, not other config edits

**Implemented:** Phase 3c.6

---

### Decision 23: Auto-Update Chat Titles from Topic

**Context:**  
New chats start with title "New Chat" and never update unless manually edited. However, the system detects conversation topics, which provide better context than a generic title.

**Decision:**  
Automatically update chat title from detected topic for new conversations:

**Rules:**
1. Add `titleManuallyEdited: false` flag to sessions
2. Set flag to `true` when user manually renames
3. Auto-update `session.title = topic` if:
   - `!session.titleManuallyEdited`
   - `session.metadata.messageCount < 5` (configurable threshold)
   - `topic` is not empty
4. Respect manual edits (never overwrite if flag is true)

**Benefits:**
- ✅ Better UX - meaningful titles without manual work
- ✅ Respects user intent if they rename
- ✅ Only affects new conversations (< 5 messages)
- ✅ Helps users identify chats in history

**Trade-offs:**
- ❌ Threshold (5 messages) is somewhat arbitrary
- ✅ Can be adjusted easily if needed

**Implemented:** Phase 3c.5

---

### Decision 26: Modal-Based Intent Testing with Collection Selection

**Context:**
Need a way to test intent classification with the configured model before deployment. The test should simulate production behavior including how RAG collections appear as intent categories when they have partial matches.

**Options Considered:**

**A) Inline test UI with auto-include all collections**
- Pro: Simple, one-click testing
- Con: Can't control which collections are tested
- Con: Clutters main config screen
- Con: Can't test "intents only" vs "intents + collections" scenarios

**B) Modal with optional collection selection (CHOSEN)**
- Pro: User controls test scenario
- Pro: Clean main UI (simple "Test" button)
- Pro: Shows which collections are available from applied config
- Con: Extra click to open modal
- Pro: Educational - demonstrates how collections become intent options

**C) Separate test page**
- Pro: Maximum space for testing
- Con: Navigation overhead
- Con: Loses context of what's being configured

**Decision:**
Implement modal-based tester (Option B) with:
1. Simple "Test" button in main Intent section
2. Modal shows configured provider/model being tested
3. Optional checkboxes to include collections from applied config
4. Clear note explaining applied-config-only limitation
5. Results show breakdown of categories tested (intent_count, collection_count)

**Rationale:**
- Balances discoverability with UI cleanliness
- Provides educational value by showing hierarchical matching
- Allows testing different scenarios (with/without collections)
- Fetches from `/api/ui-config` to show "real" collections that exist

**Trade-offs:**
- ✅ Clean main UI
- ✅ Flexible testing scenarios
- ✅ Shows production-like behavior
- ❌ Applied config only (can't test unsaved RAG services)
- ✅ Educational about how intents and collections interact

**Implemented:** Phase 3b.4

---

### Decision 27: Hierarchical Intent Detection via Collection Descriptions

**Context:**
During testing, discovered that the system demonstrates intelligent hierarchical intent matching when RAG collections are included as categories.

**Discovery:**
When a user query matches both a general intent and a specific RAG collection:
- **Without collection selected:** LLM chooses general intent (e.g., "cooking")
- **With collection selected:** LLM chooses specific match (e.g., "recipes/tofu-magic")

**Example:**
Query: "I need a tofu recipe for dinner"

Test 1 (3 intents, 0 collections):
- Categories: support, subscriptions, cooking, other
- Result: **cooking** (general match)

Test 2 (3 intents, 1 collection):
- Categories: support, subscriptions, cooking, recipes/tofu-magic, other
- Result: **recipes/tofu-magic** (specific match)

**Implications:**
1. **General intents** act as catch-all categories
2. **RAG collection descriptions** provide specificity when selected
3. **LLM naturally prioritizes** the most specific match
4. **System is self-organizing**: more specific categories "win" when available

**Design Pattern:**
This validates the architectural decision to:
- Keep configured intents broad (support, billing, cooking)
- Rely on RAG collection descriptions for specificity
- Dynamically build category list based on selected collections
- Let LLM intelligence handle the hierarchical matching

**Benefits:**
- ✅ Users don't need to configure every possible specific intent
- ✅ Collection descriptions serve dual purpose (RAG + intent)
- ✅ System adapts based on which collections are selected
- ✅ Natural fallback to general categories when specific ones unavailable

**Production Behavior:**
In actual chat flow:
1. User selects collections (e.g., "tofu-magic", "comfort-soups")
2. Intent classifier sees: [configured intents] + [selected collection descriptions] + ["other"]
3. LLM picks most specific match
4. If "recipes/tofu-magic" wins → query that collection
5. If "cooking" wins → use general cooking response handler
6. If "other" wins → use default response handler

**Implemented:** Validated in Phase 3b.4-3b.6

---

### Decision 28: Optimized Classification Prompt Format

**Context:**
Initial prompt format worked but produced inconsistent results across different models, especially small models like gemma:1b. Some models would return "other" even for clear matches, while others would invent new category names.

**Testing Process:**
Systematically tested 4 different prompt formats with 3 models (gemma:1b, qwen2.5:1.5b, phi3:mini):
- Option 1: "Classify this query" (direct, simplified)
- Option 2: "Which category best matches" (numbered list)
- Option 3: "What category does this belong to" (question format)
- Option 4: "Task: Select the matching category" (instruction-first)

**Results:**

| Prompt | gemma:1b | qwen2.5:1.5b | phi3:mini | Speed |
|--------|----------|--------------|-----------|-------|
| Option 1 | ❌ "other" | ✅ correct | ✅ correct | Medium |
| Option 2 | ⚠️ "recipes/tofu" | ✅ correct | ✅ correct | Mixed |
| Option 3 | ✅ correct | ✅ "Category: X" | ⚠️ verbose | Fast |
| Option 4 | ✅ correct | ✅ correct | ✅ correct | **Instant** |

**Decision:**
Use Option 4 format across all intent classification:

```
Task: Select the matching category.

Query: "{user_query}"

Categories:
• category-name: description
• category-name: description
• other: Query doesn't fit any category

Reply with one category name only.
```

**Key Changes:**
1. **Concise instruction**: "Task: Select..." instead of "You are classifying..."
2. **Query first**: Show what needs classification upfront
3. **Bullet points**: Use `•` instead of `-` or numbered lists
4. **Simple directive**: "Reply with one category name only" (positive instruction)
5. **Removed negatives**: No "DO NOT invent" or "DO NOT modify" (models respond better to positive instructions)

**Updated Files:**
- `backend/chat/routes/connections.js` (test endpoint)
- `backend/chat/lib/intent-detector.js` (production)
- `backend/chat/lib/profile-builder.js` (ETL profile building)

**Results:**
- ✅ All models return correct answer instantly
- ✅ gemma:1b now works reliably (was failing before)
- ✅ Consistent format across test and production
- ✅ No invented category names
- ✅ Deterministic with temperature 0.1

**Trade-offs:**
- ✅ Universal compatibility across model sizes
- ✅ Faster responses (simpler parsing)
- ✅ More predictable behavior
- ✅ Better UX with instant results

**Implemented:** Phase 3b.6

---

### Decision 29: Improved Fast Model Detection

**Context:**
Lightning bolt (⚡) indicator was missing for 1b models (e.g., `gemma:1b`, `qwen2:1b`) because detection only checked for hardcoded strings "1.5b", "3b", and "mini".

**Problem:**
```javascript
// Old detection (missed 1b models)
return name.includes('1.5b') || name.includes('3b') || name.includes('mini');
```

**Decision:**
Use regex to extract parameter count and check if ≤3B:

```javascript
// New detection (catches all small models)
const paramMatch = name.match(/(\d+\.?\d*)b/);
if (paramMatch) {
  const params = parseFloat(paramMatch[1]);
  if (params <= 3) return true;  // 0.5b, 1b, 1.5b, 3b all detected
}
return name.includes('mini');  // Also catch named "mini" models
```

**Benefits:**
- ✅ Catches 0.5b models (e.g., `qwen2.5:0.5b`)
- ✅ Catches 1b models (e.g., `gemma:1b`) ← **FIXED**
- ✅ Catches 1.5b models (as before)
- ✅ Catches 3b models (as before)
- ✅ Extensible to any parameter size (just change threshold)
- ✅ More robust than string matching

**Updated Files:**
- `frontend/src/sections/IntentSection.jsx`
- `frontend/src/sections/TopicSection.jsx`

**Future Enhancement:**
This is a stepping stone toward full model classification system (see `docs/MODEL_CLASSIFICATION_ENHANCEMENT.md`) which will add:
- Size classes (tiny, small, medium, large, xlarge)
- Variant detection (base, instruct, chat)
- Capability badges (text, vision, reasoning)
- Web scraping for accurate metadata

**Implemented:** Phase 3b.2.5

---

