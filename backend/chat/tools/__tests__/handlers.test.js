'use strict';

const ToolHandlers = require('../handlers');

describe('ToolHandlers', () => {
  let handlers;

  beforeEach(() => {
    handlers = new ToolHandlers();
  });

  describe('registration', () => {
    it('registers math_eval and echo builtins by default', () => {
      expect(handlers.has('math_eval')).toBe(true);
      expect(handlers.has('echo')).toBe(true);
    });

    it('registers a custom handler', () => {
      const fn = async () => ({ result: 'ok' });
      handlers.register('custom_tool', fn);
      expect(handlers.has('custom_tool')).toBe(true);
      expect(handlers.get('custom_tool')).toBe(fn);
    });

    it('throws if handler is not a function', () => {
      expect(() => handlers.register('bad', 'not a function'))
        .toThrow('Handler for "bad" must be a function');
    });
  });

  describe('get()', () => {
    it('returns the handler function', () => {
      const fn = handlers.get('math_eval');
      expect(typeof fn).toBe('function');
    });

    it('returns undefined for unknown handler', () => {
      expect(handlers.get('nonexistent')).toBeUndefined();
    });
  });

  describe('math_eval handler', () => {
    let mathEval;

    beforeEach(() => {
      mathEval = handlers.get('math_eval');
    });

    it('evaluates basic arithmetic', async () => {
      const result = await mathEval({ expression: '2 + 2' });
      expect(result.result).toBe(4);
      expect(result.expression).toBe('2 + 2');
    });

    it('evaluates complex expressions', async () => {
      const result = await mathEval({ expression: 'sqrt(16)' });
      expect(result.result).toBe(4);
    });

    it('evaluates expressions with precedence', async () => {
      const result = await mathEval({ expression: '2 + 3 * 4' });
      expect(result.result).toBe(14);
    });

    it('handles floating point', async () => {
      const result = await mathEval({ expression: '1.5 * 2' });
      expect(result.result).toBe(3);
    });

    it('throws for missing expression', async () => {
      await expect(mathEval({})).rejects.toThrow('math_eval requires a non-empty string "expression"');
    });

    it('throws for non-string expression', async () => {
      await expect(mathEval({ expression: 42 })).rejects.toThrow('math_eval requires a non-empty string "expression"');
    });
  });

  describe('echo handler', () => {
    let echo;

    beforeEach(() => {
      echo = handlers.get('echo');
    });

    it('echoes back the params', async () => {
      const params = { message: 'hello', value: 42 };
      const result = await echo(params);
      expect(result).toEqual({ echoed: params });
    });

    it('echoes empty params', async () => {
      const result = await echo({});
      expect(result).toEqual({ echoed: {} });
    });
  });
});
