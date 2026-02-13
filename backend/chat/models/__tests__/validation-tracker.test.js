'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const ModelValidationTracker = require('../validation-tracker');

describe('ModelValidationTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ModelValidationTracker();
  });

  describe('recordSuccess()', () => {
    it('increments totalTests and successCount', () => {
      tracker.recordSuccess('gpt-4o');
      const status = tracker.getStatus('gpt-4o');
      expect(status.totalTests).toBe(1);
      expect(status.successCount).toBe(1);
    });

    it('updates successRate to 1.0 after first success', () => {
      tracker.recordSuccess('gpt-4o');
      expect(tracker.getStatus('gpt-4o').successRate).toBe(1.0);
    });

    it('stores test details in history', () => {
      tracker.recordSuccess('gpt-4o', { query: 'calc 2+2', toolsUsed: ['calculator'] });
      const { history } = tracker.getStatus('gpt-4o');
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].query).toBe('calc 2+2');
      expect(history[0].tools_used).toEqual(['calculator']);
    });
  });

  describe('recordFailure()', () => {
    it('increments totalTests but not successCount', () => {
      tracker.recordFailure('gpt-4o', 'API error');
      const status = tracker.getStatus('gpt-4o');
      expect(status.totalTests).toBe(1);
      expect(status.successCount).toBe(0);
    });

    it('sets successRate to 0 after first failure', () => {
      tracker.recordFailure('gpt-4o', 'error');
      expect(tracker.getStatus('gpt-4o').successRate).toBe(0);
    });

    it('stores error in history', () => {
      tracker.recordFailure('gpt-4o', new Error('Timeout'));
      const { history } = tracker.getStatus('gpt-4o');
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe('Timeout');
    });

    it('accepts string errors', () => {
      tracker.recordFailure('gpt-4o', 'string error');
      const { history } = tracker.getStatus('gpt-4o');
      expect(history[0].error).toBe('string error');
    });
  });

  describe('success rate calculation', () => {
    it('calculates 80% success rate correctly', () => {
      // 4 successes, 1 failure = 80%
      tracker.recordSuccess('model', { query: '1' });
      tracker.recordSuccess('model', { query: '2' });
      tracker.recordSuccess('model', { query: '3' });
      tracker.recordSuccess('model', { query: '4' });
      tracker.recordFailure('model', 'error');

      const status = tracker.getStatus('model');
      expect(status.successRate).toBe(0.8);
      expect(status.totalTests).toBe(5);
      expect(status.successCount).toBe(4);
    });

    it('calculates 60% success rate correctly', () => {
      tracker.recordSuccess('model');
      tracker.recordSuccess('model');
      tracker.recordSuccess('model');
      tracker.recordFailure('model', 'e');
      tracker.recordFailure('model', 'e');

      expect(tracker.getStatus('model').successRate).toBe(0.6);
    });
  });

  describe('isValidated()', () => {
    it('returns false for unknown model', () => {
      expect(tracker.isValidated('unknown')).toBe(false);
    });

    it('returns true when success rate >= 80%', () => {
      for (let i = 0; i < 4; i++) tracker.recordSuccess('model');
      tracker.recordFailure('model', 'err');
      expect(tracker.isValidated('model')).toBe(true);
    });

    it('returns false when success rate < 80%', () => {
      for (let i = 0; i < 3; i++) tracker.recordSuccess('model');
      for (let i = 0; i < 2; i++) tracker.recordFailure('model', 'err');
      expect(tracker.isValidated('model')).toBe(false); // 60%
    });

    it('returns true when all tests pass (100%)', () => {
      tracker.recordSuccess('model');
      expect(tracker.isValidated('model')).toBe(true);
    });
  });

  describe('getStatus()', () => {
    it('returns null fields for unknown model', () => {
      const status = tracker.getStatus('unknown');
      expect(status.validated).toBe(false);
      expect(status.successRate).toBeNull();
      expect(status.totalTests).toBe(0);
      expect(status.lastTestedAt).toBeNull();
    });

    it('includes validated flag', () => {
      tracker.recordSuccess('model');
      expect(tracker.getStatus('model').validated).toBe(true);
    });
  });

  describe('save() and load()', () => {
    let tmpFile;

    beforeEach(() => {
      tmpFile = path.join(os.tmpdir(), `validation-test-${Date.now()}.json`);
    });

    afterEach(() => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    it('saves and loads validation data', () => {
      tracker.recordSuccess('gpt-4o', { query: 'test' });
      tracker.recordFailure('llama3.2', 'error');
      tracker.save(tmpFile);

      const newTracker = new ModelValidationTracker();
      newTracker.load(tmpFile);

      expect(newTracker.getStatus('gpt-4o').totalTests).toBe(1);
      expect(newTracker.getStatus('gpt-4o').successCount).toBe(1);
      expect(newTracker.getStatus('llama3.2').totalTests).toBe(1);
      expect(newTracker.getStatus('llama3.2').successCount).toBe(0);
    });

    it('load() is a no-op when file does not exist', () => {
      expect(() => tracker.load('/nonexistent/path.json')).not.toThrow();
    });

    it('creates parent directory if it does not exist', () => {
      const nestedFile = path.join(os.tmpdir(), `nested-${Date.now()}`, 'data.json');
      try {
        tracker.recordSuccess('model');
        tracker.save(nestedFile);
        expect(fs.existsSync(nestedFile)).toBe(true);
      } finally {
        if (fs.existsSync(nestedFile)) {
          fs.unlinkSync(nestedFile);
          fs.rmdirSync(path.dirname(nestedFile));
        }
      }
    });
  });
});
