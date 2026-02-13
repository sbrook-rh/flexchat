'use strict';

const ToolExecutor = require('../executor');
const ToolRegistry = require('../registry');
const ToolHandlers = require('../handlers');

const MOCK_WEATHER_TOOL = {
  name: 'get_weather',
  description: 'Get weather',
  type: 'mock',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name' },
      units: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['city']
  },
  mock_response: { temperature: 20, conditions: 'Sunny' }
};

const CALCULATOR_TOOL = {
  name: 'calculator',
  description: 'Math calculator',
  type: 'builtin',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Expression' }
    },
    required: ['expression']
  }
};

const ECHO_TOOL = {
  name: 'echo',
  description: 'Echo params',
  type: 'builtin',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  }
};

const INTERNAL_TOOL = {
  name: 'search_docs',
  description: 'Search documents',
  type: 'internal',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  }
};

describe('ToolExecutor', () => {
  let registry;
  let handlers;
  let executor;

  beforeEach(() => {
    registry = new ToolRegistry();
    handlers = new ToolHandlers();
    executor = new ToolExecutor(registry, handlers);
  });

  describe('execute() - tool not found', () => {
    it('returns failure when tool is not registered', async () => {
      const result = await executor.execute('nonexistent', {});
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
      expect(result.tool_name).toBe('nonexistent');
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execute() - mock tools', () => {
    beforeEach(() => {
      registry.register(MOCK_WEATHER_TOOL);
    });

    it('returns mock_response for mock tools', async () => {
      const result = await executor.execute('get_weather', { city: 'London' });
      expect(result.success).toBe(true);
      expect(result.temperature).toBe(20);
      expect(result.conditions).toBe('Sunny');
      expect(result.tool_name).toBe('get_weather');
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('returns failure when required param is missing', async () => {
      const result = await executor.execute('get_weather', {});
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/city/);
      expect(result.tool_name).toBe('get_weather');
    });

    it('returns failure when param type is wrong', async () => {
      const result = await executor.execute('get_weather', { city: 123 });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/type/);
    });

    it('returns failure when enum value is invalid', async () => {
      const result = await executor.execute('get_weather', { city: 'London', units: 'kelvin' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/celsius.*fahrenheit|fahrenheit.*celsius/);
    });
  });

  describe('execute() - builtin tools', () => {
    beforeEach(() => {
      registry.register(CALCULATOR_TOOL);
    });

    it('executes math_eval via builtin handler', async () => {
      // Note: builtin handler for 'calculator' is not auto-registered with that name
      // The builtin name in handlers is 'math_eval', not 'calculator'
      // Register a calculator handler for this test
      handlers.register('calculator', async (params) => {
        const { evaluate } = require('mathjs');
        const result = evaluate(params.expression);
        return { result, expression: params.expression };
      });

      const result = await executor.execute('calculator', { expression: '3 + 4' });
      expect(result.success).toBe(true);
      expect(result.result).toBe(7);
    });

    it('executes generate_uuid builtin', async () => {
      const generateUuidTool = {
        name: 'generate_uuid',
        description: 'Generate UUID',
        type: 'builtin',
        parameters: { type: 'object', properties: {}, required: [] }
      };
      registry.register(generateUuidTool);
      const result = await executor.execute('generate_uuid', {});
      expect(result.success).toBe(true);
      expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('returns failure when no handler registered for builtin', async () => {
      // calculator tool registered but no handler for it
      const result = await executor.execute('calculator', { expression: '1+1' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No builtin handler/);
    });

    it('returns failure when builtin handler throws', async () => {
      handlers.register('calculator', async () => {
        throw new Error('Math error');
      });

      const result = await executor.execute('calculator', { expression: 'bad' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Math error');
    });
  });

  describe('execute() - internal tools', () => {
    beforeEach(() => {
      registry.register(INTERNAL_TOOL);
    });

    it('executes internal tool via handler', async () => {
      handlers.register('search_docs', async (params) => ({
        results: [`Found: ${params.query}`]
      }));

      const result = await executor.execute('search_docs', { query: 'test' });
      expect(result.success).toBe(true);
      expect(result.results).toEqual(['Found: test']);
    });

    it('returns failure when no handler registered for internal tool', async () => {
      const result = await executor.execute('search_docs', { query: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No internal handler/);
    });
  });

  describe('_validateParameters()', () => {
    const toolWithSchema = {
      name: 'test',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          status: { type: 'string', enum: ['active', 'inactive'] }
        },
        required: ['name']
      }
    };

    it('returns null for valid params', () => {
      const error = executor._validateParameters(toolWithSchema, { name: 'John', age: 30 });
      expect(error).toBeNull();
    });

    it('returns error for missing required field', () => {
      const error = executor._validateParameters(toolWithSchema, {});
      expect(error).toMatch(/"name"/);
    });

    it('returns error for wrong type', () => {
      const error = executor._validateParameters(toolWithSchema, { name: 42 });
      expect(error).toMatch(/type/);
    });

    it('returns error for invalid enum value', () => {
      const error = executor._validateParameters(toolWithSchema, { name: 'John', status: 'deleted' });
      expect(error).toMatch(/active.*inactive|inactive.*active/);
    });

    it('returns null when no schema defined', () => {
      const error = executor._validateParameters({ name: 'test', parameters: {} }, {});
      expect(error).toBeNull();
    });

    it('handles null/undefined params gracefully', () => {
      const error = executor._validateParameters(toolWithSchema, null);
      expect(error).toMatch(/"name"/);
    });
  });

  describe('failure result shape', () => {
    it('always includes success, error, tool_name, execution_time_ms on failure', async () => {
      const result = await executor.execute('missing_tool', {});
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('tool_name');
      expect(result).toHaveProperty('execution_time_ms');
    });
  });
});
