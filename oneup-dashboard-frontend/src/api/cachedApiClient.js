import apiClient from './apiClient';
import { globalCache } from '../utils/cache';

// Enhanced API client with caching
class CachedApiClient {
  constructor() {
    this.baseClient = apiClient;
    this.requestQueue = []; // Queue for throttling requests
    this.isProcessing = false;
  }

  // ✅ Optimized get with enhanced caching
  async get(url, config = {}) {
    const { useCache = true, useSessionCache = false, ...restConfig } = config;
    
    if (!useCache) {
      return this.baseClient.get(url, restConfig);
    }

    // Parse URL to create cache key
    const [endpoint, queryString] = url.split('?');
    const params = {};
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
      });
    }

    const cacheKey = globalCache.generateKey(endpoint, params);
    
    // Try to get from cache first
    const cached = globalCache.get(cacheKey, useSessionCache);
    if (cached) {
      return { data: cached };
    }

    // Fetch from API and cache
    try {
      const response = await this.baseClient.get(url, restConfig);
      globalCache.set(cacheKey, response.data, useSessionCache);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Direct methods for other HTTP verbs (no caching)
  async post(url, data, config) {
    return this.baseClient.post(url, data, config);
  }

  async put(url, data, config) {
    return this.baseClient.put(url, data, config);
  }

  async delete(url, config) {
    return this.baseClient.delete(url, config);
  }

  // Preload data for better UX
  async preloadInvoices(page, pageSize, currency = "All") {
    return globalCache.preloadNext(this.baseClient, page, pageSize, currency);
  }

  // Get cache stats
  getCacheStats() {
    return globalCache.getStats();
  }

  // Clear cache
  clearCache() {
    globalCache.clear();
  }
}

export default new CachedApiClient();

