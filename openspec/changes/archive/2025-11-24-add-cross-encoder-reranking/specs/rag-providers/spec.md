## ADDED Requirements

### Requirement: Cross-Encoder Model Discovery
The RAG service SHALL provide discoverability for available cross-encoder models through help text and a list command.

#### Scenario: Help text shows model examples
- **WHEN** user runs `python server.py --help`
- **THEN** `--cross-encoder` flag help text includes example models
- **AND** examples show model name, size, and use case
- **AND** examples include fast, recommended, and high-accuracy options

#### Scenario: List available models command
- **WHEN** user runs `python server.py --list-reranker-models`
- **THEN** it displays curated list of recommended models
- **AND** list shows model name, size, latency, and accuracy tier
- **AND** list groups by use case (fast, recommended, high-accuracy)
- **AND** includes note that any HuggingFace cross-encoder model works
- **AND** includes link to HuggingFace model hub for exploration
- **AND** exits after displaying list

#### Scenario: Startup banner when no model specified
- **WHEN** server starts without cross-encoder flags
- **THEN** it logs info message that cross-encoder is disabled
- **AND** logs hint showing how to enable with example model
- **AND** logs reference to --list-reranker-models for options

#### Scenario: Curated list includes metadata
- **WHEN** curated model list is displayed
- **THEN** each model includes name (HuggingFace identifier)
- **AND** each model includes size (MB or GB)
- **AND** each model includes approximate latency for 10 documents
- **AND** each model includes accuracy tier description

### Requirement: Cross-Encoder Model Initialization
The RAG service SHALL support optional cross-encoder model loading at startup for contextual document reranking.

#### Scenario: Load model from HuggingFace
- **WHEN** server started with `--cross-encoder BAAI/bge-reranker-base` flag
- **THEN** it downloads model from HuggingFace Hub to cache directory
- **AND** loads cross-encoder model into memory
- **AND** logs successful load with model name
- **AND** service becomes ready to handle /rerank requests

#### Scenario: Load model from local path
- **WHEN** server started with `--cross-encoder-path /models/bge-reranker-base` flag
- **THEN** it loads cross-encoder from specified local path
- **AND** skips HuggingFace download
- **AND** logs successful load with path
- **AND** service becomes ready to handle /rerank requests

#### Scenario: Load model from environment variable
- **WHEN** environment variable `CROSS_ENCODER_MODEL` set to model name
- **AND** no command-line flags provided
- **THEN** it loads model from HuggingFace using environment variable value
- **AND** behaves identically to `--cross-encoder` flag

#### Scenario: Priority order for model source
- **WHEN** multiple model sources specified (path flag, model flag, env vars)
- **THEN** it uses `--cross-encoder-path` if provided
- **AND** falls back to `--cross-encoder` if path not provided
- **AND** falls back to environment variables if neither flag provided

#### Scenario: Model load failure terminates startup
- **WHEN** server started with `--cross-encoder` flag but model cannot be loaded
- **THEN** it logs fatal error with failure details
- **AND** exits immediately with non-zero status code
- **AND** does not start serving requests

#### Scenario: No cross-encoder specified
- **WHEN** server started without cross-encoder flags or environment variables
- **THEN** it logs that cross-encoder is disabled
- **AND** starts successfully without loading model
- **AND** /rerank endpoint returns 503 when called

### Requirement: Cross-Encoder Health Reporting
The RAG service health check SHALL report cross-encoder availability and status when model is loaded.

#### Scenario: Health check with cross-encoder loaded
- **WHEN** GET /health called and cross-encoder model is loaded
- **THEN** response includes `cross_encoder` object in response
- **AND** object contains `model` field with model name or path
- **AND** object contains `status` field with value "loaded"

#### Scenario: Health check without cross-encoder
- **WHEN** GET /health called and cross-encoder not loaded at startup
- **THEN** response does not include `cross_encoder` field
- **AND** maintains backward compatibility with existing health check format

#### Scenario: Node.js provider detects availability
- **WHEN** Node.js provider calls healthCheck() method
- **AND** response includes `cross_encoder` field
- **THEN** provider knows reranking capability is available
- **AND** can call /rerank endpoint safely

### Requirement: Cross-Encoder Reranking Endpoint
The RAG service SHALL provide a /rerank endpoint that scores query-document pairs for relevance using the loaded cross-encoder model.

#### Scenario: Successful reranking request
- **WHEN** POST /rerank called with query and array of documents
- **AND** each document has `id` and `text` fields
- **AND** cross-encoder model is loaded
- **THEN** it creates query-document pairs for scoring
- **AND** scores all pairs using cross-encoder model
- **AND** returns documents sorted by score descending
- **AND** includes score and original_rank for each document

#### Scenario: Apply top_k limit
- **WHEN** POST /rerank called with `top_k: 3` parameter
- **AND** request includes 10 documents
- **THEN** it scores all 10 documents
- **AND** sorts by score descending
- **AND** returns only top 3 highest-scoring documents

#### Scenario: Rerank request without cross-encoder loaded
- **WHEN** POST /rerank called but cross-encoder not loaded at startup
- **THEN** endpoint returns 503 status
- **AND** error message states "Cross-encoder not loaded. Start server with --cross-encoder flag."

#### Scenario: Rerank with missing query
- **WHEN** POST /rerank called without query field
- **THEN** Pydantic validation returns 400 status
- **AND** error indicates query is required

#### Scenario: Rerank with missing documents
- **WHEN** POST /rerank called without documents field
- **THEN** Pydantic validation returns 400 status
- **AND** error indicates documents are required

#### Scenario: Rerank with empty documents array
- **WHEN** POST /rerank called with `documents: []`
- **THEN** endpoint returns 200 status
- **AND** response is `{"reranked": []}`
- **AND** no error is raised

#### Scenario: Rerank response format
- **WHEN** POST /rerank returns successfully
- **THEN** response contains `reranked` array
- **AND** each item has `id` field matching original document
- **AND** each item has `score` field (float) from cross-encoder
- **AND** each item has `original_rank` field (1-based position in input)
- **AND** items are sorted by score descending

#### Scenario: Cross-encoder scoring error
- **WHEN** cross-encoder model prediction raises exception
- **THEN** endpoint returns 500 status
- **AND** error message includes exception details
- **AND** error is logged for debugging

### Requirement: Cross-Encoder Reranking Method
Node.js RAG providers SHALL provide a rerank() method that calls the RAG service /rerank endpoint with graceful degradation.

#### Scenario: Successful reranking call
- **WHEN** provider.rerank() called with query and documents array
- **AND** cross-encoder available in RAG service (verified via health check)
- **THEN** it calls POST /rerank endpoint with query and documents
- **AND** maps documents to required format (id, text)
- **AND** uses configured timeout and auth headers
- **AND** uses withRetry wrapper for resilience
- **AND** returns reranked documents with scores

#### Scenario: Generate fallback document IDs
- **WHEN** provider.rerank() called with documents missing id field
- **THEN** it generates fallback IDs using document index or timestamp
- **AND** ensures all documents have valid id before calling endpoint

#### Scenario: Health check shows no cross-encoder
- **WHEN** provider.rerank() checks health endpoint
- **AND** response does not include cross_encoder field
- **THEN** it logs warning that cross-encoder unavailable
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: RAG service unreachable
- **WHEN** provider.rerank() attempts health check
- **AND** health check fails (network error, timeout, etc)
- **THEN** it logs warning about connectivity issue
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: Rerank endpoint returns error
- **WHEN** provider.rerank() calls /rerank endpoint
- **AND** endpoint returns 503, 500, or other error status
- **THEN** it logs error with details
- **AND** returns original documents unchanged (graceful degradation)
- **AND** does not throw error

#### Scenario: Optional top_k parameter
- **WHEN** provider.rerank() called with topK parameter
- **THEN** it passes top_k to /rerank endpoint
- **AND** endpoint limits results to specified count

#### Scenario: Reranking preserves document structure
- **WHEN** provider.rerank() receives reranked response
- **THEN** it returns documents with updated scores
- **AND** preserves all original document fields
- **AND** maintains compatibility with downstream processing

