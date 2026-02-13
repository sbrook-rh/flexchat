'use strict';

const { generateResponse, _generateWithTools } = require('../response-generator');
const ToolManager = require('../../tools/manager');

// Helper to create a mock provider
function createMockProvider(responses) {
  let callCount = 0;
  return {
    constructor: { name: 'OpenAIProvider' },
    generateChat: jest.fn(async () => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response;
    })
  };
}

const BASE_RULE = {
  llm: 'chatgpt',
  model: 'gpt-4o',
  prompt: 'You are helpful.',
  max_tokens: 500,
  tools: {
    enabled: true,
    allowed_tools: ['generate_uuid'],
    max_iterations: 3
  }
};

const BASE_PROFILE = {};

describe('Response Generator - Tool Calling', () => {
  let toolManager;

  beforeEach(() => {
    toolManager = new ToolManager({
      max_iterations: 5,
      registry: [{ name: 'generate_uuid' }]
    });
    toolManager.loadTools();
  });

  describe('generateResponse() - backward compatibility', () => {
    it('falls back to standard path when no toolManager provided', async () => {
      const provider = createMockProvider([
        { content: 'Hello world', finish_reason: 'stop' }
      ]);
      const aiProviders = { chatgpt: provider };

      const result = await generateResponse(BASE_PROFILE, BASE_RULE, aiProviders, 'hi', [], null);
      expect(result.content).toBe('Hello world');
      expect(result.toolCalls).toBeUndefined();
    });

    it('falls back to standard path when tools not enabled globally', async () => {
      const provider = createMockProvider([
        { content: 'Hello world', finish_reason: 'stop' }
      ]);
      const aiProviders = { chatgpt: provider };

      const disabledManager = new ToolManager({ enabled: false });

      const result = await generateResponse(BASE_PROFILE, BASE_RULE, aiProviders, 'hi', [], disabledManager);
      expect(result.content).toBe('Hello world');
      expect(result.toolCalls).toBeUndefined();
    });

    it('falls back to standard path when handler tools not enabled', async () => {
      const provider = createMockProvider([
        { content: 'Hello world', finish_reason: 'stop' }
      ]);
      const aiProviders = { chatgpt: provider };

      const ruleNoTools = { ...BASE_RULE, tools: { enabled: false } };

      const result = await generateResponse(BASE_PROFILE, ruleNoTools, aiProviders, 'hi', [], toolManager);
      expect(result.content).toBe('Hello world');
      expect(result.toolCalls).toBeUndefined();
    });
  });

  describe('_generateWithTools()', () => {
    it('returns content immediately when finish_reason is stop', async () => {
      const provider = createMockProvider([
        { content: 'Final answer', finish_reason: 'stop' }
      ]);
      const messages = [{ role: 'user', content: 'hi' }];

      const result = await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);
      expect(result.content).toBe('Final answer');
      expect(result.toolCalls).toHaveLength(0);
      expect(result.max_iterations_reached).toBe(false);
    });

    it('returns content when finish_reason is end_turn', async () => {
      const provider = createMockProvider([
        { content: 'Done', finish_reason: 'end_turn' }
      ]);
      const messages = [{ role: 'user', content: 'hi' }];

      const result = await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);
      expect(result.content).toBe('Done');
      expect(result.max_iterations_reached).toBe(false);
    });

    it('executes tool call and continues loop', async () => {
      const toolCallResponse = {
        content: null,
        finish_reason: 'tool_calls',
        tool_calls: [{
          id: 'call_1',
          function: { name: "generate_uuid", arguments: "{}" }
        }]
      };
      const finalResponse = { content: 'Tool executed!', finish_reason: 'stop' };

      const provider = createMockProvider([toolCallResponse, finalResponse]);
      const messages = [{ role: 'user', content: "generate uuid" }];

      const result = await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);
      expect(result.content).toBe('Tool executed!');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool_name).toBe('generate_uuid');
      expect(result.toolCalls[0].iteration).toBe(1);
      expect(result.max_iterations_reached).toBe(false);

      // Messages should include assistant + tool result
      expect(messages.some(m => m.role === 'assistant')).toBe(true);
      expect(messages.some(m => m.role === 'tool')).toBe(true);
    });

    it('returns max_iterations_reached when limit hit', async () => {
      // Always returns tool_calls - never stops
      const infiniteProvider = {
        constructor: { name: 'OpenAIProvider' },
        generateChat: jest.fn(async () => ({
          content: null,
          finish_reason: 'tool_calls',
          tool_calls: [{
            id: 'call_1',
            function: { name: "generate_uuid", arguments: "{}" }
          }]
        }))
      };

      const ruleWithLowLimit = { ...BASE_RULE, tools: { ...BASE_RULE.tools, max_iterations: 2 } };
      const messages = [{ role: 'user', content: 'loop' }];

      const result = await _generateWithTools(infiniteProvider, ruleWithLowLimit, messages, {}, toolManager);
      expect(result.max_iterations_reached).toBe(true);
      expect(result.toolCalls).toHaveLength(2); // 2 iterations, 1 tool call each
      expect(infiniteProvider.generateChat).toHaveBeenCalledTimes(2);
    });

    it('handles unexpected finish_reason gracefully', async () => {
      const provider = createMockProvider([
        { content: 'Partial', finish_reason: 'length' }
      ]);
      const messages = [{ role: 'user', content: 'hi' }];

      const result = await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);
      expect(result.content).toBe('Partial');
      expect(result.max_iterations_reached).toBe(false);
    });

    it('handles JSON parse error in tool arguments gracefully', async () => {
      const provider = createMockProvider([
        {
          content: null,
          finish_reason: 'tool_calls',
          tool_calls: [{
            id: 'call_1',
            function: { name: "generate_uuid", arguments: 'invalid json{{{' }
          }]
        },
        { content: 'Done', finish_reason: 'stop' }
      ]);
      const messages = [{ role: 'user', content: 'hi' }];

      // Should not throw - should use empty params
      const result = await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);
      expect(result.content).toBe('Done');
      expect(result.toolCalls[0].params).toEqual({});
    });

    it('includes tool results in messages for next iteration', async () => {
      const provider = createMockProvider([
        {
          content: null,
          finish_reason: 'tool_calls',
          tool_calls: [{
            id: 'call_abc',
            function: { name: "generate_uuid", arguments: "{}" }
          }]
        },
        { content: 'Got it', finish_reason: 'stop' }
      ]);
      const messages = [{ role: 'user', content: 'test' }];

      await _generateWithTools(provider, BASE_RULE, messages, {}, toolManager);

      const toolResultMsg = messages.find(m => m.role === 'tool');
      expect(toolResultMsg).toBeDefined();
      expect(toolResultMsg.tool_call_id).toBe('call_abc');
      expect(toolResultMsg.name).toBe('generate_uuid');
      expect(typeof toolResultMsg.content).toBe('string');
    });
  });

  describe('generateResponse() - full tool calling path', () => {
    it('returns toolCalls and max_iterations_reached in response', async () => {
      const provider = createMockProvider([
        {
          content: null,
          finish_reason: 'tool_calls',
          tool_calls: [{
            id: 'call_1',
            function: { name: "generate_uuid", arguments: "{}" }
          }]
        },
        { content: 'All done', finish_reason: 'stop' }
      ]);
      const aiProviders = { chatgpt: provider };

      const result = await generateResponse(BASE_PROFILE, BASE_RULE, aiProviders, 'test', [], toolManager);
      expect(result.content).toBe('All done');
      expect(result.service).toBe('chatgpt');
      expect(result.model).toBe('gpt-4o');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.max_iterations_reached).toBe(false);
    });
  });
});
