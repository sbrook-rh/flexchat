# document-upload-ui Spec Deltas

## MODIFIED Requirements

### Requirement: Multi-Format File Parsing
The system SHALL parse both JSON array (.json) and JSONL (.jsonl) file formats with file size validation and clear error reporting.

#### Scenario: Parse JSON array format (existing behavior)
- **GIVEN** user uploads a `.json` file
- **WHEN** the file content is `[{"title": "Doc 1"}, {"title": "Doc 2"}]`
- **THEN** the file is parsed with `JSON.parse()`
- **AND** array validation confirms it contains 2 document objects
- **AND** documents are available in wizard state

#### Scenario: Parse JSONL format
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** the file content is:
  ```
  {"title": "Doc 1"}
  {"title": "Doc 2"}
  ```
- **THEN** the file is parsed line-by-line
- **AND** each line is parsed as a separate JSON object
- **AND** the resulting array contains 2 document objects
- **AND** documents are available in wizard state

#### Scenario: Handle empty lines in JSONL
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** the file contains empty lines or trailing newlines:
  ```
  {"title": "Doc 1"}
  
  {"title": "Doc 2"}
  
  ```
- **THEN** empty lines are filtered out silently
- **AND** an info message displays: "ℹ️ Skipped 2 empty lines. Parsed 2 documents."
- **AND** the resulting array contains only the 2 valid documents

#### Scenario: JSONL parse error with line number
- **GIVEN** user uploads a `.jsonl` file
- **WHEN** line 3 contains malformed JSON: `{"title": "Doc" broken}`
- **THEN** parsing stops at the malformed line
- **AND** error message displays: "Parse error at line 3: [specific JSON error]"
- **AND** wizard state is cleared (rawDocuments set to null)

#### Scenario: Small file (no warnings)
- **GIVEN** user uploads a file
- **WHEN** file size is less than 10MB
- **THEN** file is parsed without any size warnings
- **AND** normal parsing proceeds

#### Scenario: Large file warning
- **GIVEN** user uploads a file
- **WHEN** file size is between 10MB and 50MB (e.g., 15MB)
- **THEN** an info message displays: "⚠️ Large file detected (15.0MB). Parsing may take a few seconds."
- **AND** parsing proceeds normally after the warning

#### Scenario: Oversized file rejection
- **GIVEN** user uploads a file
- **WHEN** file size exceeds 50MB (e.g., 60MB)
- **THEN** an error message displays: "File too large (60.0MB). Maximum size is 50MB. Consider splitting your file or processing in batches."
- **AND** parsing does not proceed
- **AND** wizard state remains unchanged

#### Scenario: File input accepts both formats
- **GIVEN** the file input element is rendered
- **WHEN** inspecting the `accept` attribute
- **THEN** it includes `.json,.jsonl,application/json`
- **AND** file picker shows both JSON and JSONL files

#### Scenario: Help text mentions JSONL support
- **GIVEN** the file upload step is rendered
- **WHEN** viewing the format example section
- **THEN** help text shows JSON array format example
- **AND** includes a brief note: "JSONL (.jsonl) also supported - one JSON object per line."

#### Scenario: Format detection based on extension
- **GIVEN** a file is uploaded
- **WHEN** the filename ends with `.jsonl`
- **THEN** JSONL parsing is used (line-by-line)
- **WHEN** the filename ends with `.json` or any other extension
- **THEN** JSON array parsing is used (single JSON.parse)

#### Scenario: File validation requirements unchanged
- **GIVEN** a file is successfully parsed (either format)
- **WHEN** validation runs
- **THEN** the result must be an array
- **AND** the array must contain at least one document
- **AND** all items must be objects (not null, not primitives)
- **AND** same validation rules apply regardless of format

