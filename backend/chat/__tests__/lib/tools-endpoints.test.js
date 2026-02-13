'use strict';

const express = require('express');
const request = require('supertest');
const { createToolsRouter } = require('../../routes/tools');
const ToolManager = require('../../tools/manager');

function createTestApp(toolManager, aiProviders = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/tools', createToolsRouter(
    () => toolManager,
    () => ({ aiProviders })
  ));
  return app;
}

const TOOL_CONFIG = {
  max_iterations: 3,
  registry: [
    { name: 'calculator' },
    { name: 'get_current_datetime' }
  ]
};

describe('GET /api/tools/list', () => {
  it('returns empty list when no tool manager', async () => {
    const app = createTestApp(null);
    const res = await request(app).get('/api/tools/list');
    expect(res.status).toBe(200);
    expect(res.body.tools).toEqual([]);
  });

  it('returns registered tools', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager);

    const res = await request(app).get('/api/tools/list');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.tools.map(t => t.name)).toContain('calculator');
    expect(res.body.tools.map(t => t.name)).toContain('get_current_datetime');
    expect(res.body.enabled).toBe(true);
    expect(res.body.max_iterations).toBe(3);
  });

  it('includes type and description in tool listing', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager);

    const res = await request(app).get('/api/tools/list');
    const calcTool = res.body.tools.find(t => t.name === 'calculator');
    expect(calcTool.type).toBe('builtin');
    expect(calcTool.description).toBeTruthy();
  });
});

describe('GET /api/tools/available', () => {
  it('returns all manifest builtins regardless of config', async () => {
    const app = createTestApp(null); // No tool manager
    const res = await request(app).get('/api/tools/available');
    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(3);
    expect(res.body.tools.map(t => t.name)).toContain('calculator');
    expect(res.body.tools.map(t => t.name)).toContain('get_current_datetime');
    expect(res.body.tools.map(t => t.name)).toContain('generate_uuid');
    expect(res.body.count).toBe(3);
  });

  it('returns same builtins even when some are configured', async () => {
    const manager = new ToolManager({ registry: [{ name: 'calculator' }] });
    manager.loadTools();
    const app = createTestApp(manager);
    const res = await request(app).get('/api/tools/available');
    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(3); // All builtins, not just active
  });
});

describe('POST /api/tools/test', () => {
  it('returns 400 when query is missing', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager);

    const res = await request(app).post('/api/tools/test').send({ model: 'gpt-4o', llm: 'chatgpt' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/query/);
  });

  it('returns 400 when model is missing', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager);

    const res = await request(app).post('/api/tools/test').send({ query: 'test', llm: 'chatgpt' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when llm is missing (named-provider mode)', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager);

    const res = await request(app).post('/api/tools/test').send({ query: 'test', model: 'gpt-4o' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no tool manager (named-provider mode)', async () => {
    const app = createTestApp(null);
    const res = await request(app).post('/api/tools/test').send({ query: 'test', model: 'gpt-4o', llm: 'chatgpt' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tool manager/i);
  });

  it('returns 400 when llm provider not found', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();
    const app = createTestApp(manager, {}); // No providers

    const res = await request(app).post('/api/tools/test').send({ query: 'test', model: 'gpt-4o', llm: 'chatgpt' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/chatgpt/);
  });

  it('executes tool test with mock provider and returns results', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();

    const mockProvider = {
      constructor: { name: 'OpenAIProvider' },
      generateChat: jest.fn().mockResolvedValue({
        content: 'Test response',
        finish_reason: 'stop'
      })
    };

    const app = createTestApp(manager, { chatgpt: mockProvider });
    const res = await request(app).post('/api/tools/test').send({
      query: 'Hello',
      model: 'gpt-4o',
      llm: 'chatgpt'
    });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Test response');
    expect(res.body.model).toBe('gpt-4o');
    expect(res.body.tool_calls).toEqual([]);
    expect(res.body.max_iterations_reached).toBe(false);
  });

  it('returns 500 when provider throws', async () => {
    const manager = new ToolManager(TOOL_CONFIG);
    manager.loadTools();

    const mockProvider = {
      constructor: { name: 'OpenAIProvider' },
      generateChat: jest.fn().mockRejectedValue(new Error('API error'))
    };

    const app = createTestApp(manager, { chatgpt: mockProvider });
    const res = await request(app).post('/api/tools/test').send({
      query: 'test',
      model: 'gpt-4o',
      llm: 'chatgpt'
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/API error/);
  });
});
