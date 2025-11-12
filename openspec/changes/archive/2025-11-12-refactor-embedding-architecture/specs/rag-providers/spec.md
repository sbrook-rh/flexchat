# rag-providers Specification Delta

## ADDED Requirements

### Requirement: RAG Wrapper Document Storage with Pre-computed Embeddings
The RAG wrapper service SHALL accept and store documents with pre-computed embeddings, functioning as a pure storage proxy without embedding generation responsibilities.

#### Scenario: Add Documents with Pre-computed Embeddings
- **WHEN** POST `/collections/{collection_name}/documents` is called with documents containing `text`, `metadata`, and `embedding` fields
- **THEN** it stores documents in ChromaDB with provided embeddings and returns success with document count

#### Scenario: Add Documents Without Embeddings
- **WHEN** POST `/collections/{collection_name}/documents` is called with documents missing `embedding` field
- **THEN** it returns 400 error: `All documents must include pre-computed embeddings`

#### Scenario: Add Documents with Invalid Embedding Format
- **WHEN** POST `/collections/{collection_name}/documents` is called with embedding field that is not an array of numbers
- **THEN** it returns 400 error describing the invalid format

#### Scenario: Add Documents with Mismatched Embedding Dimensions
- **WHEN** multiple documents in the same request have embeddings with different dimensions
- **THEN** it returns 400 error indicating dimension mismatch

#### Scenario: Empty Documents Array
- **WHEN** POST `/collections/{collection_name}/documents` is called with empty documents array
- **THEN** it returns 400 error: `Documents array is required`

### Requirement: Collection Metadata Storage
The RAG wrapper service SHALL store and retrieve collection metadata provided by the Node backend.

#### Scenario: Create Collection with Metadata
- **WHEN** POST `/collections` is called with `name`, optional top-level `embedding_provider` and `embedding_model`, and `metadata`
- **THEN** it creates the collection in ChromaDB, honors any top-level embedding fields as metadata, and stores all metadata without provider-type validation

#### Scenario: Retrieve Collection with Metadata
- **WHEN** GET `/collections/{collection_name}` is called
- **THEN** it returns collection information including stored metadata

#### Scenario: Update Collection Metadata
- **WHEN** PUT `/collections/{collection_name}/metadata` is called with new metadata
- **THEN** it updates the collection metadata and returns success

#### Scenario: Retrieve All Collections with Metadata
- **WHEN** GET `/collections` is called
- **THEN** it returns all collections with their metadata


