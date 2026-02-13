'use strict';

const ToolHandlers = require('../handlers');

describe('ToolHandlers', () => {
  let handlers;

  beforeEach(() => {
    handlers = new ToolHandlers();
  });

  describe('registration', () => {
    it('registers math_eval, get_current_datetime, and generate_uuid builtins by default', () => {
      expect(handlers.has('math_eval')).toBe(true);
      expect(handlers.has('get_current_datetime')).toBe(true);
      expect(handlers.has('generate_uuid')).toBe(true);
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

  describe('get_current_datetime handler', () => {
    let getDatetime;

    beforeEach(() => {
      getDatetime = handlers.get('get_current_datetime');
    });

    it('returns iso, date, time, and timezone fields', async () => {
      const result = await getDatetime({});
      expect(result).toHaveProperty('iso');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('timezone');
    });

    it('defaults to UTC when no timezone given', async () => {
      const result = await getDatetime({});
      expect(result.timezone).toBe('UTC');
    });

    it('uses the requested timezone', async () => {
      const result = await getDatetime({ timezone: 'Asia/Tokyo' });
      expect(result.timezone).toBe('Asia/Tokyo');
    });

    it('falls back to UTC for invalid timezone', async () => {
      const result = await getDatetime({ timezone: 'Not/ATimezone' });
      expect(result.timezone).toBe('UTC');
    });

    it('returns a valid ISO date string', async () => {
      const result = await getDatetime({});
      expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('generate_uuid handler', () => {
    let generateUuid;

    beforeEach(() => {
      generateUuid = handlers.get('generate_uuid');
    });

    it('returns a uuid field', async () => {
      const result = await generateUuid({});
      expect(result).toHaveProperty('uuid');
    });

    it('returns a valid UUID v4 format', async () => {
      const result = await generateUuid({});
      expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates unique UUIDs on each call', async () => {
      const r1 = await generateUuid({});
      const r2 = await generateUuid({});
      expect(r1.uuid).not.toBe(r2.uuid);
    });
  });
});
