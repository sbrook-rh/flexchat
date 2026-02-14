# Tool Calling

Flex Chat supports builtin tool calling for LLM providers with function-calling capability. Tools let the model invoke server-side functions (calculator, datetime, UUID) during a response and loop until it produces a final text answer.

---

## How It Works

Tool calling runs as **Phase 6b** — an optional loop that follows the main response phase:

1. A response handler with tools enabled sends the query to the model along with tool schemas.
2. If the model calls a tool, the server executes it and feeds the result back.
3. The loop continues until the model returns a final text response or hits `max_iterations`.

This is transparent to the user — they see the final answer, not the intermediate tool calls.

---

## Available Builtins

| Name | Description | Parameters |
|------|-------------|------------|
| `calculator` | Evaluate a mathematical expression | `expression` (string) |
| `get_current_datetime` | Return current date/time | `timezone` (string, optional — IANA format, e.g. `"America/New_York"`) |
| `generate_uuid` | Generate a random UUID v4 | _(none)_ |

Tool schemas live in server code. Config only names which tools to activate.

---

## Configuration

See [CONFIGURATION.md — Tools Section](./CONFIGURATION.md#tools-section) for the full schema. Quick reference:

```json
{
  "tools": {
    "apply_globally": false,
    "max_iterations": 5,
    "registry": [
      { "name": "calculator" },
      { "name": "get_current_datetime" }
    ]
  }
}
```

---

## apply_globally vs Per-Handler

| Approach | When to use |
|----------|-------------|
| `"apply_globally": true` | All handlers get tools automatically — simplest setup when all your models support function calling. |
| `"apply_globally": false` (default) | Only handlers with `tools.enabled: true` use tools — safer when some handlers use models that don't support function calling. |

Per-handler example:

```json
{
  "llm": "local",
  "model": "qwen2.5:7b-instruct",
  "prompt": "You are a helpful assistant.",
  "tools": {
    "enabled": true,
    "max_iterations": 3
  }
}
```

---

## Restricting Tools Per Handler

Use `allowed_tools` to limit which tools a handler may call:

```json
"tools": {
  "enabled": true,
  "allowed_tools": ["calculator"]
}
```

Omit `allowed_tools` to allow all enabled tools.

---

## Which Models Support Tools

Only models with function-calling capability can use tools. In the Config Builder, compatible models are marked with a **🔧** badge. Attempting to use tools with a non-supporting model will result in a `422` response from `POST /api/tools/test`.

Common examples:
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- **Gemini**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`
- **Ollama**: Model-dependent — check the 🔧 badge in Config Builder

---

## Testing Tools

### Config Builder (recommended)

1. Navigate to the **Tools** tab in the Config Builder.
2. Enable one or more builtins.
3. Open the **inline test panel** and enter a query.
4. Click **Test** — runs against the working config without applying changes.

### API

`POST /api/tools/test` supports two modes:

- **Inline**: Supply `provider_config` + `model` + `query` + optional `registry` — no apply needed.
- **Named provider**: Supply `llm` + `model` + `query` from the running config.

See [API Reference — Tools API](../API_REFERENCE.md#tools-api) for full details.
