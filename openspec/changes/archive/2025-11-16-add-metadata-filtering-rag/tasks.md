# Implementation Tasks

## 1. Backend Implementation
- [x] 1.1 Add `Query` import from fastapi if not present
- [x] 1.2 Add `json` import for filter parsing
- [x] 1.3 Implement `GET /collections/{collection_name}/documents` endpoint
- [x] 1.4 Add `where` parameter parsing with JSON validation
- [x] 1.5 Add `limit` parameter (default 100, max 1000)
- [x] 1.6 Add `offset` parameter (default 0, min 0)
- [x] 1.7 Call ChromaDB `collection.get()` with where filter
- [x] 1.8 Format response: `{documents: [...], count: N, total: N}`
- [x] 1.9 Implement error handling (404 collection not found, 400 invalid JSON, 500 unexpected)

## 2. Testing
- [x] 2.1 Test basic metadata filter (single field equality)
- [x] 2.2 Test complex filter (multiple conditions, $and/$or)
- [x] 2.3 Test collection not found (404 error)
- [x] 2.4 Test invalid JSON filter (400 error)
- [x] 2.5 Test no filter provided (returns all documents up to limit)
- [x] 2.6 Test pagination (limit and offset)
- [x] 2.7 Test empty results (no matches)
- [x] 2.8 Test real use case: semantic search → extract section_id → gather siblings

## 3. Documentation
- [x] 3.1 Update `openplan/data/testing/querying-rag-service-directly.md`
- [x] 3.2 Add "Metadata Filtering" section with examples
- [x] 3.3 Document filter syntax (equality, $in, $and, $or, $ne)
- [x] 3.4 Document sibling gathering workflow example
- [x] 3.5 Add inline code comments explaining filter parsing logic

## 4. Design Documentation
- [x] 4.1 Create design.md documenting low-level API philosophy
- [x] 4.2 Document pass-through approach and rationale
- [x] 4.3 Document recommended helper function pattern
- [x] 4.4 Document ChromaDB syntax constraints ($and requirement)

