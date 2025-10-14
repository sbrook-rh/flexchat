/**
 * Real Working Test - Multiple Collection Candidate Detection
 * 
 * This tests the bug we fixed: ensuring ALL candidates from multiple 
 * collections are collected (not just the first one).
 */

const {
  detectStrategyWithDynamicCollections,
  setConfigForTesting,
  setRetrievalServiceForTesting
} = require('../server');

describe('Multi-Collection Candidate Detection (Real Test)', () => {
  let mockRetrievalService;
  let mockProvider;
  
  beforeEach(() => {
    // Set up mock configuration
    setConfigForTesting({
      strategies: [
        {
          name: 'DYNAMIC_RAG',
          detection: {
            type: 'rag',
            knowledge_base: 'dynamic',
            threshold: 0.25,
            fallback_threshold: 0.5
          },
          response: {
            provider: 'ollama',
            model: 'llama3.2',
            system_prompt: 'You are a helpful assistant.',
            max_tokens: 800,
            temperature: 0.7
          }
        }
      ]
    });
    
    // Set up mock provider
    mockProvider = {
      getName: jest.fn().mockReturnValue('ChromaDBWrapper'),
      getCollectionInfo: jest.fn(),
      query: jest.fn()
    };
    
    // Set up mock retrieval service
    mockRetrievalService = {
      providers: new Map([
        ['dynamic', mockProvider]
      ])
    };
    
    setRetrievalServiceForTesting(mockRetrievalService);
  });
  
  test('should collect ALL candidates from multiple collections (not just first)', async () => {
    // ==================== ARRANGE ====================
    
    // Mock responses for 2 collections - BOTH are candidates (within fallback threshold)
    
    // Collection 1: openshift-ai-docs (distance 0.28 - candidate)
    mockProvider.getCollectionInfo
      .mockResolvedValueOnce({
        metadata: {
          threshold: 0.25,
          fallback_threshold: 0.5,
          description: 'OpenShift AI documentation',
          system_prompt: 'You are an OpenShift AI expert.'
        }
      });
    
    mockProvider.query
      .mockResolvedValueOnce([
        { text: 'Model serving in OpenShift AI...', distance: 0.28, metadata: {} },
        { text: 'KServe configuration...', distance: 0.29, metadata: {} },
        { text: 'ServingRuntime details...', distance: 0.30, metadata: {} }
      ]);
    
    // Collection 2: openshift-docs (distance 0.35 - also candidate)
    mockProvider.getCollectionInfo
      .mockResolvedValueOnce({
        metadata: {
          threshold: 0.25,
          fallback_threshold: 0.5,
          description: 'OpenShift product documentation',
          system_prompt: 'You are an OpenShift expert.'
        }
      });
    
    mockProvider.query
      .mockResolvedValueOnce([
        { text: 'Deploying apps in OpenShift...', distance: 0.35, metadata: {} },
        { text: 'Pod basics...', distance: 0.36, metadata: {} },
        { text: 'Resource management...', distance: 0.37, metadata: {} }
      ]);
    
    const selectedCollections = [
      { knowledgeBase: 'dynamic', collection: 'openshift-ai-docs' },
      { knowledgeBase: 'dynamic', collection: 'openshift-docs' }
    ];
    
    const userQuery = 'How do I deploy a model serving runtime?';
    
    // ==================== ACT ====================
    
    const result = await detectStrategyWithDynamicCollections(selectedCollections, userQuery);
    
    // ==================== ASSERT ====================
    
    // Should NOT be an immediate match (both distances > 0.25)
    expect(result.matched).toBe(false);
    
    // CRITICAL: Should have collected BOTH candidates (this is the bug we fixed!)
    expect(result.candidates).toHaveLength(2);
    
    // Verify first candidate (openshift-ai-docs)
    expect(result.candidates[0].strategy.name).toBe('DYNAMIC_RAG');
    expect(result.candidates[0].distance).toBe(0.28);
    expect(result.candidates[0].results).toHaveLength(3);
    expect(result.candidates[0].description).toBe('OpenShift AI documentation');
    expect(result.candidates[0].strategy.response.system_prompt).toBe('You are an OpenShift AI expert.');
    
    // Verify second candidate (openshift-docs)
    expect(result.candidates[1].strategy.name).toBe('DYNAMIC_RAG');
    expect(result.candidates[1].distance).toBe(0.35);
    expect(result.candidates[1].results).toHaveLength(3);
    expect(result.candidates[1].description).toBe('OpenShift product documentation');
    expect(result.candidates[1].strategy.response.system_prompt).toBe('You are an OpenShift expert.');
    
    // Verify mocks were called correctly
    expect(mockProvider.getCollectionInfo).toHaveBeenCalledTimes(2);
    expect(mockProvider.query).toHaveBeenCalledTimes(2);
    
    // Verify correct collections were queried
    expect(mockProvider.query).toHaveBeenNthCalledWith(1, userQuery, {
      collection: 'openshift-ai-docs',
      top_k: 3
    });
    expect(mockProvider.query).toHaveBeenNthCalledWith(2, userQuery, {
      collection: 'openshift-docs',
      top_k: 3
    });
  });
  
  test('should return immediately on first immediate match (distance < lower threshold)', async () => {
    // ==================== ARRANGE ====================
    
    // Collection 1: immediate match (distance 0.20 < threshold 0.25)
    mockProvider.getCollectionInfo
      .mockResolvedValueOnce({
        metadata: {
          threshold: 0.25,
          fallback_threshold: 0.5,
          description: 'OpenShift AI documentation',
          system_prompt: 'You are an OpenShift AI expert.'
        }
      });
    
    mockProvider.query
      .mockResolvedValueOnce([
        { text: 'Model serving...', distance: 0.20, metadata: {} },
        { text: 'KServe...', distance: 0.22, metadata: {} }
      ]);
    
    const selectedCollections = [
      { knowledgeBase: 'dynamic', collection: 'openshift-ai-docs' },
      { knowledgeBase: 'dynamic', collection: 'openshift-docs' } // Should NOT be queried
    ];
    
    // ==================== ACT ====================
    
    const result = await detectStrategyWithDynamicCollections(selectedCollections, 'test query');
    
    // ==================== ASSERT ====================
    
    // Should be an immediate match
    expect(result.matched).toBe(true);
    expect(result.strategy).toBeDefined();
    expect(result.context).toEqual(['Model serving...', 'KServe...']);
    expect(result.ragResults).toHaveLength(2);
    
    // Should only query first collection (stops on immediate match)
    expect(mockProvider.query).toHaveBeenCalledTimes(1);
  });
  
  test('should return no candidates when all distances exceed fallback threshold', async () => {
    // ==================== ARRANGE ====================
    
    // Both collections have distances > fallback_threshold (0.5)
    mockProvider.getCollectionInfo
      .mockResolvedValue({
        metadata: {
          threshold: 0.25,
          fallback_threshold: 0.5,
          description: 'Test docs'
        }
      });
    
    mockProvider.query
      .mockResolvedValueOnce([
        { text: 'Irrelevant content...', distance: 0.75, metadata: {} }
      ])
      .mockResolvedValueOnce([
        { text: 'Also irrelevant...', distance: 0.80, metadata: {} }
      ]);
    
    const selectedCollections = [
      { knowledgeBase: 'dynamic', collection: 'col1' },
      { knowledgeBase: 'dynamic', collection: 'col2' }
    ];
    
    // ==================== ACT ====================
    
    const result = await detectStrategyWithDynamicCollections(selectedCollections, 'test query');
    
    // ==================== ASSERT ====================
    
    expect(result.matched).toBe(false);
    expect(result.candidates).toHaveLength(0); // No candidates
  });
});

