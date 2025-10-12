const { registry } = require('../providers');

/**
 * HealthChecker - Service for monitoring AI provider health
 */
class HealthChecker {
  constructor() {
    this.healthCache = new Map();
    this.checkInterval = 60000; // 1 minute
    this.cacheTimeout = 300000; // 5 minutes
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start periodic health checks
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAllProviders();
    }, this.checkInterval);
    
    console.log('🏥 Health checker started');
  }

  /**
   * Stop periodic health checks
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🏥 Health checker stopped');
  }

  /**
   * Check health of all providers
   */
  async checkAllProviders() {
    const providers = registry.listProviders();
    const healthPromises = providers.map(provider => this.checkProvider(provider));
    
    try {
      await Promise.allSettled(healthPromises);
    } catch (error) {
      console.error('Error during health check:', error.message);
    }
  }

  /**
   * Check health of a specific provider
   */
  async checkProvider(providerName) {
    try {
      const ProviderClass = registry.getProvider(providerName);
      if (!ProviderClass) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      // Get configuration for the provider
      const config = this.getConfigForProvider(providerName);
      const provider = new ProviderClass(config);
      
      const health = await provider.healthCheck();
      
      // Cache the health status
      this.healthCache.set(providerName, {
        ...health,
        lastChecked: new Date().toISOString()
      });

      return health;
    } catch (error) {
      const health = {
        status: 'unhealthy',
        provider: providerName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.healthCache.set(providerName, {
        ...health,
        lastChecked: new Date().toISOString()
      });
      
      return health;
    }
  }

  /**
   * Get health status for a provider
   */
  getProviderHealth(providerName) {
    const cached = this.healthCache.get(providerName);
    
    if (!cached) {
      return {
        status: 'unknown',
        provider: providerName,
        message: 'No health data available'
      };
    }

    // Check if cache is stale
    const lastChecked = new Date(cached.lastChecked);
    const now = new Date();
    const age = now - lastChecked;
    
    if (age > this.cacheTimeout) {
      return {
        ...cached,
        status: 'stale',
        message: 'Health data is stale'
      };
    }

    return cached;
  }

  /**
   * Get health status for all providers
   */
  getAllProviderHealth() {
    const providers = registry.listProviders();
    const health = {};
    
    providers.forEach(provider => {
      health[provider] = this.getProviderHealth(provider);
    });
    
    return health;
  }

  /**
   * Get overall system health
   */
  getSystemHealth() {
    const allHealth = this.getAllProviderHealth();
    const providers = Object.keys(allHealth);
    const healthyProviders = providers.filter(p => allHealth[p].status === 'healthy');
    
    return {
      overall: healthyProviders.length > 0 ? 'healthy' : 'unhealthy',
      providers: allHealth,
      healthyCount: healthyProviders.length,
      totalCount: providers.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recommended providers based on health
   */
  getRecommendedProviders() {
    const allHealth = this.getAllProviderHealth();
    const healthy = [];
    const unhealthy = [];
    
    Object.entries(allHealth).forEach(([provider, health]) => {
      if (health.status === 'healthy') {
        healthy.push(provider);
      } else {
        unhealthy.push(provider);
      }
    });
    
    return {
      healthy,
      unhealthy,
      recommended: healthy[0] || null // First healthy provider
    };
  }

  /**
   * Get configuration for a provider
   */
  getConfigForProvider(providerName) {
    const configs = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || process.env.CHAT_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        timeout: 5000, // Shorter timeout for health checks
        retries: 1,
        retryDelay: 1000
      }
      // Future providers will be added here
    };

    return configs[providerName.toLowerCase()] || {};
  }

  /**
   * Force a health check for a specific provider
   */
  async forceCheck(providerName) {
    return await this.checkProvider(providerName);
  }

  /**
   * Get health check statistics
   */
  getStats() {
    const allHealth = this.getAllProviderHealth();
    const stats = {
      totalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      averageResponseTime: 0,
      lastCheck: null
    };

    Object.values(allHealth).forEach(health => {
      stats.totalChecks++;
      if (health.status === 'healthy') {
        stats.healthyChecks++;
      } else {
        stats.unhealthyChecks++;
      }
      
      if (health.lastChecked) {
        const checkTime = new Date(health.lastChecked);
        if (!stats.lastCheck || checkTime > new Date(stats.lastCheck)) {
          stats.lastCheck = health.lastChecked;
        }
      }
    });

    return stats;
  }
}

module.exports = HealthChecker;
