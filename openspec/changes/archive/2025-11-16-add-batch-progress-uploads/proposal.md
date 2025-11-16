# Add Batch Progress for Large Document Uploads

## Why

Large JSONL uploads (>2,000 documents) currently send all documents in a single request, causing long wait times with no feedback. A 11,659 document upload takes 2.2 minutes, and 40,000+ document uploads take 8+ minutes with no progress indication.

**Evidence from testing (2025-11-16):**
- 11,659 docs: 2.2 minutes (88 docs/sec)
- 40,509 docs: 8+ minutes estimated (user abandoned)
- No progress feedback, no cancel option, appears frozen

## What Changes

- Split large uploads into batches of 1,000 documents
- Display progress bar with batch status ("Uploading batch 3 of 12...")
- Show percentage complete and estimated time remaining
- Add cancel button to abort in-progress uploads
- Maintain backward compatibility for small uploads (<1,000 docs)

## Impact

- **Affected specs**: `document-upload-ui`
- **Affected code**: `frontend/src/DocumentUploadWizard.jsx` (PreviewStep component, handleUpload function)
- **Backward compatibility**: Yes - single batch for <1,000 documents
- **Dependencies**: None - frontend-only enhancement
- **Estimated effort**: 2-3 hours
- **Performance**: Same total time, better UX with progress feedback

## Trade-offs

**Benefits:**
- User can see progress and cancel if needed
- Reduces perceived wait time with feedback
- Better error handling (partial success possible)

**Drawbacks:**
- Slightly more network overhead (multiple requests)
- More complex state management
- Backend sees N requests instead of 1 (but same total load)

