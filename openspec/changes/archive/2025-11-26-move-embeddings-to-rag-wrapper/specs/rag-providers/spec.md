# rag-providers Spec Delta

## ADDED Requirements

### Requirement: Embedding Model Configuration Loading
The RAG wrapper service SHALL load embedding model configurations from a YAML file at startup, supporting multiple models with user-friendly aliases.

#### Scenario: Load models from YAML config file
- **WHEN** server started with `--embeddings-config embeddings.yml` flag
- **AND** config contains embeddings array with model definitions
- **THEN** it parses YAML and loads each model into memory
- **AND** creates mapping from model ID to model instance
- **AND** logs successful load for each model with dimensions

#### Scenario: Load models from environment variable
- **WHEN** environment variable `EMBEDDINGS_CONFIG` set to config file path
- **AND** no `--embeddings-config` flag provided
- **THEN** it loads models from environment variable path
- **AND** behaves identically to command-line flag

#### Scenario: Config file structure validation
- **WHEN** config file is loaded
- **THEN** it validates `embeddings` array exists
- **AND** each entry has required `id` and `path` fields
- **AND** `id` is unique across all models
- **AND** fails at startup if validation fails

#### Scenario: Model loading at startup
- **WHEN** embedding config is loaded
- **THEN** it imports `SentenceTransformer` from sentence-transformers library
- **AND** loads each model using `SentenceTransformer(config['path'])`
- **AND** retrieves dimensions via `model.get_sentence_embedding_dimension()`
- **AND** stores model instance, name, and dimensions in global registry

#### Scenario: Model load failure terminates startup
- **WHEN** any embedding model fails to load
- **THEN** it logs fatal error with model name and failure details
- **AND** exits immediately with non-zero status code
- **AND** does not start serving requests

#### Scenario: No embedding models configured
- **WHEN** server started without embeddings config
- **OR** config file has empty embeddings array
- **THEN** it logs fatal error with helpful message
- **AND** error includes example config showing proper format
- **AND** exits immediately with non-zero status code

#### Scenario: Download models without starting server
- **WHEN** server started with `--download-models` and `--embeddings-config embeddings.yml` flags
- **THEN** it loads config and downloads/verifies each model
- **AND** logs success for each model with dimensions
- **AND** exits successfully without starting web server
- **AND** models are cached for subsequent server starts

### Requirement: Embedding Model Discovery
The RAG wrapper service SHALL expose loaded embedding models through the health endpoint for UI discovery and validation.

#### Scenario: Health check includes embedding models
- **WHEN** GET /health called and embedding models are loaded
- **THEN** response includes `embedding_models` array
- **AND** each entry contains: `id`, `name`, `status: "loaded"`, `dimensions`
- **AND** array includes all successfully loaded models

#### Scenario: Health check without embedding models
- **WHEN** GET /health called but no embedding models loaded
- **THEN** response does not include `embedding_models` field
- **AND** maintains backward compatibility with existing health format

#### Scenario: Node.js provider detects embedding capabilities
- **WHEN** Node.js provider calls healthCheck() method
- **AND** response includes `embedding_models` field
- **THEN** provider knows embedding models are available
- **AND** can populate UI dropdowns with available models

### Requirement: Collection-Specific Embedding Model Retrieval
The RAG wrapper service SHALL provide a helper function to retrieve the correct embedding model for a collection based on metadata.

#### Scenario: Get model for collection with valid metadata
- **WHEN** `get_embedding_model_for_collection(collection)` is called
- **AND** collection metadata includes `embedding_model: "mxbai-large"`
- **AND** model "mxbai-large" is loaded
- **THEN** it returns the SentenceTransformer instance for that model
- **AND** model can be used for embedding generation

#### Scenario: Collection missing embedding_model metadata
- **WHEN** `get_embedding_model_for_collection(collection)` is called
- **AND** collection metadata does not include `embedding_model` field
- **THEN** it raises HTTPException with status 400
- **AND** error message states collection has no embedding_model in metadata
- **AND** error message lists available models for migration

#### Scenario: Collection references non-loaded model
- **WHEN** `get_embedding_model_for_collection(collection)` is called
- **AND** collection metadata has `embedding_model: "model-x"`
- **AND** model "model-x" is not in loaded models registry
- **THEN** it raises HTTPException with status 503
- **AND** error message states model not loaded
- **AND** error message lists currently available models

## MODIFIED Requirements

### Requirement: RAG Wrapper Document Storage with Pre-computed Embeddings
The RAG wrapper service SHALL generate embeddings internally from document text using the collection's configured embedding model.

#### Scenario: Add Documents with Text Only
- **WHEN** POST `/collections/{collection_name}/documents` is called with documents containing `text` and optional `metadata` fields
- **AND** collection has `embedding_model` in metadata
- **THEN** it retrieves collection's embedding model, generates embeddings from text using the model, stores documents with generated embeddings in ChromaDB, and returns success with document count

#### Scenario: Add Documents to Collection Without Embedding Model
- **WHEN** POST `/collections/{collection_name}/documents` is called
- **AND** collection metadata does not include `embedding_model` field
- **THEN** it returns 400 error: `Collection has no embedding_model in metadata. Available models: [list]`
- **AND** error guides migration for older collections

#### Scenario: Add Documents with Embedding Model Not Loaded
- **WHEN** POST `/collections/{collection_name}/documents` is called
- **AND** collection metadata references embedding model not currently loaded
- **THEN** it returns 503 error: `Embedding model '[id]' not loaded. Available: [list]`
- **AND** suggests updating wrapper config or collection metadata

#### Scenario: Add Documents with Mismatched Embedding Dimensions
- **WHEN** multiple documents in the same request are embedded
- **AND** all use the same model (from collection metadata)
- **THEN** all embeddings have identical dimensions
- **AND** no dimension mismatch errors occur (model guarantees consistency)

#### Scenario: Empty Documents Array
- **WHEN** POST `/collections/{collection_name}/documents` is called with empty documents array
- **THEN** it returns 400 error: `Documents array is required`

#### Scenario: Document Missing Text Field
- **WHEN** POST `/collections/{collection_name}/documents` is called with document missing `text` field
- **THEN** it returns 400 error describing missing required field
- **AND** indicates which document index has the issue

#### Scenario: Batch Embedding Generation
- **WHEN** POST `/collections/{collection_name}/documents` is called with 50 documents
- **THEN** it extracts all text fields into array
- **AND** generates all embeddings in single `model.encode()` call
- **AND** processes batch efficiently without memory issues

### Requirement: Collection Metadata Storage
The RAG wrapper service SHALL validate embedding model selection at collection creation and store the model ID in metadata.

#### Scenario: Create Collection with Valid Embedding Model
- **WHEN** POST `/collections` is called with `name` and `embedding_model: "mxbai-large"`
- **AND** model "mxbai-large" is loaded
- **THEN** it creates collection in ChromaDB with cosine distance
- **AND** stores `embedding_model: "mxbai-large"` in collection metadata
- **AND** returns success with collection details

#### Scenario: Create Collection Without Embedding Model
- **WHEN** POST `/collections` is called with `name` but no `embedding_model`
- **THEN** it returns 400 error: `embedding_model is required. Available models: [list]`
- **AND** error lists all loaded models

#### Scenario: Create Collection with Invalid Embedding Model
- **WHEN** POST `/collections` is called with `embedding_model: "invalid-model"`
- **AND** model "invalid-model" is not loaded
- **THEN** it returns 400 error: `Model 'invalid-model' not loaded. Available: [list]`

#### Scenario: Retrieve Collection with Metadata
- **WHEN** GET `/collections/{collection_name}` is called
- **THEN** it returns collection information including `embedding_model` in metadata

#### Scenario: Update Collection Metadata
- **WHEN** PUT `/collections/{collection_name}/metadata` is called with new metadata
- **THEN** it updates the collection metadata and returns success
- **AND** allows updating `embedding_model` (note: requires re-indexing documents)

#### Scenario: Retrieve All Collections with Metadata
- **WHEN** GET `/collections` is called
- **THEN** it returns all collections with their metadata including `embedding_model`

## MODIFIED Requirements

### Requirement: Hybrid Query Strategy for Contextual Continuity
The RAG query system SHALL use an intelligent hybrid approach to balance semantic richness with conversational context continuity, and SHALL generate query embeddings internally using the collection's embedding model.

#### Scenario: First Message Query Strategy
- **WHEN** a user sends the first message in a conversation (no current topic exists)
- **THEN** the system uses the raw user message text for RAG query
- **AND** wrapper generates embedding from query text using collection's model
- **AND** logs the query strategy as "first message (raw query)"
- **AND** achieves optimal semantic matching for standalone questions

#### Scenario: Follow-up Message Query Strategy
- **WHEN** a user sends a follow-up message (current topic exists from previous exchanges)
- **THEN** the system uses the accumulated contextualized topic for RAG query
- **AND** wrapper generates embedding from topic text using collection's model
- **AND** logs the query strategy as "follow-up (contextualized topic)"
- **AND** resolves pronouns and implicit references through topic accumulation

#### Scenario: Pronoun Resolution via Topic Context
- **WHEN** a user asks a follow-up question with pronouns
- **THEN** the accumulated topic maintains subject context
- **AND** wrapper generates query embedding from full topic context
- **AND** embedding includes full context, preventing loss of domain specificity
- **AND** retrieves relevant documents that match the implicit subject

#### Scenario: Query Text Selection Logic
- **WHEN** the RAG collector determines which text to query with
- **THEN** it checks if `currentTopic` is empty or whitespace-only
- **AND** if empty, uses `userMessage` (first message strategy)
- **AND** if present, uses normalized `topic` (follow-up strategy)
- **AND** sends text to wrapper (not pre-computed embedding)

### Requirement: Cross-Encoder Health Reporting
The RAG service health check SHALL report both cross-encoder and embedding model availability when models are loaded.

#### Scenario: Health check with both models loaded
- **WHEN** GET /health called
- **AND** cross-encoder model is loaded
- **AND** embedding models are loaded
- **THEN** response includes `cross_encoder` object with model name and status
- **AND** response includes `embedding_models` array with all loaded models
- **AND** both capabilities are discoverable

#### Scenario: Health check with only cross-encoder
- **WHEN** GET /health called
- **AND** cross-encoder loaded but no embedding models
- **THEN** response includes `cross_encoder` object
- **AND** response does not include `embedding_models` field
- **AND** wrapper can still function (no document operations)

#### Scenario: Health check with only embedding models
- **WHEN** GET /health called
- **AND** embedding models loaded but no cross-encoder
- **THEN** response includes `embedding_models` array
- **AND** response does not include `cross_encoder` field
- **AND** wrapper can handle documents but not reranking

## REMOVED Requirements

### Requirement: RAG Wrapper Document Storage with Pre-computed Embeddings
**Reason**: Wrapper now generates embeddings internally instead of requiring pre-computed embeddings from Node backend

**Migration**: Remove Node backend embedding generation code, send text-only documents to wrapper

#### Scenario: Add Documents with Pre-computed Embeddings
- **Removed**: No longer accepts documents with `embedding` field
- **Migration**: Documents now require only `text` field, embeddings generated by wrapper

#### Scenario: Add Documents Without Embeddings
- **Removed**: Error for missing embeddings no longer applies
- **Migration**: Text-only documents are now the expected format

#### Scenario: Add Documents with Invalid Embedding Format
- **Removed**: No embedding field validation needed
- **Migration**: Wrapper validates text field instead

#### Scenario: Add Documents with Mismatched Embedding Dimensions
- **Removed**: Pre-computed dimension validation no longer applies
- **Migration**: Wrapper ensures dimension consistency via same model


