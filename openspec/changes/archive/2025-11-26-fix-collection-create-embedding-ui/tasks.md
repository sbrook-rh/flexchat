# Fix Collection Create Embedding UI - Tasks

## 1. Update Collection Creation Form State
- [x] 1.1 Remove `embedding_connection` from newCollection state
- [x] 1.2 Keep only `embedding_model` in state
- [x] 1.3 Remove `embeddingModels` state (fetched from LLM connections)
- [x] 1.4 Add state to track available models from selected RAG service

## 2. Update Embedding Model Fetching
- [x] 2.1 Remove `fetchEmbeddingModelsForConnection()` function
- [x] 2.2 Get embedding models from `providerStatus.rag_services[service].details.embedding_models`
- [x] 2.3 Update when RAG service selection changes
- [x] 2.4 Handle case when service has no embedding_models

## 3. Update Create Form UI
- [x] 3.1 Remove "Embedding Connection" dropdown section
- [x] 3.2 Update "Embedding Model" dropdown to show wrapper models
- [x] 3.3 Display model info: ID and full name
- [x] 3.4 Show dimensions in dropdown or tooltip
- [x] 3.5 Update help text to clarify models from RAG service

## 4. Update Form Validation
- [x] 4.1 Remove embedding_connection validation
- [x] 4.2 Keep embedding_model required validation
- [x] 4.3 Validate model is available in selected service

## 5. Update Create API Call
- [x] 5.1 Remove embedding_connection from API payload
- [x] 5.2 Send only embedding_model in payload
- [x] 5.3 Backend already expects this format (no backend changes)

## 6. Update Edit Form (Re-model)
- [x] 6.1 Update `fetchEmbeddingModelsForEdit()` to use wrapper models
- [x] 6.2 Remove embedding connection dropdown from edit form
- [x] 6.3 Show only embedding model dropdown for empty collections
- [x] 6.4 Populate from selected service's embedding_models

## 7. Testing
- [x] 7.1 Create new collection with embedding model selection
- [x] 7.2 Verify correct model sent to backend
- [x] 7.3 Verify collection created successfully
- [x] 7.4 Test edit form for empty collections
- [x] 7.5 Verify models list updates when switching RAG services
