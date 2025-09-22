// Global cache utility for better performance
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 50; // Maximum number of cached entries
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }

  // Generate a cache key
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  // Get cached data
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache HIT: ${key}`);
    return cached.data;
  }

  // Set cached data
  set(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    console.log(`💾 Cache SET: ${key} (Size: ${this.cache.size})`);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  // Clear expired entries
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttl / (60 * 1000),
      keys: Array.from(this.cache.keys())
    };
  }

  // Preload next page for better UX
  async preloadNext(apiClient, currentPage, pageSize, currency = "All") {
    const nextPage = currentPage + 1;
    const q = currency === "All" ? "" : `&currency=${currency}`;
    const cacheKey = this.generateKey('/invoices', { 
      page: nextPage, 
      pageSize, 
      currency 
    });

    // Don't preload if already cached
    if (this.get(cacheKey)) return;

    try {
      console.log(`🔄 Preloading page ${nextPage}...`);
      const response = await apiClient.get(`/invoices?page=${nextPage}&pageSize=${pageSize}${q}`);
      this.set(cacheKey, response.data);
    } catch (error) {
      console.log(`❌ Preload failed for page ${nextPage}:`, error.message);
    }
  }
}

// Create global cache instance
export const globalCache = new CacheManager();

// Auto-clear expired entries every 2 minutes
setInterval(() => {
  globalCache.clearExpired();
}, 2 * 60 * 1000);

export default globalCache;

