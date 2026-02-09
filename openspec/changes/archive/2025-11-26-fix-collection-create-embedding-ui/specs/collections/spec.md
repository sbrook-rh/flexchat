# collections Spec Delta

## ADDED Requirements

### Requirement: Collection Create UI
The system SHALL provide a user interface for creating collections with embedding model selection from the current RAG service.

#### Scenario: Open create collection form
- **GIVEN** user is viewing collections for a specific service (e.g., `/collections?wrapper=red-hat-product-documentation`)
- **WHEN** user clicks "Create New Collection" button
- **THEN** modal appears with create form
- **AND** form includes: Display Name, Description, Match Threshold, Fallback Threshold, Embedding Model
- **AND** service is implicitly set from URL query parameter (no service dropdown shown)

#### Scenario: Embedding model dropdown population
- **WHEN** create form opens
- **THEN** embedding model dropdown is populated from `providerStatus.rag_services[currentWrapper].details.embedding_models`
- **AND** each option displays: `{id} - {name} ({dimensions}d)`
- **AND** dropdown is enabled immediately (no dependency on other fields)

#### Scenario: Create collection with selected model
- **WHEN** user fills in collection details
- **AND** selects embedding model "mxbai-large"
- **AND** clicks "Create Collection"
- **THEN** POST `/api/collections` is called with `service` (from URL), `embedding_model`, and metadata
- **AND** no `embedding_connection` parameter is sent

#### Scenario: No embedding models available
- **WHEN** create form opens but selected RAG service has no `embedding_models` in health details
- **THEN** embedding model dropdown shows: "No embedding models loaded in this service"
- **AND** warning displays: "⚠ No embedding models loaded. Check wrapper configuration."
- **AND** create button remains enabled (backend will validate)

#### Scenario: Form validation
- **WHEN** user attempts to create collection without selecting embedding model
- **THEN** validation error appears: "Please select an embedding model"
- **AND** form submission is prevented

## MODIFIED Requirements

### Requirement: Collection Edit UI
The system SHALL provide a user interface for editing collection metadata, with embedding model selection from the RAG wrapper's available models for empty collections.

#### Scenario: Re-model empty collection with wrapper models
- **GIVEN** a collection with `count === 0` and current `embedding_model: "mxbai-large"`
- **WHEN** user opens the Edit modal
- **THEN** an "Embedding (Re-model)" section appears
- **AND** section shows embedding model dropdown populated from RAG service's `embedding_models`
- **AND** current embedding model is pre-selected if available
- **AND** user can select a different embedding model from available options
- **AND** no embedding connection dropdown is shown

#### Scenario: Embedding Models from Service Health
- **WHEN** Edit modal loads for empty collection
- **THEN** embedding models are fetched from `providerStatus.rag_services[collection.service].details.embedding_models`
- **AND** dropdown shows model IDs and names with dimensions: `{id} - {name} ({dimensions}d)`
- **AND** unavailable models are not selectable

#### Scenario: Read-only embedding display for non-empty collections
- **GIVEN** a collection with `count > 0`
- **WHEN** user opens the Edit modal
- **THEN** "Embedding Model" section shows read-only fields
- **AND** displays: Model (ID), Dimensions
- **AND** no longer displays: Provider, Connection ID
- **AND** help text clarifies: "Embedding model is fixed for collections with documents"

## REMOVED Requirements

None - this change adds missing UI spec and updates existing edit UI spec

