# Response Generation Specification

## ADDED Requirements

### Requirement: Standard Response Generation
The system SHALL generate responses using AI providers with message formatting and variable substitution.

#### Scenario: Build system prompt
- **WHEN** generating a response
- **THEN** the system substitutes variables in the response rule prompt template
- **AND** variables include: {{rag_context}}, {{intent}}, {{service}}, {{user_message}}, nested fields like {{nested.field}}

#### Scenario: Build message array
- **WHEN** generating a response
- **THEN** the system builds messages array: [system prompt, ...conversation history, user message]
- **AND** conversation history is converted to {role, content} format

#### Scenario: Call AI provider
- **WHEN** generating a response
- **THEN** the system calls provider.generateChat(messages, model, options)
- **AND** options include: max_tokens, temperature from response rule

#### Scenario: Return response
- **WHEN** provider returns successfully
- **THEN** the system returns {content, service, model}
- **AND** content contains the model's text response

### Requirement: Tool Calling Flow
The system SHALL support tool calling by extending response generation with a Phase 6b execution loop.

#### Scenario: Check if tools enabled
- **WHEN** generating a response
- **THEN** the system checks: toolManager exists, toolManager.isEnabled(), responseRule.tools.enabled
- **AND** if any check fails, falls back to standard flow

#### Scenario: Tool calling enabled path
- **WHEN** tools are enabled for the handler
- **THEN** the system calls _generateWithTools() instead of standard flow
- **AND** maintains backward compatibility (tools are opt-in)

#### Scenario: Get allowed tools
- **WHEN** entering tool calling flow
- **THEN** the system gets allowed_tools from responseRule.tools
- **AND** passes allowed_tools to registry.toProviderFormat()

#### Scenario: Convert tools to provider format
- **WHEN** preparing tools for the provider
- **THEN** the system calls registry.toProviderFormat(provider, allowedTools)
- **AND** receives tools in provider-specific format

#### Scenario: No tools available
- **WHEN** no tools are available after filtering
- **THEN** the system logs warning and falls back to standard generation
- **AND** no tool calling is attempted

### Requirement: Tool Execution Loop (Phase 6b)
The system SHALL execute an iterative loop handling tool calls until completion or max iterations.

#### Scenario: Add tools to options
- **WHEN** entering the tool loop
- **THEN** options.tools is set to provider-formatted tools
- **AND** tools are passed to provider.generateChat()

#### Scenario: Iteration limit enforcement
- **WHEN** tool loop starts
- **THEN** max_iterations = responseRule.tools.max_iterations || toolManager.getMaxIterations()
- **AND** iteration counter starts at 0

#### Scenario: Call LLM with tools
- **WHEN** each iteration of the loop
- **THEN** the system calls provider.generateChat(messages, model, options) with tools
- **AND** logs iteration number

#### Scenario: Finish with stop reason
- **WHEN** result.finish_reason is 'stop' or 'end_turn'
- **THEN** the system returns {content, service, model, tool_calls: []}
- **AND** tool_calls contains history of all tool executions

#### Scenario: Finish with tool calls
- **WHEN** result.finish_reason is 'tool_calls' and result.tool_calls exists
- **THEN** the system logs tool call count
- **AND** proceeds to execute each tool

#### Scenario: Add assistant message with tool calls
- **WHEN** model requests tool calls
- **THEN** the system adds to messages: {role: 'assistant', content: result.content || null, tool_calls: result.tool_calls}

#### Scenario: Execute each tool call
- **WHEN** processing tool_calls array
- **THEN** for each tool call: parse tool name and arguments, call executor.execute(name, params), track call in toolCalls array, add tool result to messages

#### Scenario: Parse tool arguments
- **WHEN** executing a tool call
- **THEN** the system parses toolCall.function.arguments as JSON
- **AND** passes parsed object to executor

#### Scenario: Add tool result message
- **WHEN** tool execution completes
- **THEN** the system adds to messages: {role: 'tool', tool_call_id: toolCall.id, name: toolName, content: JSON.stringify(toolResult)}

#### Scenario: Continue loop after tool execution
- **WHEN** all tool calls in iteration are executed
- **THEN** iteration counter increments
- **AND** loop continues (calls LLM again with tool results)

#### Scenario: Track tool calls
- **WHEN** a tool is executed
- **THEN** the system adds to toolCalls array: {tool, params, result, iteration}
- **AND** toolCalls is included in final response

#### Scenario: Max iterations reached
- **WHEN** iteration >= max_iterations
- **THEN** the system returns: {content: 'I reached the maximum number of tool calls...', service, model, tool_calls, max_iterations_reached: true}
- **AND** logs warning about max iterations

#### Scenario: Unexpected finish reason
- **WHEN** finish_reason is not 'stop', 'end_turn', or 'tool_calls'
- **THEN** the system logs warning
- **AND** returns: {content: result.content || 'I encountered an issue...', service, model, tool_calls}

### Requirement: Tool Call Tracking
The system SHALL track all tool calls for observability and debugging.

#### Scenario: Initialize tool calls array
- **WHEN** entering tool calling flow
- **THEN** toolCalls = [] is initialized

#### Scenario: Record tool call details
- **WHEN** a tool is executed
- **THEN** the system records: tool name, parameters, result object, iteration number
- **AND** adds to toolCalls array

#### Scenario: Include tool calls in response
- **WHEN** response is returned
- **THEN** the response includes tool_calls field
- **AND** tool_calls contains all executions in chronological order

#### Scenario: Empty tool calls
- **WHEN** no tools were called
- **THEN** tool_calls is empty array
- **AND** response contains only content

### Requirement: Error Handling in Tool Loop
The system SHALL handle errors gracefully during tool execution without breaking the conversation flow.

#### Scenario: Tool execution returns error
- **WHEN** executor.execute() returns {success: false}
- **THEN** the error result is passed to the model as tool result
- **AND** the model can use the error to formulate response

#### Scenario: JSON parse error on arguments
- **WHEN** toolCall.function.arguments cannot be parsed
- **THEN** the system catches the exception
- **AND** logs the error
- **AND** continues with next tool call or returns partial response

#### Scenario: Loop continues after tool error
- **WHEN** a tool execution fails
- **THEN** the error is added to messages as tool result
- **AND** the loop continues (LLM sees the error)
- **AND** the model can retry or explain the error to user
