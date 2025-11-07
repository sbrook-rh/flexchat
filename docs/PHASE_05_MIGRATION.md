# Phase 0.5 Migration Guide

## Overview

Phase 0.5 refactors the embedding architecture to move embedding generation from the Python RAG wrapper to the Node.js backend. This guide covers deployment, migration, and rollback procedures.

## Breaking Changes

### 1. RAG Wrapper Document Upload
**Before**: Documents could be uploaded without pre-computed embeddings.  
**After**: Documents MUST include `embedding` field with pre-computed embeddings.

### 2. Collection Metadata
**Before**: Collections had minimal or no embedding metadata.  
**After**: Collections MUST have complete embedding metadata (provider, model, dimensions, connection_id).

### 3. Upload API Parameters
**Before**: Embedding connection was optional or inferred.  
**After**: Both `embedding_connection` and `embedding_model` are **required** parameters.

## Deployment Sequence

### Prerequisites
- Node.js backend updated to Phase 0.5
- Frontend updated to Phase 0.5
- Python RAG wrapper updated to Phase 0.5
- All services tested individually

### Step 1: Backup
```bash
# Backup ChromaDB data
tar -czf chroma_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/rag/chroma_db/

# Backup current configuration
cp config/config-*.json config/backup/
```

### Step 2: Deploy Backend (Node.js)
```bash
cd backend/chat
npm install
# Restart Node service
pm2 restart flex-chat-backend
# OR
npm run start
```

**Verify**:
```bash
curl http://localhost:5173/api/collections
# Should return collections with metadata
```

### Step 3: Deploy RAG Wrapper (Python)
```bash
cd backend/rag
pip install -r requirements.txt
# Restart Python service
pm2 restart flex-chat-rag
# OR
python server.py
```

**Verify**:
```bash
curl http://localhost:5006/collections
# Should return collections
```

### Step 4: Deploy Frontend
```bash
cd frontend
npm install
npm run build
# Deploy build/ to production
```

### Step 5: Test End-to-End
1. Create a new collection via UI
2. Upload documents to the collection
3. Verify documents were added successfully
4. Query the collection via chat

## Legacy Collection Migration

### Identifying Legacy Collections

Legacy collections lack proper embedding metadata:

```bash
# Check collection metadata
curl http://localhost:5006/collections | jq '.collections[] | select(.metadata.embedding_connection_id == null)'
```

### Updating Collection Metadata

**⚠️ Important**: Metadata updates are **full replacements**, not partial updates.

1. **Fetch current metadata**:
```bash
COLLECTION_NAME="my-collection"
curl -sS "http://localhost:5006/collections/${COLLECTION_NAME}" | jq '.metadata' > current_metadata.json
```

2. **Edit metadata** (add/fix embedding fields):
```json
{
  "created_at": "2025-10-18T22:53:14.356Z",
  "description": "Collection description",
  "display_name": "My Collection",
  "embedding_dimensions": 768,
  "embedding_model": "nomic-embed-text:latest",  // ⬅ Add :latest if missing
  "embedding_provider": "ollama",
  "embedding_connection_id": "ollama-local",  // ⬅ Add if missing
  "hierarchy": "flat",
  "match_threshold": 0.25,
  "partial_threshold": 0.5,
  "query_endpoint": "/query"
}
```

3. **Update via Node API**:
```bash
curl -X PUT "http://localhost:5173/api/collections/${COLLECTION_NAME}/metadata" \
  -H 'Content-Type: application/json' \
  -d "{
    \"service\": \"YourServiceName\",
    \"metadata\": $(cat current_metadata.json)
  }"
```

### Common Migration Issues

#### Issue: Model ID missing `:latest` suffix
**Symptom**: Upload fails with "No compatible connection found"  
**Fix**: Update metadata to include full model ID with version tag

**Before**: `"embedding_model": "nomic-embed-text"`  
**After**: `"embedding_model": "nomic-embed-text:latest"`

#### Issue: Missing `embedding_connection_id`
**Symptom**: Upload modal shows "No compatible connection found"  
**Fix**: Add `embedding_connection_id` field to metadata

```json
{
  "embedding_connection_id": "ollama-local"  // or your connection name
}
```

#### Issue: Metadata update loses fields
**Symptom**: After update, some metadata fields are null  
**Cause**: Metadata update is full replacement, not merge  
**Fix**: Always send **complete** metadata object

## Rollback Plan

### If issues occur after deployment:

#### Option 1: Rollback RAG Wrapper Only
If Node backend is stable but RAG wrapper has issues:

1. Revert RAG wrapper to pre-Phase-0.5 version
2. Temporarily accept documents without embeddings
3. Fix and redeploy RAG wrapper

#### Option 2: Full Rollback
If both services have issues:

1. Restore ChromaDB backup:
```bash
cd backend/rag
rm -rf chroma_db
tar -xzf ~/backups/chroma_backup_YYYYMMDD_HHMMSS.tar.gz
```

2. Revert all services to pre-Phase-0.5:
```bash
git checkout pre-phase-05-tag
# Redeploy backend, frontend, RAG wrapper
```

3. Restore configuration:
```bash
cp config/backup/config-*.json config/
```

## Validation Checklist

After deployment, verify:

- [ ] Can create new collections via UI
- [ ] Collections have complete embedding metadata
- [ ] Can upload documents to collections
- [ ] Embeddings are generated in Node backend
- [ ] RAG wrapper validates pre-computed embeddings
- [ ] Legacy collections work after metadata update
- [ ] Query flow works end-to-end
- [ ] Error messages are clear and helpful

## Troubleshooting

### Problem: "embedding_connection is required"
**Solution**: Ensure frontend passes `embedding_connection` and `embedding_model` in upload request.

### Problem: "All documents must include pre-computed embeddings"
**Solution**: Node backend should generate embeddings before sending to RAG wrapper. Check embedding-generator.js logs.

### Problem: "No compatible embedding connection found"
**Solution**: 
1. Check collection metadata has correct `embedding_provider` and `embedding_model`
2. Ensure model ID matches exactly (including `:latest` suffix)
3. Verify LLM connection exists in current config

### Problem: Metadata update removed fields
**Solution**: Always fetch complete metadata first, modify it, then send the entire object back.

## Best Practices

1. **Test in staging first**: Deploy to staging environment and test thoroughly before production
2. **Backup everything**: Database, configurations, and code before deployment
3. **Monitor logs**: Watch Node and Python logs during deployment
4. **Gradual rollout**: If possible, deploy to subset of users first
5. **Document issues**: Keep notes of any problems encountered for future reference

## Support

For issues or questions:
- Check application logs: `pm2 logs flex-chat-backend` and `pm2 logs flex-chat-rag`
- Review Phase 0.5 design doc: `openspec/changes/refactor-embedding-architecture/design.md`
- Consult OpenSpec tasks: `openspec/changes/refactor-embedding-architecture/tasks.md`

