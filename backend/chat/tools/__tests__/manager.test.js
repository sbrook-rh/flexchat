'use strict';

const ToolManager = require('../manager');

const TOOL_CONFIG = {
  enabled: true,
  max_iterations: 3,
  default_timeout_ms: 10000,
  registry: [
    {
      name: 'echo',
      description: 'Echo tool',
      type: 'builtin',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'get_weather',
      description: 'Get weather',
      type: 'mock',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
      mock_response: { temperature: 20 }
    }
  ]
};

describe('ToolManager', () => {
  describe('constructor', () => {
    it('creates registry, handlers, and executor', () => {
      const manager = new ToolManager(TOOL_CONFIG);
      expect(manager.registry).toBeDefined();
      expect(manager.handlers).toBeDefined();
      expect(manager.executor).toBeDefined();
    });

    it('works with no config (empty object)', () => {
      const manager = new ToolManager();
      expect(manager.isEnabled()).toBe(false);
      expect(manager.getMaxIterations()).toBe(5);
      expect(manager.getDefaultTimeout()).toBe(30000);
    });
  });

  describe('loadTools()', () => {
    it('loads tools from config registry', () => {
      const manager = new ToolManager(TOOL_CONFIG);
      const count = manager.loadTools();
      expect(count).toBe(2);
      expect(manager.registry.has('echo')).toBe(true);
      expect(manager.registry.has('get_weather')).toBe(true);
    });

    it('returns 0 when no registry in config', () => {
      const manager = new ToolManager({ enabled: true });
      const count = manager.loadTools();
      expect(count).toBe(0);
    });

    it('skips invalid tools and continues loading valid ones', () => {
      const manager = new ToolManager({
        registry: [
          { name: 'http_tool', description: 'x', type: 'http', parameters: {} }, // Invalid: HTTP
          { name: 'valid', description: 'Valid tool', type: 'mock', parameters: {}, mock_response: {} }
        ]
      });
      const count = manager.loadTools();
      expect(count).toBe(1);
      expect(manager.registry.has('valid')).toBe(true);
      expect(manager.registry.has('http_tool')).toBe(false);
    });
  });

  describe('isEnabled()', () => {
    it('returns true when enabled: true', () => {
      const manager = new ToolManager({ enabled: true });
      expect(manager.isEnabled()).toBe(true);
    });

    it('returns false when enabled: false', () => {
      const manager = new ToolManager({ enabled: false });
      expect(manager.isEnabled()).toBe(false);
    });

    it('returns false when enabled not set', () => {
      const manager = new ToolManager({});
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('getMaxIterations()', () => {
    it('returns configured max_iterations', () => {
      const manager = new ToolManager({ max_iterations: 7 });
      expect(manager.getMaxIterations()).toBe(7);
    });

    it('returns default 5 when not configured', () => {
      const manager = new ToolManager({});
      expect(manager.getMaxIterations()).toBe(5);
    });
  });

  describe('getDefaultTimeout()', () => {
    it('returns configured default_timeout_ms', () => {
      const manager = new ToolManager({ default_timeout_ms: 5000 });
      expect(manager.getDefaultTimeout()).toBe(5000);
    });

    it('returns default 30000 when not configured', () => {
      const manager = new ToolManager({});
      expect(manager.getDefaultTimeout()).toBe(30000);
    });
  });
});
