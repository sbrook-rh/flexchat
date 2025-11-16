# Design Notes

## Context

JSONL format support implementation revealed performance limitations with large document uploads during testing.

## Problem Discovery

**Testing Results (2025-11-16):**
- 11,659 documents: 2.2 minutes upload time
- 40,509 documents: 8+ minutes (user abandoned)
- Bottleneck: Backend synchronous document processing (88 docs/sec)

## Design Decisions

### 1. Pragmatic Limits (Implemented)

**Decision:** Add document count limits to current wizard
- Hard limit: 10,000 documents per upload
- Warning: 2,000+ documents (show time estimate)

**Rationale:**
- Keeps current change scoped (frontend-only)
- Provides user feedback without backend changes
- Sets reasonable expectations for wizard UX
- Prevents extremely long waits

**Trade-offs:**
- Doesn't solve underlying performance issue
- Users with 10k+ documents still need workarounds
- But: Unblocks JSONL support now, defers optimization

### 2. Undefined Field Handling

**Decision:** Display `(undefined)` for missing fields in FieldMappingStep

**Rationale:**
- JSONL files often have sparse schemas (not all documents have all fields)
- Previous code crashed on `JSON.stringify(undefined).substring()`
- Graceful handling improves robustness

### 3. Backend Body Size Limit

**Decision:** Increase Express body-parser limit from 100KB to 50MB

**Rationale:**
- Frontend enforces 50MB file size limit
- Backend must accept what frontend sends
- Alignment prevents confusing errors

**Trade-offs:**
- Increases server memory usage per request
- But: Necessary for feature to work

## Future Architecture Options

### Option 1: Client-Side Batching (Next)

**See:** `openspec/changes/add-batch-progress-uploads/`

**Approach:** Frontend splits large uploads into 1,000 doc batches
- Progress bar with batch status
- Time estimates and cancel button
- No backend changes needed

**Pros:** Better UX, works with current backend  
**Cons:** Still limited by sequential processing  
**Effort:** 2-3 hours  
**When:** Next iteration

### Option 2: Async ETL Service (Long-term)

**See:** `openspec/changes/add-jsonl-format-support/etl-handoff-prompt.md`

**Approach:** Job-based async upload with background processing
- Client uploads file, gets job ID immediately
- Server processes asynchronously with streaming
- Batch inserts, parallel embeddings
- Client polls for progress

**Pros:** Scalable, no frontend limits, proper architecture  
**Cons:** Requires backend queue system  
**Effort:** 1-2 days (minimal) to 1 week (production-ready)  
**When:** Part of ETL service epic

## Performance Analysis

**Current (Synchronous):**
```
11,659 docs × (transform + embed + insert) = 132 seconds
Rate: 88 docs/sec
```

**With Batching (Option 1):**
```
Same total time, but with progress feedback
Still 88 docs/sec, better perceived performance
```

**With ETL Service (Option 2):**
```
Batch embeddings: 40k docs / 100 per batch = 405 API calls (vs 40k)
Batch inserts: 40k docs / 1000 per batch = 41 inserts (vs 40k)
Parallel processing: embeddings + inserts concurrent
Expected: 300-400 docs/sec (3-4x improvement)
40k docs in 2-3 minutes instead of 8+
```

## Lessons Learned

1. **Test with real data:** 26MB file uncovered multiple issues
2. **Sparse schemas are common:** JSONL from ETL often has optional fields
3. **Performance limits matter:** 88 docs/sec means 10k docs = 2 minutes
4. **Progressive enhancement works:** Add limits now, optimize later
5. **Document evidence:** Performance numbers guide future work

## References

- Testing data: OpenShift 4.20 documentation (11k and 40k document JSONL files)
- Performance baseline: 88 documents/second observed
- Follow-up proposals: `add-batch-progress-uploads/`, ETL handoff prompt

