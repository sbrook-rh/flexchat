# Configuration Builder System - Testing Guide

This document provides manual integration tests for the Configuration Builder System backend endpoints.

## Prerequisites

- FLEX_CHAT_CONFIG_DIR set (in backend/chat/.env) to point to config directory
- Server running: `node server.js --config config-simon.json` (from `backend/chat/`)
- Or from repo root: `./start.sh --config config/config-simon.json`
- For OpenAI tests: `export OPENAI_API_KEY=your-key-here` before starting server
- For Ollama tests: Ollama running on `http://127.0.0.1:11434`

## Phase 1 Backend Tests

### Health Check
```bash
curl -s http://localhost:5005/health | jq
```
**Expected:** Status OK, config loaded, providers listed

### Provider Discovery
```bash
curl -s http://localhost:5005/api/connections/providers | jq
```
**Expected:** JSON with `llm` and `rag` arrays, each provider includes `id`, `display_name`, `description`, and full `schema`

### Provider Schema
```bash
curl -s 'http://localhost:5005/api/connections/providers/openai/schema?type=llm' | jq
```
**Expected:** Schema object with `fields` array defining configuration requirements

### Environment Variable Suggestions
```bash
curl -s http://localhost:5005/api/connections/env-vars/suggestions | jq
```
**Expected:** List of available environment variables with metadata

## Phase 2 Backend Tests

### Connection Test (Shared Payload)
Test Ollama connection using the new shared connection payload format:
```bash
curl -s -X POST 'http://localhost:5005/api/connections/test' \
  -H 'Content-Type: application/json' \
  -d '{
    "connection": {
      "provider_id": "ollama",
      "type": "llm",
      "fields": {
        "provider": "ollama",
        "baseUrl": "http://127.0.0.1:11434"
      }
    }
  }' | jq
```
**Expected:**
```json
{
  "success": true,
  "provider": "ollama",
  "type": "llm",
  "duration": 18,
  "method": "healthCheck",
  "details": {
    "status": "healthy",
    "provider": "Ollama",
    "timestamp": "2025-10-28T12:02:30.711Z"
  }
}
```

Test OpenAI connection (requires `OPENAI_API_KEY` in server environment):
```bash
curl -s -X POST 'http://localhost:5005/api/connections/test' \
  -H 'Content-Type: application/json' \
  -d '{
    "connection": {
      "provider_id": "openai",
      "type": "llm",
      "fields": {
        "provider": "openai",
        "api_key": "${OPENAI_API_KEY}",
        "base_url": "https://api.openai.com/v1"
      }
    }
  }' | jq
```
**Expected:** `"success": true` with connection details

### Model Discovery (Shared Payload)
Discover available models from Ollama:
```bash
curl -s -X POST 'http://localhost:5005/api/connections/providers/ollama/models' \
  -H 'Content-Type: application/json' \
  -d '{
    "connection": {
      "provider_id": "ollama",
      "type": "llm",
      "fields": {
        "provider": "ollama",
        "baseUrl": "http://127.0.0.1:11434"
      }
    }
  }' | jq
```
**Expected:** JSON with `provider`, `count`, and `models` array containing available models with metadata

Discover OpenAI models (requires `OPENAI_API_KEY` in server environment):
```bash
curl -s -X POST 'http://localhost:5005/api/connections/providers/openai/models' \
  -H 'Content-Type: application/json' \
  -d '{
    "connection": {
      "provider_id": "openai",
      "type": "llm",
      "fields": {
        "provider": "openai",
        "api_key": "${OPENAI_API_KEY}",
        "base_url": "https://api.openai.com/v1"
      }
    }
  }' | jq
```
**Expected:** List of OpenAI models (gpt-4, gpt-3.5-turbo, etc.)

### Configuration Validation

Validate a complete, valid configuration:
```bash
curl -s -X POST http://localhost:5005/api/config/validate \
  -H 'Content-Type: application/json' \
  --data-binary @config/config-simon.json | jq
```
**Expected:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

Validate an invalid configuration (nonexistent provider):
```bash
curl -s -X POST http://localhost:5005/api/config/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "llms": {
      "test": {
        "provider": "nonexistent",
        "api_key": "test"
      }
    }
  }' | jq
```
**Expected:**
```json
{
  "valid": false,
  "errors": [
    "LLM 'test': Provider 'nonexistent' not found. Available providers: openai, ollama, gemini"
  ],
  "warnings": [
    "No response handlers configured"
  ]
}
```

Validate minimal configuration (warnings only):
```bash
curl -s -X POST http://localhost:5005/api/config/validate \
  -H 'Content-Type: application/json' \
  -d '{}' | jq
```
**Expected:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "No LLM providers configured",
    "No response handlers configured"
  ]
}
```

## Backward Compatibility Tests

The endpoints support legacy payload formats for compatibility:

### Legacy Connection Test Format
```bash
curl -s -X POST 'http://localhost:5005/api/connections/test' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "llm",
    "provider": "ollama",
    "config": {
      "provider": "ollama",
      "baseUrl": "http://127.0.0.1:11434"
    }
  }' | jq
```
**Expected:** Same success response as new format

### Legacy Model Discovery Format
```bash
curl -s -X POST 'http://localhost:5005/api/connections/providers/ollama/models' \
  -H 'Content-Type: application/json' \
  -d '{
    "config": {
      "provider": "ollama",
      "baseUrl": "http://127.0.0.1:11434"
    }
  }' | jq
```
**Expected:** Same model list as new format

## Common Issues

### "Provider validation failed"
- Ensure environment variables are set **before** starting the Node server
- Restart server after exporting new env vars
- Check `${ENV_VAR}` placeholders are correctly resolved

### "Connection refused" for Ollama
- Ensure Ollama is running: `ollama serve`
- Verify baseUrl: `http://127.0.0.1:11434` (or your custom port)

### Empty model list
- For Ollama: Check models are pulled (`ollama list`)
- For OpenAI: Verify API key has correct permissions

## Test Results (2025-10-28)

All Phase 2 backend foundation tests passing:
- ✅ Health endpoint
- ✅ Provider discovery
- ✅ Provider schema retrieval
- ✅ Connection testing (new shared payload)
- ✅ Model discovery (new shared payload)
- ✅ Configuration validation (valid configs)
- ✅ Configuration validation (error detection)
- ✅ Backward compatibility (legacy formats)

