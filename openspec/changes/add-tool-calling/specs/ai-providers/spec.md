# ai-providers Specification (Delta)

## MODIFIED Requirements

### Requirement: Base AI Provider Interface
All AI providers SHALL implement a standardized interface that ensures consistent behavior across different AI services.

#### Scenario: Provider Initialization
- **WHEN** a provider is instantiated with configuration
- **THEN** it validates required configuration fields and initializes successfully

#### Scenario: Model Discovery
- **WHEN** the system requests available models from any provider
- **THEN** it returns a standardized list of models with type, capabilities, and metadata

#### Scenario: Chat Completion
- **WHEN** a chat request is made to any provider
- **THEN** it generates responses using the specified model with consistent message format

#### Scenario: Chat Completion with Tools
- **WHEN** a chat request includes tools in the options parameter
- **THEN** the provider passes tools to the AI model in provider-specific format
- **AND** the provider returns tool_calls in the response if the model requests tools
- **AND** the provider sets finish_reason to 'tool_calls' when tools are requested

#### Scenario: Tool Call Response Format
- **WHEN** the model requests tool calls
- **THEN** the response includes: content (may be null), finish_reason='tool_calls', tool_calls=[{id, type, function: {name, arguments}}]
- **AND** tool_calls follow OpenAI format for OpenAI and Ollama providers
- **AND** tool_calls are converted from Gemini format to OpenAI format for Gemini provider

#### Scenario: Tool Call Arguments Parsing
- **WHEN** the model returns tool calls
- **THEN** function.arguments is a JSON string that can be parsed to an object
- **AND** the provider does not parse arguments (caller responsibility)

#### Scenario: Embedding Generation
- **WHEN** text array is provided to `generateEmbeddings(texts)` method
- **THEN** it generates embeddings using the configured embedding model and returns array of vectors with consistent dimensions

#### Scenario: Batch Embedding Generation
- **WHEN** large text array (>100 texts) is provided for embedding generation
- **THEN** the provider handles batching automatically according to provider-specific limits and returns all embeddings

#### Scenario: Embedding Configuration
- **WHEN** a provider is configured with embedding model specification
- **THEN** it validates the embedding model is available and returns dimensions for that model

#### Scenario: Embedding Error Handling
- **WHEN** embedding generation fails (API error, rate limit, invalid model)
- **THEN** it throws a descriptive error with provider name, model, and failure reason

#### Scenario: Health Check
- **WHEN** the system checks provider health
- **THEN** it returns standardized health status with timestamp and error details

#### Scenario: Configuration Validation
- **WHEN** provider configuration is validated
- **THEN** it checks required fields and returns validation results with specific error messages

### Requirement: OpenAI Provider Tool Calling
The OpenAI provider SHALL support tool calling using the OpenAI Chat Completions API format.

#### Scenario: Pass tools to OpenAI API
- **WHEN** generateChat is called with options.tools
- **THEN** the request body includes tools=[{type: "function", function: {name, description, parameters}}]
- **AND** the request body includes tool_choice="auto"

#### Scenario: Parse OpenAI tool calls
- **WHEN** OpenAI returns finish_reason='tool_calls'
- **THEN** the provider extracts choice.message.tool_calls
- **AND** returns {content, finish_reason: 'tool_calls', tool_calls, usage}

#### Scenario: OpenAI without tools
- **WHEN** generateChat is called without options.tools
- **THEN** the request omits tools and tool_choice fields
- **AND** the provider behaves as standard chat completion

### Requirement: Ollama Provider Tool Calling
The Ollama provider SHALL support tool calling using the Ollama API (version 0.1.26+).

#### Scenario: Pass tools to Ollama API
- **WHEN** generateChat is called with options.tools
- **THEN** the request body includes tools in OpenAI-compatible format
- **AND** Ollama processes tools if the model supports function calling

#### Scenario: Parse Ollama tool calls
- **WHEN** Ollama returns message.tool_calls
- **THEN** the provider sets finish_reason='tool_calls'
- **AND** returns {content, finish_reason: 'tool_calls', tool_calls}

#### Scenario: Ollama finish_reason detection
- **WHEN** Ollama completes without tool calls
- **THEN** finish_reason is 'stop' if done=true
- **AND** finish_reason is 'length' if done=false

### Requirement: Gemini Provider Tool Calling
The Gemini provider SHALL support function calling using the Google Generative AI API.

#### Scenario: Convert tools to Gemini format
- **WHEN** generateChat is called with options.tools
- **THEN** the provider converts tools to Gemini functionDeclarations format
- **AND** each tool becomes {functionDeclarations: [{name, description, parameters}]}

#### Scenario: Pass tools to Gemini API
- **WHEN** tools are provided
- **THEN** the chat is started with tools parameter
- **AND** Gemini processes function calling requests

#### Scenario: Detect Gemini function calls
- **WHEN** response.functionCalls() returns function calls
- **THEN** the provider sets finish_reason='tool_calls'
- **AND** converts Gemini function calls to OpenAI format

#### Scenario: Convert Gemini function calls to OpenAI format
- **WHEN** Gemini returns function calls
- **THEN** each call is converted to {id: `call_${index}`, type: 'function', function: {name, arguments: JSON.stringify(args)}}
- **AND** the format matches OpenAI tool_calls structure

#### Scenario: Gemini without function calls
- **WHEN** Gemini completes without function calls
- **THEN** finish_reason='stop'
- **AND** only text content is returned
