import { useState, useCallback } from 'react';

const STORAGE_KEY = 'flex-chat:model-validation';
const VALIDATION_THRESHOLD = 0.8; // 80% success rate = validated

/**
 * Model key from llm provider name + model id.
 * e.g. "local/qwen2.5:7b-instruct"
 */
function modelKey(llm, modelId) {
  return `${llm}/${modelId}`;
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota or private browsing - fail silently
  }
}

/**
 * useModelValidation
 *
 * Stores and retrieves per-model validation data in localStorage.
 *
 * Schema (per model key):
 * {
 *   capabilities: {
 *     [capabilityName]: {
 *       validated: boolean,      // successRate >= VALIDATION_THRESHOLD
 *       successRate: number,     // 0.0 - 1.0
 *       testCount: number,
 *       successCount: number,
 *       lastTestedAt: string     // ISO timestamp
 *     }
 *   },
 *   properties: {
 *     [key]: any                 // open-ended: notes, context_window, speed, etc.
 *   }
 * }
 */
export function useModelValidation() {
  // Reactive state mirrors localStorage so components re-render on changes
  const [validationData, setValidationData] = useState(() => readStorage());

  const update = useCallback((updater) => {
    const current = readStorage();
    const updated = updater(current);
    writeStorage(updated);
    setValidationData({ ...updated });
    return updated;
  }, []);

  /**
   * Record a capability test result for a model.
   *
   * @param {string} llm        - LLM provider name (e.g. "local", "chatgpt")
   * @param {string} modelId    - Model identifier (e.g. "qwen2.5:7b-instruct")
   * @param {string} capability - Capability name (e.g. "function-calling")
   * @param {boolean} success   - Whether the test passed
   */
  const recordCapabilityTest = useCallback((llm, modelId, capability, success) => {
    update(data => {
      const key = modelKey(llm, modelId);
      const model = data[key] || { capabilities: {}, properties: {} };
      const existing = model.capabilities[capability] || { testCount: 0, successCount: 0 };

      const testCount = existing.testCount + 1;
      const successCount = existing.successCount + (success ? 1 : 0);
      const successRate = successCount / testCount;

      return {
        ...data,
        [key]: {
          ...model,
          capabilities: {
            ...model.capabilities,
            [capability]: {
              validated: successRate >= VALIDATION_THRESHOLD,
              successRate,
              testCount,
              successCount,
              lastTestedAt: new Date().toISOString()
            }
          }
        }
      };
    });
  }, [update]);

  /**
   * Get capability status for a model.
   * Always reads fresh from localStorage so cross-component reads are never stale.
   *
   * @param {string} llm
   * @param {string} modelId
   * @param {string} capability
   * @returns {{ validated, successRate, testCount, successCount, lastTestedAt } | null}
   */
  const getCapabilityStatus = useCallback((llm, modelId, capability) => {
    const key = modelKey(llm, modelId);
    return readStorage()[key]?.capabilities?.[capability] || null;
  }, []);

  /**
   * Returns true if a model has a validated capability.
   * Always reads fresh from localStorage so cross-component reads are never stale.
   *
   * @param {string} llm
   * @param {string} modelId
   * @param {string} capability
   * @returns {boolean}
   */
  const isCapabilityValidated = useCallback((llm, modelId, capability) => {
    const key = modelKey(llm, modelId);
    return readStorage()[key]?.capabilities?.[capability]?.validated === true;
  }, []);

  /**
   * Set an arbitrary property on a model (context window, notes, speed, etc.).
   *
   * @param {string} llm
   * @param {string} modelId
   * @param {string} propertyKey
   * @param {*} value
   */
  const setModelProperty = useCallback((llm, modelId, propertyKey, value) => {
    update(data => {
      const key = modelKey(llm, modelId);
      const model = data[key] || { capabilities: {}, properties: {} };
      return {
        ...data,
        [key]: {
          ...model,
          properties: {
            ...model.properties,
            [propertyKey]: value
          }
        }
      };
    });
  }, [update]);

  /**
   * Get a property value for a model.
   *
   * @param {string} llm
   * @param {string} modelId
   * @param {string} propertyKey
   * @returns {*} Value or undefined
   */
  const getModelProperty = useCallback((llm, modelId, propertyKey) => {
    const key = modelKey(llm, modelId);
    return readStorage()[key]?.properties?.[propertyKey];
  }, []);

  /**
   * Get all stored data for a model.
   *
   * @param {string} llm
   * @param {string} modelId
   * @returns {{ capabilities, properties } | null}
   */
  const getModelData = useCallback((llm, modelId) => {
    return readStorage()[modelKey(llm, modelId)] || null;
  }, []);

  return {
    validationData,
    recordCapabilityTest,
    getCapabilityStatus,
    isCapabilityValidated,
    setModelProperty,
    getModelProperty,
    getModelData
  };
}
