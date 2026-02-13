'use strict';

/**
 * Tests for tool calling additions to AI providers.
 * These tests verify the request/response parsing changes only - no real HTTP calls.
 */

const axios = require('axios');
const OpenAIProvider = require('../../ai-providers/providers/OpenAIProvider');
const OllamaProvider = require('../../ai-providers/providers/OllamaProvider');
const GeminiProvider = require('../../ai-providers/providers/GeminiProvider');

jest.mock('axios');

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Evaluate math',
      parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] }
    }
  }
];

describe('OpenAI Provider - Tool Calling', () => {
  let provider;

  beforeEach(() => {
    provider = new OpenAIProvider({ api_key: 'test-key', base_url: 'https://api.openai.com/v1' });
    jest.clearAllMocks();
  });

  it('adds tool_choice: auto when tools are provided', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Hello', tool_calls: null }, finish_reason: 'stop' }],
        usage: {},
        model: 'gpt-4o'
      }
    });

    await provider.generateChat([{ role: 'user', content: 'hi' }], 'gpt-4o', { tools: TOOLS });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.tool_choice).toBe('auto');
    expect(requestBody.tools).toEqual(TOOLS);
  });

  it('does not add tool_choice when no tools provided', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
        usage: {},
        model: 'gpt-4o'
      }
    });

    await provider.generateChat([{ role: 'user', content: 'hi' }], 'gpt-4o', {});

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.tool_choice).toBeUndefined();
  });

  it('extracts tool_calls from response when present', async () => {
    const mockToolCalls = [
      { id: 'call_abc', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }
    ];
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: null, tool_calls: mockToolCalls }, finish_reason: 'tool_calls' }],
        usage: {},
        model: 'gpt-4o'
      }
    });

    const result = await provider.generateChat([{ role: 'user', content: 'calc 2+2' }], 'gpt-4o', { tools: TOOLS });
    expect(result.finish_reason).toBe('tool_calls');
    expect(result.tool_calls).toEqual(mockToolCalls);
  });

  it('does not include tool_calls in result when absent', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'The answer is 42' }, finish_reason: 'stop' }],
        usage: {},
        model: 'gpt-4o'
      }
    });

    const result = await provider.generateChat([{ role: 'user', content: 'hi' }], 'gpt-4o', {});
    expect(result.tool_calls).toBeUndefined();
  });

  it('passes finish_reason through from API response', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'ok' }, finish_reason: 'length' }],
        usage: {},
        model: 'gpt-4o'
      }
    });

    const result = await provider.generateChat([], 'gpt-4o', {});
    expect(result.finish_reason).toBe('length');
  });
});

describe('Ollama Provider - Tool Calling', () => {
  let provider;

  beforeEach(() => {
    provider = new OllamaProvider({ base_url: 'http://localhost:11434' });
    jest.clearAllMocks();
  });

  it('includes tools in request body when provided', async () => {
    axios.post.mockResolvedValue({
      data: {
        message: { role: 'assistant', content: 'ok', tool_calls: null },
        model: 'llama3.2',
        done: true
      }
    });

    await provider.generateChat([{ role: 'user', content: 'hi' }], 'llama3.2', { tools: TOOLS });

    const requestBody = axios.post.mock.calls[0][1];
    expect(requestBody.tools).toEqual(TOOLS);
  });

  it('detects tool_calls in Ollama response and sets finish_reason', async () => {
    const mockToolCalls = [
      { function: { name: 'calculator', arguments: { expression: '2+2' } } }
    ];
    axios.post.mockResolvedValue({
      data: {
        message: { role: 'assistant', content: '', tool_calls: mockToolCalls },
        model: 'llama3.2',
        done: true
      }
    });

    const result = await provider.generateChat([{ role: 'user', content: 'calc' }], 'llama3.2', { tools: TOOLS });
    expect(result.finish_reason).toBe('tool_calls');
    expect(result.tool_calls).toEqual(mockToolCalls);
  });

  it('returns stop finish_reason when no tool_calls', async () => {
    axios.post.mockResolvedValue({
      data: {
        message: { role: 'assistant', content: 'The answer is 4' },
        model: 'llama3.2',
        done: true
      }
    });

    const result = await provider.generateChat([{ role: 'user', content: 'hi' }], 'llama3.2', {});
    expect(result.finish_reason).not.toBe('tool_calls');
  });
});

describe('Gemini Provider - Tool Calling', () => {
  let provider;
  let mockGenAI;

  const GEMINI_TOOLS = [
    {
      functionDeclarations: [{
        name: 'calculator',
        description: 'Evaluate math',
        parameters: { type: 'object', properties: { expression: { type: 'string' } } }
      }]
    }
  ];

  beforeEach(() => {
    mockGenAI = {
      models: {
        generateContent: jest.fn()
      }
    };
    provider = new GeminiProvider({ api_key: 'test-key' });
    provider.genAI = mockGenAI;
  });

  describe('_convertToolsToGeminiFormat()', () => {
    it('passes through Gemini-format tools unchanged', () => {
      const result = provider._convertToolsToGeminiFormat(GEMINI_TOOLS);
      expect(result).toEqual(GEMINI_TOOLS);
    });

    it('returns empty array for empty input', () => {
      expect(provider._convertToolsToGeminiFormat([])).toEqual([]);
      expect(provider._convertToolsToGeminiFormat(null)).toEqual([]);
    });
  });

  describe('_convertGeminiToolCalls()', () => {
    it('converts Gemini function calls to OpenAI tool_calls format', () => {
      const functionCalls = [
        { name: 'calculator', args: { expression: '2+2' } },
        { name: 'get_weather', args: { city: 'London' } }
      ];
      const result = provider._convertGeminiToolCalls(functionCalls);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'call_0',
        type: 'function',
        function: { name: 'calculator', arguments: JSON.stringify({ expression: '2+2' }) }
      });
      expect(result[1].id).toBe('call_1');
    });
  });

  describe('generateChat() with tools', () => {
    it('passes tools to generateContent', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        text: 'The answer is 4',
        functionCalls: () => null
      });

      await provider.generateChat(
        [{ role: 'user', content: 'calc 2+2' }],
        'gemini-1.5-pro',
        { tools: GEMINI_TOOLS }
      );

      const callConfig = mockGenAI.models.generateContent.mock.calls[0][0];
      expect(callConfig.tools).toEqual(GEMINI_TOOLS);
    });

    it('detects function calls and returns tool_calls format', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        text: null,
        functionCalls: () => [{ name: 'calculator', args: { expression: '2+2' } }]
      });

      const result = await provider.generateChat(
        [{ role: 'user', content: 'calc' }],
        'gemini-1.5-pro',
        { tools: GEMINI_TOOLS }
      );

      expect(result.finish_reason).toBe('tool_calls');
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0].function.name).toBe('calculator');
      expect(result.tool_calls[0].id).toBe('call_0');
    });

    it('returns stop when no function calls', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        text: 'Normal response',
        functionCalls: () => null
      });

      const result = await provider.generateChat(
        [{ role: 'user', content: 'hi' }],
        'gemini-1.5-pro',
        {}
      );

      expect(result.finish_reason).toBe('stop');
      expect(result.content).toBe('Normal response');
      expect(result.tool_calls).toBeUndefined();
    });
  });
});
