'use strict';

const fs = require('fs');
const path = require('path');

const SUCCESS_THRESHOLD = 0.8; // 80% success rate required for "validated" status
const MAX_HISTORY_ENTRIES = 50; // Keep last 50 tests per model

/**
 * ModelValidationTracker - Tracks which models successfully use tool calling.
 *
 * A model is considered "validated" when its success rate meets or exceeds
 * the 80% threshold across all recorded tests.
 *
 * Persistence: Stores validation data to a JSON file after each test.
 */
class ModelValidationTracker {
  constructor() {
    this._records = new Map(); // modelId → ValidationRecord
  }

  /**
   * Record a successful tool calling test for a model.
   *
   * @param {string} modelId - Model identifier
   * @param {Object} testDetails - Details about the test
   * @param {string} testDetails.query - The test query
   * @param {string[]} [testDetails.toolsUsed] - Names of tools that were called
   * @param {number} [testDetails.iterationsUsed] - Number of iterations used
   */
  recordSuccess(modelId, testDetails = {}) {
    const record = this._getOrCreate(modelId);
    record.totalTests++;
    record.successCount++;
    record.successRate = record.successCount / record.totalTests;
    record.lastTestedAt = new Date().toISOString();

    record.history.push({
      success: true,
      timestamp: record.lastTestedAt,
      query: testDetails.query || '',
      tools_used: testDetails.toolsUsed || [],
      iterations_used: testDetails.iterationsUsed || 0
    });

    // Trim history to max entries
    if (record.history.length > MAX_HISTORY_ENTRIES) {
      record.history = record.history.slice(-MAX_HISTORY_ENTRIES);
    }

    this._records.set(modelId, record);
  }

  /**
   * Record a failed tool calling test for a model.
   *
   * @param {string} modelId - Model identifier
   * @param {string|Error} error - Error message or Error object
   */
  recordFailure(modelId, error) {
    const record = this._getOrCreate(modelId);
    record.totalTests++;
    // successCount stays the same
    record.successRate = record.successCount / record.totalTests;
    record.lastTestedAt = new Date().toISOString();

    const errorMessage = error instanceof Error ? error.message : String(error);

    record.history.push({
      success: false,
      timestamp: record.lastTestedAt,
      error: errorMessage
    });

    // Trim history
    if (record.history.length > MAX_HISTORY_ENTRIES) {
      record.history = record.history.slice(-MAX_HISTORY_ENTRIES);
    }

    this._records.set(modelId, record);
  }

  /**
   * Check if a model meets the validation threshold (80% success rate).
   *
   * @param {string} modelId - Model identifier
   * @returns {boolean} true if validated, false if not validated or unknown
   */
  isValidated(modelId) {
    const record = this._records.get(modelId);
    if (!record || record.totalTests === 0) return false;
    return record.successRate >= SUCCESS_THRESHOLD;
  }

  /**
   * Get the validation status for a model.
   *
   * @param {string} modelId - Model identifier
   * @returns {Object} Status object with validated, successRate, totalTests, lastTestedAt
   */
  getStatus(modelId) {
    const record = this._records.get(modelId);
    if (!record) {
      return {
        modelId,
        validated: false,
        successRate: null,
        totalTests: 0,
        lastTestedAt: null,
        history: []
      };
    }

    return {
      modelId,
      validated: this.isValidated(modelId),
      successRate: record.successRate,
      totalTests: record.totalTests,
      successCount: record.successCount,
      lastTestedAt: record.lastTestedAt,
      history: record.history
    };
  }

  /**
   * Get status for all tracked models.
   *
   * @returns {Object[]} Array of status objects
   */
  getAllStatuses() {
    return Array.from(this._records.keys()).map(id => this.getStatus(id));
  }

  /**
   * Save validation data to a JSON file.
   *
   * @param {string} filePath - Absolute path to save file
   */
  save(filePath) {
    const data = {
      savedAt: new Date().toISOString(),
      records: Object.fromEntries(this._records)
    };

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load validation data from a JSON file.
   * Non-destructive: merges with existing records.
   *
   * @param {string} filePath - Absolute path to load from
   */
  load(filePath) {
    if (!fs.existsSync(filePath)) {
      return; // No file to load - start fresh
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (data.records && typeof data.records === 'object') {
        for (const [modelId, record] of Object.entries(data.records)) {
          this._records.set(modelId, record);
        }
      }
    } catch (err) {
      console.warn(`⚠️  ValidationTracker: Failed to load from ${filePath}: ${err.message}`);
    }
  }

  /**
   * Get or create a validation record for a model.
   *
   * @private
   * @param {string} modelId
   * @returns {Object} Validation record
   */
  _getOrCreate(modelId) {
    if (!this._records.has(modelId)) {
      this._records.set(modelId, {
        modelId,
        totalTests: 0,
        successCount: 0,
        successRate: 0,
        lastTestedAt: null,
        history: []
      });
    }
    return this._records.get(modelId);
  }
}

module.exports = ModelValidationTracker;
