// ✅ Optimized global cache utility for better performance
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 500; // Increased cache size for aggressive caching
    this.ttl = 30 * 60 * 1000; // 30 minutes TTL for better caching
    this.sessionCache = new Map(); // Separate session cache for critical data
    this.sessionTtl = 60 * 60 * 1000; // 60 minutes for session cache
    this.compressionEnabled = true; // Enable data compression for large datasets
    this.preloadEnabled = true; // Enable preloading for better UX
  }

  // Generate a cache key
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  // ✅ Optimized get method with session cache support
  get(key, useSessionCache = false) {
    const cache = useSessionCache ? this.sessionCache : this.cache;
    const ttl = useSessionCache ? this.sessionTtl : this.ttl;
    
    const cached = cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > ttl) {
      cache.delete(key);
      return null;
    }

    console.log(`📦 Cache HIT: ${key} ${useSessionCache ? '(session)' : ''}`);
    return cached.data;
  }

  // ✅ Optimized set method with compression for large datasets
  set(key, data, useSessionCache = false) {
    const cache = useSessionCache ? this.sessionCache : this.cache;
    const maxSize = useSessionCache ? 50 : this.maxSize;
    
    // Remove oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // Compress large datasets to save memory
    let processedData = data;
    if (this.compressionEnabled && Array.isArray(data) && data.length > 1000) {
      processedData = this.compressInvoiceData(data);
      console.log(`🗜️ Compressed ${data.length} invoices for caching`);
    }

    cache.set(key, {
      data: processedData,
      timestamp: Date.now(),
      compressed: Array.isArray(data) && data.length > 1000
    });

    console.log(`💾 Cache SET: ${key} ${useSessionCache ? '(session)' : ''} (Size: ${cache.size})`);
  }

  // ✅ Compress invoice data to reduce memory usage
  compressInvoiceData(invoices) {
    return invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      salespersonName: invoice.salespersonName,
      total: invoice.total,
      currency: invoice.currency,
      invoiceDate: invoice.invoiceDate,
      createdAt: invoice.createdAt,
      status: invoice.status,
      paid: invoice.paid,
      unpaid: invoice.unpaid,
      sent: invoice.sent,
      sent_at: invoice.sent_at
    }));
  }

  // ✅ Clear all cache including session cache
  clear() {
    this.cache.clear();
    this.sessionCache.clear();
    console.log('🗑️ All cache cleared');
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

