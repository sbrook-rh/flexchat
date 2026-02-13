'use strict';

const ToolManager = require('../manager');

const TOOL_CONFIG = {
  max_iterations: 3,
  default_timeout_ms: 10000,
  registry: [
    { name: 'calculator' },
    { name: 'get_current_datetime' }
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
    it('loads tools from manifest via name-only registry entries', () => {
      const manager = new ToolManager(TOOL_CONFIG);
      const count = manager.loadTools();
      expect(count).toBe(2);
      expect(manager.registry.has('calculator')).toBe(true);
      expect(manager.registry.has('get_current_datetime')).toBe(true);
    });

    it('returns 0 when no registry in config', () => {
      const manager = new ToolManager({});
      const count = manager.loadTools();
      expect(count).toBe(0);
    });

    it('skips unknown tool names with a warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new ToolManager({
        registry: [
          { name: 'unknown_tool' },
          { name: 'calculator' }
        ]
      });
      const count = manager.loadTools();
      expect(count).toBe(1);
      expect(manager.registry.has('calculator')).toBe(true);
      expect(manager.registry.has('unknown_tool')).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown_tool'));
      warnSpy.mockRestore();
    });

    it('applies description override from registry entry', () => {
      const manager = new ToolManager({
        registry: [{ name: 'calculator', description: 'Custom calculator description' }]
      });
      manager.loadTools();
      const tool = manager.registry.get('calculator');
      expect(tool.description).toBe('Custom calculator description');
    });

    it('warns on deprecated extra fields in registry entry', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new ToolManager({
        registry: [{ name: 'calculator', type: 'builtin', parameters: {}, builtin_handler: 'math_eval' }]
      });
      manager.loadTools();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated fields'));
      warnSpy.mockRestore();
    });
  });

  describe('isEnabled()', () => {
    it('returns true when tools are loaded', () => {
      const manager = new ToolManager(TOOL_CONFIG);
      manager.loadTools();
      expect(manager.isEnabled()).toBe(true);
    });

    it('returns false when registry is empty', () => {
      const manager = new ToolManager({ registry: [] });
      manager.loadTools();
      expect(manager.isEnabled()).toBe(false);
    });

    it('returns false when no config', () => {
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

  describe('isGlobal()', () => {
    it('returns true when apply_globally: true', () => {
      const manager = new ToolManager({ apply_globally: true });
      expect(manager.isGlobal()).toBe(true);
    });

    it('returns false when apply_globally: false', () => {
      const manager = new ToolManager({ apply_globally: false });
      expect(manager.isGlobal()).toBe(false);
    });

    it('returns false when apply_globally not set', () => {
      const manager = new ToolManager({});
      expect(manager.isGlobal()).toBe(false);
    });
  });
});
