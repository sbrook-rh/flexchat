# ETL Load Service - Large Document Upload Feature

**Handoff Date:** 2025-11-16  
**Context:** Discovered during JSONL format support implementation  
**Epic:** ETL Service (Load phase)  
**Status:** Planning document for future backend optimization

---

## Current State (2025-11-16)

### What's Been Implemented

**Client-Side Batching with Progress (COMPLETE):**
- Splits large uploads into 1,000 document batches
- Real-time progress bar with animated feedback
- Batch status display: "Uploading batch 3 of 10..."
- Time estimates based on actual batch performance
- Cancel button to abort mid-upload
- Single-batch optimization for <1k document uploads

**Tested Performance:**
- 10,000 documents: 10 batches × ~11 seconds = ~110 seconds total
- Progress bar continuously animates during server processing
- Eliminates "frozen" feeling during uploads
- See: `openspec/changes/add-batch-progress-uploads/` (implemented)

**Current Limits:**
1. Frontend file size limit: 50MB
2. Frontend document count limit: 10,000 documents
3. Backend processes each batch synchronously (~88 docs/sec)

### Why This Document Exists

The client-side batching **solves the UX problem** (progress feedback) but doesn't solve the **performance problem** (speed). This document describes the next step: **async backend processing** for true performance gains.

---

## Problem Statement (Backend Performance)

While client-side batching provides good UX, the backend still processes documents synchronously:

**Current Performance (Batched Wizard):**
- 10,000 documents: ~110 seconds (10 batches × 11s each)
- 40,509 documents: Would take ~450 seconds (7.5 minutes) if limit were raised
- Backend processes documents sequentially
- Each batch waits for: transform → embed → insert (one at a time)
- No parallelization or batch optimization on backend

**Backend Bottleneck:**
- Sequential embedding API calls (40k individual calls for 40k docs)
- Sequential ChromaDB inserts (40k individual inserts)
- No streaming (loads entire batch into memory)
- No parallel processing

---

## Desired End State (ETL Service)

### Architecture: Asynchronous Job-Based Upload

**Flow:**
1. **Client uploads file** to ETL service endpoint with schema
2. **Server returns job ID** immediately (no processing)
3. **Background worker** processes file asynchronously:
   - Streams file (memory efficient)
   - Batch inserts to ChromaDB (1,000 docs at a time)
   - Parallel embedding generation (if supported by provider)
   - Progress tracking (updates job status)
4. **Client polls** job status endpoint for progress
5. **Completion** triggers collection metadata update

### Benefits

**Performance:**
- Stream processing: No 50MB file size limit
- Parallel operations: Embeddings + inserts concurrent
- Batch optimization: Fewer round-trips to ChromaDB (batch API calls)
- **Expected:** 40k docs in 2-3 minutes vs 7.5 minutes (current batched wizard)

**User Experience:**
- Immediate response (job accepted)
- Real-time progress updates
- User can navigate away and check back
- Multiple uploads can run concurrently

**Reliability:**
- Server-side retry logic for failed batches
- Resumable uploads (save progress)
- Detailed error reporting per document
- No browser timeout issues

---

## Implementation Options

### Option A: Minimal (Recommended Start)

**Scope:** Add async upload endpoint to existing RAG wrapper service

**Components:**
- `POST /api/etl/upload` - Accept file, return job ID
- In-memory job tracking (dict with job ID → status)
- Background thread processes file
- `GET /api/etl/jobs/:id` - Poll status endpoint
- Single file processing queue (no concurrency)

**Effort:** 1-2 days  
**Limitations:** Jobs lost on server restart, single queue

### Option B: Production-Ready

**Scope:** Full job queue system with persistence

**Components:**
- Redis/PostgreSQL for job tracking
- Celery/Bull queue for async processing
- Multiple workers for concurrent uploads
- WebSocket for real-time progress (optional)
- Job history and retry logic

**Effort:** 1 week  
**Dependencies:** Redis/PostgreSQL, queue library

### Option C: Cloud-Native

**Scope:** S3 + Lambda/Cloud Functions

**Components:**
- Client uploads to signed S3 URL
- S3 event triggers Lambda function
- Lambda processes file in chunks
- DynamoDB for job tracking
- API Gateway for polling endpoint

**Effort:** 1 week  
**Dependencies:** AWS/GCP account, serverless framework

---

## API Design (Option A)

### 1. Submit Upload Job

```http
POST /api/etl/upload
Content-Type: multipart/form-data

file: <file contents>
collection_name: "openshift-docs"
service: "default"
embedding_connection: "openai-main"
embedding_model: "text-embedding-ada-002"
schema: {
  "text_fields": ["text", "title"],
  "id_field": "id",
  "metadata_fields": ["version", "product"]
}
```

**Response:**
```json
{
  "job_id": "job_2025-11-16_abc123",
  "status": "pending",
  "created_at": "2025-11-16T10:30:00Z",
  "total_documents": 40509
}
```

### 2. Poll Job Status

```http
GET /api/etl/jobs/job_2025-11-16_abc123
```

**Response (in progress):**
```json
{
  "job_id": "job_2025-11-16_abc123",
  "status": "processing",
  "progress": {
    "processed": 15000,
    "total": 40509,
    "percentage": 37,
    "elapsed_seconds": 90,
    "estimated_remaining_seconds": 150
  },
  "created_at": "2025-11-16T10:30:00Z",
  "started_at": "2025-11-16T10:30:02Z"
}
```

**Response (completed):**
```json
{
  "job_id": "job_2025-11-16_abc123",
  "status": "completed",
  "progress": {
    "processed": 40509,
    "total": 40509,
    "percentage": 100
  },
  "created_at": "2025-11-16T10:30:00Z",
  "started_at": "2025-11-16T10:30:02Z",
  "completed_at": "2025-11-16T10:33:30Z",
  "result": {
    "documents_inserted": 40509,
    "documents_failed": 0
  }
}
```

**Response (failed):**
```json
{
  "job_id": "job_2025-11-16_abc123",
  "status": "failed",
  "progress": {
    "processed": 15000,
    "total": 40509,
    "percentage": 37
  },
  "error": {
    "message": "ChromaDB connection lost",
    "failed_at": "2025-11-16T10:32:00Z"
  }
}
```

---

## Frontend Integration

### Upload Flow

```javascript
// 1. Submit upload
const response = await fetch('/api/etl/upload', {
  method: 'POST',
  body: formData
});
const { job_id } = await response.json();

// 2. Poll for progress
const pollInterval = setInterval(async () => {
  const status = await fetch(`/api/etl/jobs/${job_id}`).then(r => r.json());
  
  setProgress({
    percentage: status.progress.percentage,
    processed: status.progress.processed,
    total: status.progress.total,
    estimatedRemaining: status.progress.estimated_remaining_seconds
  });
  
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    onComplete(status.result);
  } else if (status.status === 'failed') {
    clearInterval(pollInterval);
    onError(status.error);
  }
}, 2000); // Poll every 2 seconds
```

---

## Backend Processing Logic

### Pseudo-code

```python
def process_upload_job(job_id, file_path, schema, collection_config):
    """Background worker processes upload job."""
    job = get_job(job_id)
    job.status = "processing"
    job.started_at = now()
    
    try:
        # Stream and parse file
        documents = stream_parse_file(file_path)  # Generator, not list
        total = count_documents(file_path)  # Quick pass for progress
        
        job.progress.total = total
        
        # Process in batches
        batch_size = 1000
        processed = 0
        
        for batch in chunk(documents, batch_size):
            # Transform documents
            transformed = transform_batch(batch, schema)
            
            # Insert to ChromaDB (batch operation)
            insert_documents(collection_config, transformed)
            
            # Update progress
            processed += len(batch)
            job.progress.processed = processed
            job.progress.percentage = int(processed / total * 100)
            
            # Update time estimates
            elapsed = (now() - job.started_at).total_seconds()
            rate = processed / elapsed
            remaining = (total - processed) / rate
            job.progress.estimated_remaining_seconds = int(remaining)
        
        # Mark complete
        job.status = "completed"
        job.completed_at = now()
        job.result = {
            "documents_inserted": processed,
            "documents_failed": 0
        }
        
    except Exception as e:
        job.status = "failed"
        job.error = {
            "message": str(e),
            "failed_at": now()
        }
        raise
```

---

## Performance Optimizations

### 1. Parallel Embedding Generation

If embedding provider supports batch requests:

```python
# Instead of:
for doc in documents:
    embedding = get_embedding(doc.text)  # 40k sequential API calls

# Do:
for batch in chunk(documents, 100):
    embeddings = get_embeddings_batch(batch)  # 405 batch API calls
```

**Expected improvement:** 10-20x faster for embedding generation

### 2. Batch ChromaDB Inserts

```python
# Instead of:
collection.add(documents=[doc], ...)  # 40k insert calls

# Do:
collection.add(documents=batch, ...)  # 40 batch insert calls (1k each)
```

**Expected improvement:** 5-10x faster for inserts

### 3. Stream File Parsing

```python
# Instead of:
content = file.read()  # Load entire 50MB file
documents = parse_jsonl(content)  # 40k docs in memory

# Do:
for line in file:  # Stream line-by-line
    document = parse_json(line)
    yield document  # Generator, constant memory
```

**Expected improvement:** Constant memory usage, no file size limit

---

## Testing Evidence (Actual Performance Data)

**Current Implementation (Client-Side Batching):**
- 10,000 documents: 110 seconds (10 batches × 11s per batch)
- Throughput: ~90 docs/sec
- 40,509 documents: ~450 seconds (7.5 minutes) estimated

**Performance Breakdown:**
- File parsing: <1 second (JSONL is fast) ✓
- Batch upload: ~11 seconds per 1,000 documents (bottleneck)
  - Transform + embed (1,000 sequential API calls) + insert (1,000 individual inserts)
  - Sequential processing within each batch

**Expected With ETL Service Optimizations:**
- Parallel embeddings (batch of 100): 405 API calls vs 40,509 (10-20x faster)
- Batch inserts (1,000 at a time): 41 ChromaDB calls vs 40,509 (5-10x faster)
- Async processing: No frontend waiting
- **Estimated total:** 2-3 minutes for 40k documents (2-3x improvement over current)

---

## Migration Path

### Phase 1: Add ETL endpoint alongside wizard (Future)
- Wizard continues using existing `/api/collections/:name/documents` with client-side batching
- New ETL endpoint available for advanced users or CLI tools
- Frontend detects very large uploads (>10k docs) and suggests ETL endpoint

### Phase 2: Wizard uses ETL for large uploads (Future)
- Wizard automatically routes uploads >5k docs to ETL endpoint
- Small uploads (<5k docs) still use current batched synchronous path
- Progress UI switches to polling job status for ETL uploads

### Phase 3: Full migration (Future)
- All uploads use ETL service for consistency
- Current synchronous endpoint deprecated but kept for backward compatibility
- Documentation updated

---

## Open Questions

1. **Job retention:** How long to keep completed/failed job history?
2. **Concurrency:** How many simultaneous uploads should be supported?
3. **Authentication:** Job ID security (should be UUID? require auth token?)
4. **Embeddings:** Should ETL service call embedding provider directly, or always use RAG wrapper?
5. **Validation:** Should schema validation happen before or during processing?

---

## References

- **Current implementation:** 
  - Backend: `backend/chat/routes/collections.js` (`POST /:service/:name/upload`)
  - Frontend: `frontend/src/DocumentUploadWizard.jsx` (with client-side batching)
- **Testing data:** 10k and 40k document OpenShift documentation JSONL files
- **OpenSpec changes:**
  - `openspec/changes/add-jsonl-format-support/` - JSONL format support (COMPLETE)
  - `openspec/changes/add-batch-progress-uploads/` - Batched uploads with progress (COMPLETE)
- **Git commits:**
  - `c9ca4e7` - Batch progress with animated feedback
  - `5f88b62` - JSONL format support
  - `7a3147f` - Body parser limit increase

---

## Recommendation

**For ETL Epic:**
Start with **Option A (Minimal)** to prove value quickly:
1. Add async endpoint to existing RAG wrapper (`backend/rag/server.py`)
2. In-memory job tracking (acceptable for MVP)
3. Single background thread (Python `threading` or `asyncio`)
4. Frontend wizard detects large uploads and routes to ETL

**Success criteria:**
- 40k document upload completes in <3 minutes
- User sees real-time progress updates
- Server memory usage stays constant (streaming)

**Then iterate:**
- Add Redis for job persistence
- Add proper queue system (Celery/RQ)
- Add retry logic and error recovery
- Scale to multiple workers

---

## Summary

**Current State (Nov 2025):**
The wizard now has excellent UX for up to 10k documents via client-side batching with animated progress. Users get real-time feedback during uploads, eliminating the "frozen" feeling.

**This Document's Purpose:**
Describes the **next optimization step** - async backend processing - for when performance (not just UX) becomes critical. The current wizard works well for up to 10k documents (~2 minutes), but larger datasets or performance-sensitive use cases would benefit from backend optimizations.

**Evidence:** 
- Current: 10k docs in ~110 seconds with great UX
- ETL Service: 40k docs in ~150 seconds (estimated) with backend parallelization

**When to Implement:**
- User feedback indicates 10k limit is too restrictive
- Backend performance becomes bottleneck (>5 concurrent uploads)
- Need for resumable uploads or background processing
- CLI tools need bulk upload capability

Start with minimal async endpoint (1-2 days), validate 2-3x performance improvement, then iterate toward production-ready queue system.

