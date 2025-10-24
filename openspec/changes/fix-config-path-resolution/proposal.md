# Fix Config Path Resolution

## Why
The current `resolveConfigPath` method in `backend/chat/lib/config-loader.js` has a critical flaw: when a relative path is provided via CLI argument, it resolves the path relative to `process.cwd()` (current working directory) instead of using the project root or the `FLEX_CHAT_CONFIG_DIR` environment variable. This causes configuration files to be found incorrectly when running the server from different directories.

**Current Problem:**
- Running from `/Users/sbrook/Projects/flex-chat/backend/chat` with `--config config/examples/05-gemini-multi-llm.json` fails because it looks for the config in `/Users/sbrook/Projects/flex-chat/backend/chat/config/examples/05-gemini-multi-llm.json` instead of the correct location at `/Users/sbrook/Projects/flex-chat/config/examples/05-gemini-multi-llm.json`

## What Changes
- **MODIFIED** `resolveConfigPath` method to properly resolve relative paths using `FLEX_CHAT_CONFIG_DIR` as base directory
- **ADDED** logic to combine `FLEX_CHAT_CONFIG_DIR` + `FLEX_CHAT_CONFIG_FILE` when both are set
- **IMPROVED** path resolution to handle both file and directory arguments correctly
- **MAINTAINED** backward compatibility with existing absolute path and environment variable usage

## Impact
- **Affected specs**: config-loader capability
- **Affected code**: 
  - `backend/chat/lib/config-loader.js` (resolveConfigPath function)
- **Breaking changes**: None - maintains backward compatibility
- **Dependencies**: None

## Success Criteria
- Server can be started from any directory with relative config paths
- `FLEX_CHAT_CONFIG_DIR` environment variable is properly respected
- Absolute paths continue to work as before
- Environment variable fallbacks work as expected
