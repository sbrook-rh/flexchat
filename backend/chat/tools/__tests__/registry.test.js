'use strict';

const ToolRegistry = require('../registry');

const CALCULATOR_TOOL = {
  name: 'calculator',
  description: 'Evaluate a math expression',
  type: 'builtin',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression' }
    },
    required: ['expression']
  }
};

const WEATHER_TOOL = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  type: 'mock',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name' }
    },
    required: ['city']
  },
  mock_response: { temperature: 20, conditions: 'Sunny' }
};

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register()', () => {
    it('registers a valid tool', () => {
      registry.register(CALCULATOR_TOOL);
      expect(registry.has('calculator')).toBe(true);
    });

    it('stores a copy of the tool definition', () => {
      registry.register(CALCULATOR_TOOL);
      const stored = registry.get('calculator');
      expect(stored).toEqual(CALCULATOR_TOOL);
      expect(stored).not.toBe(CALCULATOR_TOOL); // different reference
    });

    it('throws if tool is not an object', () => {
      expect(() => registry.register(null)).toThrow('Tool definition must be an object');
      expect(() => registry.register('string')).toThrow('Tool definition must be an object');
    });

    it('throws if name is missing', () => {
      expect(() => registry.register({ description: 'x', type: 'mock', parameters: {} }))
        .toThrow('Tool must have a non-empty string "name"');
    });

    it('throws if description is missing', () => {
      expect(() => registry.register({ name: 'x', type: 'mock', parameters: {} }))
        .toThrow('Tool "x" must have a non-empty string "description"');
    });

    it('throws if parameters is missing', () => {
      expect(() => registry.register({ name: 'x', description: 'y', type: 'mock' }))
        .toThrow('Tool "x" must have a "parameters" object');
    });

    it('throws for HTTP tool type with informative v2 message', () => {
      expect(() => registry.register({
        name: 'my_api',
        description: 'Call external API',
        type: 'http',
        parameters: {}
      })).toThrow('HTTP tool type is not supported in v1');
    });

    it('throws for invalid tool type', () => {
      expect(() => registry.register({
        name: 'x',
        description: 'y',
        type: 'unknown',
        parameters: {}
      })).toThrow('invalid type "unknown"');
    });

    it('accepts all valid types', () => {
      ['mock', 'builtin', 'internal'].forEach((type, i) => {
        registry.register({ name: `tool_${i}`, description: 'x', type, parameters: {} });
        expect(registry.has(`tool_${i}`)).toBe(true);
      });
    });
  });

  describe('get()', () => {
    it('returns tool definition by name', () => {
      registry.register(CALCULATOR_TOOL);
      expect(registry.get('calculator')).toEqual(CALCULATOR_TOOL);
    });

    it('returns undefined for unknown tool', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('returns true for registered tool', () => {
      registry.register(CALCULATOR_TOOL);
      expect(registry.has('calculator')).toBe(true);
    });

    it('returns false for unregistered tool', () => {
      expect(registry.has('calculator')).toBe(false);
    });
  });

  describe('list()', () => {
    it('returns empty array when no tools registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered tools', () => {
      registry.register(CALCULATOR_TOOL);
      registry.register(WEATHER_TOOL);
      const tools = registry.list();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('calculator');
      expect(tools.map(t => t.name)).toContain('get_weather');
    });
  });

  describe('toProviderFormat()', () => {
    beforeEach(() => {
      registry.register(CALCULATOR_TOOL);
      registry.register(WEATHER_TOOL);
    });

    describe('OpenAI / Ollama format', () => {
      ['openai', 'ollama'].forEach(provider => {
        it(`converts tools to ${provider} format`, () => {
          const result = registry.toProviderFormat(provider);
          expect(result).toHaveLength(2);
          expect(result[0]).toEqual({
            type: 'function',
            function: {
              name: 'calculator',
              description: 'Evaluate a math expression',
              parameters: CALCULATOR_TOOL.parameters
            }
          });
        });

        it(`filters by allowedTools for ${provider}`, () => {
          const result = registry.toProviderFormat(provider, ['calculator']);
          expect(result).toHaveLength(1);
          expect(result[0].function.name).toBe('calculator');
        });
      });
    });

    describe('Gemini format', () => {
      it('converts tools to gemini functionDeclarations format', () => {
        const result = registry.toProviderFormat('gemini');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          functionDeclarations: [{
            name: 'calculator',
            description: 'Evaluate a math expression',
            parameters: CALCULATOR_TOOL.parameters
          }]
        });
      });

      it('filters by allowedTools for gemini', () => {
        const result = registry.toProviderFormat('gemini', ['get_weather']);
        expect(result).toHaveLength(1);
        expect(result[0].functionDeclarations[0].name).toBe('get_weather');
      });
    });

    it('returns all tools when allowedTools is empty array', () => {
      const result = registry.toProviderFormat('openai', []);
      expect(result).toHaveLength(2);
    });

    it('throws for unsupported provider', () => {
      expect(() => registry.toProviderFormat('anthropic'))
        .toThrow('Unsupported provider for tool format conversion: "anthropic"');
    });
  });
});
