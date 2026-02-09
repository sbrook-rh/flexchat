# Design Notes

## Re-model: Why Only When Empty?

Embedding models are **dimension-specific**. A collection created with `text-embedding-ada-002` (1536 dimensions) cannot accept embeddings from `text-embedding-3-large` (3072 dimensions). ChromaDB enforces this at the vector level.

**Consequences:**
- If we allowed re-modeling non-empty collections, all existing documents would become invalid
- We'd need to re-embed all documents (expensive, time-consuming)
- Users would lose semantic search capability until re-embedding completes

**Decision:** Only allow changing embedding model when `count === 0`.

**Future consideration:** If users request re-modeling with documents, we could:
1. Offer to empty the collection first (destructive)
2. Implement async re-embedding (complex, requires job queue)
3. Suggest creating a new collection (simplest)

## Empty vs Delete

**Delete collection** (`DELETE /collections/:name`):
- Removes the entire collection from ChromaDB
- Loses all metadata (display_name, description, thresholds, query_profile)
- Requires full recreation

**Empty collection** (`DELETE /collections/:name/documents/all`):
- Removes only documents
- Preserves metadata, settings, query profiles
- Allows re-upload without reconfiguration

**Use case comparison:**
- Empty: "I uploaded the wrong documents, let me try again"
- Delete: "I don't need this collection anymore"

## Empty Implementation: Two-Step Process

ChromaDB's `collection.delete()` requires explicit document IDs. There's no built-in "delete all" method.

**Approach:**
```python
# Step 1: Get all document IDs
results = collection.get(limit=None, include=["documents"])
all_ids = results["ids"]

# Step 2: Delete by IDs
if len(all_ids) > 0:
    collection.delete(ids=all_ids)
```

**Edge cases:**
- Empty collection (0 documents): Return immediately with `count_deleted: 0`
- Large collections: ChromaDB handles this efficiently (no pagination needed for delete)
- Partial failures: ChromaDB is transactional per operation

## API Design

**Empty endpoint:** `DELETE /collections/{name}/documents/all`

Why not `POST /collections/{name}/empty`?
- Follows REST semantics: DELETE for destructive actions on resources
- Consistent with existing `DELETE /collections/{name}` pattern
- `/documents/all` clarifies scope (all documents, not the collection itself)

**Response format:**
```json
{
  "status": "emptied",
  "collection": "collection-name",
  "count_deleted": 1234
}
```

## Frontend Confirmation UX

**Confirmation dialog text:**
```
Empty collection '{display_name}'?

This will delete all {count} document(s).
The collection settings and metadata will be preserved.

This action cannot be undone.
```

**Why include count?**
- Shows user the magnitude of the action
- Catches accidental clicks when count is large
- Consistent with delete collection pattern

## State Management

After emptying:
1. Backend returns success
2. Frontend shows success message: "Emptied '{display_name}' - deleted {count} documents"
3. Frontend calls `loadConfig()` to refresh collection list
4. UI updates to show `count: 0`
5. "Empty" button disappears (count === 0)
6. Re-model section appears in Edit modal (count === 0)

This ensures UI consistency without manual state manipulation.

