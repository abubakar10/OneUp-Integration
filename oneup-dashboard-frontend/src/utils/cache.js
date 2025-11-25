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
    this.lastInvoiceSync = null; // Track last invoice sync time
    this.invoiceCacheKeys = new Set(); // Track invoice-related cache keys
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
    
    // Track invoice-related cache keys for smart invalidation
    if (key.includes('/invoices') || key.includes('dashboard-invoices') || key.includes('salespersons')) {
      this.invoiceCacheKeys.add(key);
    }
    
    // Remove oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
      this.invoiceCacheKeys.delete(firstKey);
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
    this.invoiceCacheKeys.clear();
    console.log('🗑️ All cache cleared');
  }

  // ✅ Smart cache invalidation for invoice-related data
  invalidateInvoiceCache() {
    let invalidatedCount = 0;
    
    // Clear invoice-related cache keys from memory cache
    for (const key of this.invoiceCacheKeys) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
      if (this.sessionCache.has(key)) {
        this.sessionCache.delete(key);
        invalidatedCount++;
      }
    }
    
    // Clear invoice-related session storage
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('dashboard-invoices') || key.includes('salespersons') || key.includes('invoice'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      invalidatedCount++;
    });
    
    this.invoiceCacheKeys.clear();
    this.lastInvoiceSync = Date.now();
    
    console.log(`🗑️ Invalidated ${invalidatedCount} invoice-related cache entries`);
    return invalidatedCount;
  }

  // ✅ Check if invoice cache needs refresh based on sync time
  shouldRefreshInvoiceCache(maxAgeMinutes = 5) {
    if (!this.lastInvoiceSync) return true;
    
    const ageMinutes = (Date.now() - this.lastInvoiceSync) / (60 * 1000);
    return ageMinutes > maxAgeMinutes;
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

