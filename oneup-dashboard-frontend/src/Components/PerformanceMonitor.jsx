import { useEffect, useState } from 'react';

// ✅ Performance monitoring component
const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    renderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor API calls
    const originalFetch = window.fetch;
    let apiCallCount = 0;
    
    window.fetch = function(...args) {
      apiCallCount++;
      return originalFetch.apply(this, args);
    };

    // Monitor cache hits from console logs
    const originalLog = console.log;
    let cacheHitCount = 0;
    
    console.log = function(...args) {
      if (args[0] && args[0].includes('Cache HIT')) {
        cacheHitCount++;
      }
      return originalLog.apply(this, args);
    };

    // Calculate load time
    const calculateLoadTime = () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      setMetrics({
        loadTime: Math.round(loadTime),
        apiCalls: apiCallCount,
        cacheHits: cacheHitCount,
        renderTime: Math.round(performance.now() - startTime)
      });
    };

    // Update metrics every second
    const interval = setInterval(calculateLoadTime, 1000);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
      console.log = originalLog;
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="font-bold mb-1">⚡ Performance Monitor</div>
      <div>Load Time: {metrics.loadTime}ms</div>
      <div>API Calls: {metrics.apiCalls}</div>
      <div>Cache Hits: {metrics.cacheHits}</div>
      <div>Render Time: {metrics.renderTime}ms</div>
    </div>
  );
};

export default PerformanceMonitor;
