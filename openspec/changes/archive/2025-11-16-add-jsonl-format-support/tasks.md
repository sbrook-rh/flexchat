# Implementation Tasks

## 1. Add JSONL Parsing Logic
- [x] 1.1 Add file size check before parsing (get `file.size` from event)
- [x] 1.2 Display warning for files > 10MB
- [x] 1.3 Reject files > 50MB with error message
- [x] 1.4 Add format detection based on `fileName.endsWith('.jsonl')`
- [x] 1.5 Implement JSONL parser (split by newline, filter empty, parse each line)
- [x] 1.6 Track and report skipped empty lines with info message
- [x] 1.7 Include line numbers in parse error messages
- [x] 1.8 Maintain existing JSON array parsing for `.json` files
- [x] 1.9 Add document count limits (10k hard limit, 2k warning with time estimate)
- [x] 1.10 Fix undefined field value handling in FieldMappingStep
- [x] 1.11 Increase backend body-parser limit to 50mb

## 2. Update UI Components
- [x] 2.1 Update file input `accept` attribute to include `.jsonl`
- [x] 2.2 Update help text to mention JSONL support (keep brief)
- [x] 2.3 Add `setParseInfo` state for non-error informational messages (if not already present)

## 3. Testing
- [x] 3.1 Test JSON array upload (regression - ensure unchanged behavior)
- [x] 3.2 Test valid JSONL file upload (11,659 docs - 2.2 min upload time)
- [x] 3.3 Test JSONL with empty lines and trailing newlines
- [x] 3.4 Test JSONL with malformed line (verify line number in error)
- [x] 3.5 Test file size warnings (26.3MB file - warning displayed)
- [x] 3.6 Test file size rejection (50MB threshold)
- [x] 3.7 Test files < 1MB (no warnings)
- [x] 3.8 Test document count warning (>2k docs - time estimate shown)
- [x] 3.9 Test sparse JSONL schema (undefined fields handled correctly)

## 4. Documentation
- [x] 4.1 Add inline comment about JSONL format expectations
- [x] 4.2 Verify help text is clear and concise

