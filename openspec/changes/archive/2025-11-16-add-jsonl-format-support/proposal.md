# Add JSONL Format Support to Document Upload Wizard

## Why

ETL pipelines output JSONL (newline-delimited JSON) format, requiring manual `jq` conversion before files can be uploaded to the Document Upload Wizard. This conversion step was encountered twice during experimentation (2025-11-14), slowing down the workflow.

## What Changes

- Add JSONL format detection based on `.jsonl` file extension
- Parse JSONL files line-by-line, filtering empty lines
- Add file size validation (10MB warning, 50MB hard limit)
- Update file input to accept `.jsonl` extension
- Update help text to mention JSONL support
- Maintain backward compatibility with existing JSON array format

## Impact

- **Affected specs**: `document-upload-ui`
- **Affected code**: `frontend/src/DocumentUploadWizard.jsx` (FileUploadStep component, lines 256-394)
- **Backward compatibility**: Yes - existing JSON array uploads work unchanged
- **Dependencies**: None - frontend-only change
- **Estimated effort**: 1-2 hours

