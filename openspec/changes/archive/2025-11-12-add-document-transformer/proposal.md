# Add Document Transformer

## Why

FlexChat's RAG upload system requires documents in a standardized `{id, text, metadata}` format. Currently, users must manually transform raw JSON data using external tools (jq, custom scripts) before uploading, creating friction in the upload workflow and blocking the Document Upload Wizard feature.

## What Changes

- Add pure transformation function `transformDocuments(documents, schema)` to backend
- Convert raw JSON + schema → standardized `{id, text, metadata}[]` format
- Standalone, testable library function with no external dependencies
- Uses native `crypto.randomUUID()` for ID generation
- Comprehensive test suite with 80%+ coverage

## Impact

**Affected Specs:**
- **NEW**: `document-transformer` (capability being added)
- **FUTURE**: Will enable Enhanced Upload Endpoint and Document Upload Wizard

**Affected Code:**
- `backend/chat/lib/document-transformer.js` (new)
- `backend/chat/__tests__/lib/document-transformer.test.js` (new)

**Breaking Changes:** None (new functionality)

**Dependencies:**
- Node.js v14.17.0+ (project uses v23.9.0)
- Jest v29.7.0 (already configured)
- No new dependencies required

