import { useEffect, useState } from "react";
import cachedApiClient from "../api/cachedApiClient";

// Enhanced Spinner
const Spinner = ({ pageSize = 100 }) => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">
      🌐 Fetching {pageSize} invoices...
    </p>
    <div className="mt-2 text-sm text-gray-500">
      Please wait, this may take a moment
    </div>
  </div>
);

// Stats Card Component
const StatsCard = ({ icon, title, value, subtitle, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600 bg-blue-50",
    green: "from-green-500 to-green-600 text-green-600 bg-green-50",
    purple: "from-purple-500 to-purple-600 text-purple-600 bg-purple-50",
    orange: "from-orange-500 to-orange-600 text-orange-600 bg-orange-50"
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[3]}`}>
          <div className={`text-2xl ${colorClasses[color].split(' ')[1]}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

// Modern Invoice Card Component
const InvoiceCard = ({ invoice, index, page, pageSize }) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-lg">#{invoice.invoiceNumber || invoice.id}</h3>
        <p className="text-sm text-gray-500">Invoice #{(page - 1) * pageSize + (index + 1)}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        invoice.currency === 'USD' ? 'bg-green-100 text-green-800' :
        invoice.currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
        'bg-purple-100 text-purple-800'
      }`}>
        {invoice.currency}
      </span>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-600">Customer:</span>
        <span className="font-medium text-gray-900 text-right">{invoice.customerName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Salesperson:</span>
        <span className="font-medium text-blue-600">{invoice.salespersonName || "Unknown"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Date:</span>
        <span className="font-medium text-gray-900">{invoice.invoiceDate?.slice(0, 10) || "—"}</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-gray-600 font-medium">Total:</span>
                        <span className="text-xl font-bold text-green-600">{parseFloat(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      </div>
    </div>
  </div>
);

function Dashboard() {
  const [currency, setCurrency] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // table or cards
  const [sortBy, setSortBy] = useState("invoiceDate"); // invoiceDate or creationDate

  // ✅ Pagination state for OneUp API (all records in one call)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Frontend pagination: 100 invoices per page
  const [hasMorePages, setHasMorePages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // ✅ Frontend pagination state
  const [allInvoices, setAllInvoices] = useState([]); // Store all loaded invoices
  const [currentPageInvoices, setCurrentPageInvoices] = useState([]); // Current page invoices


  // ✅ Dashboard statistics
  const [stats, setStats] = useState({
    currencySales: {},
    totalInvoices: 0,
    avgSale: 0,
    topSalesperson: ""
  });

  // ✅ Sales summary from all invoices
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    totalInvoices: 0,
    averageSale: 0,
    salesByCurrency: {},
    currencyBreakdown: {}
  });

  // ✅ Time-based currency sales
  const [timePeriod, setTimePeriod] = useState("all");
  const [currencySalesData, setCurrencySalesData] = useState({
    timePeriod: "all",
    totalSales: 0,
    currencySales: {
      USD: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 },
      PKR: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 },
      AED: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 }
    },
    summary: {
      usdTotal: 0,
      pkrTotal: 0,
      aedTotal: 0,
      otherTotal: 0
    }
  });

  // Calculate stats from current page data
  useEffect(() => {
    if (currentPageInvoices.length > 0) {
      // Calculate sales by currency
      const currencySales = {};
      currentPageInvoices.forEach(inv => {
        const currency = inv.currency || "USD";
        const total = parseFloat(inv.total || 0);
        currencySales[currency] = (currencySales[currency] || 0) + (isNaN(total) ? 0 : total);
      });
      
      // Calculate average sale (using USD as reference for display)
      const usdSales = currencySales["USD"] || 0;
      const avgSale = usdSales / currentPageInvoices.filter(inv => inv.currency === "USD").length || 0;
      
      // Find top salesperson on current page
      const salespersonSales = {};
      currentPageInvoices.forEach(inv => {
        const name = inv.salespersonName || "Unknown";
        const total = parseFloat(inv.total || 0);
        salespersonSales[name] = (salespersonSales[name] || 0) + (isNaN(total) ? 0 : total);
      });
      
      const topSalesperson = Object.entries(salespersonSales)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "Unknown";

      setStats({
        currencySales,
        totalInvoices: totalCount,
        avgSale: isNaN(avgSale) ? 0 : avgSale,
        topSalesperson
      });
    } else {
      setStats({
        currencySales: {},
        totalInvoices: 0,
        avgSale: 0,
        topSalesperson: "Unknown"
      });
    }
  }, [currentPageInvoices, totalCount]);

  // ✅ Fetch sales summary from all invoices (with caching)
  useEffect(() => {
    const fetchSalesSummary = async () => {
      // Check cache first
      const cacheKey = 'dashboard-sales-summary';
      const cachedSummary = sessionStorage.getItem(cacheKey);
      
      if (cachedSummary) {
        try {
          const parsedSummary = JSON.parse(cachedSummary);
          console.log('📦 Loading cached sales summary');
          setSalesSummary(parsedSummary);
          return;
        } catch (error) {
          console.warn("Failed to parse cached sales summary:", error);
        }
      }

      try {
        console.log('🔄 Fetching sales summary from all invoices...');
        const response = await cachedApiClient.get('/invoices/sales-summary', { useCache: true });
        const summary = response.data;
        
        console.log('📊 Sales Summary:', summary);
        
        // Cache the summary
        sessionStorage.setItem(cacheKey, JSON.stringify(summary));
        console.log('💾 Cached sales summary');
        
        setSalesSummary(summary);
      } catch (err) {
        console.error("❌ Error fetching sales summary:", err);
        // Fallback to empty data if API fails
        setSalesSummary({
          totalSales: 0,
          totalInvoices: 0,
          averageSale: 0,
          salesByCurrency: {},
          currencyBreakdown: {}
        });
      }
    };
    
    fetchSalesSummary();
  }, []); // Run once on component mount

  // ✅ Fetch currency sales by time period
  useEffect(() => {
    const fetchCurrencySales = async () => {
      try {
        console.log(`🔄 Fetching currency sales for time period: ${timePeriod}`);
        
        // Try manual calculation endpoint first
        let response;
        try {
          response = await cachedApiClient.get('/invoices/manual-currency-totals', { useCache: true });
          console.log('✅ Using manual calculation endpoint');
        } catch (manualErr) {
          console.log('⚠️ Manual endpoint failed, trying original endpoint:', manualErr.message);
          response = await cachedApiClient.get(`/invoices/currency-sales?timePeriod=${timePeriod}`, { useCache: true });
        }
        
        const data = response.data;
        
        console.log('💱 Currency Sales Data:', data);
        console.log('📊 Manual Totals:', data.manualTotals);
        console.log('📈 Detailed Stats:', data.detailedStats);
        
        setCurrencySalesData(data);
      } catch (err) {
        console.error("❌ Error fetching currency sales:", err);
        // Fallback to empty data if API fails
        setCurrencySalesData({
          timePeriod: timePeriod,
          totalSales: 0,
          currencySales: {
            USD: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 },
            PKR: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 },
            AED: { totalSales: 0, invoiceCount: 0, averageSale: 0, percentage: 0 }
          },
          summary: {
            usdTotal: 0,
            pkrTotal: 0,
            aedTotal: 0,
            otherTotal: 0
          }
        });
      }
    };
    
    fetchCurrencySales();
  }, [timePeriod]); // Run when time period changes

  // ✅ Fetch debug data to check what's in the database
  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        console.log('🔍 Fetching debug data...');
        const response = await cachedApiClient.get('/invoices/debug-data', { useCache: false });
        const debugData = response.data;
        
        console.log('🐛 Debug Data:', debugData);
        console.log('📊 Sample Invoices:', debugData.sampleInvoices);
        console.log('💱 Currency Breakdown:', debugData.currencyBreakdown);
        console.log('💰 Total Sales by Currency:', debugData.totalSalesByCurrency);
        console.log('📈 Total Sales:', debugData.totalSales);
        console.log('📋 Has Data:', debugData.hasData);
      } catch (err) {
        console.error("❌ Error fetching debug data:", err);
      }
    };
    
    fetchDebugData();
  }, []); // Run once on component mount

  // ✅ Load all invoices once, then paginate on frontend (with persistent caching)
  useEffect(() => {
    const fetchAllInvoices = async () => {
      // Check if we already have data cached
      const cacheKey = `dashboard-invoices-${sortBy}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData && !loading) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log(`📦 Loading cached invoices: ${parsedData.length} invoices`);
          setAllInvoices(parsedData);
          setTotalCount(parsedData.length);
          setLoading(false);
          return;
        } catch (error) {
          console.warn("Failed to parse cached data:", error);
        }
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`🔄 Fetching ALL invoices: currency=${currency}, sortBy=${sortBy}`);
        
        // Fetch ALL invoices in one call (with caching enabled)
        const response = await cachedApiClient.get(`/invoices?page=1&pageSize=-1&sortBy=${sortBy}`, { useCache: true });
        const meta = response.data;

        console.log('📊 API Response:', meta);

        // Handle API error responses
        if (meta.error) {
          console.error('❌ API Error:', meta.error);
          setError(meta.error);
          setAllInvoices([]);
          setCurrentPageInvoices([]);
          setLoading(false);
          return;
        }

        // Get all invoices data
        let invoicesData = meta.data || [];
        
        // Try to cache the raw data (before currency filtering)
        safeSetStorage(cacheKey, invoicesData);
        
        // Filter by currency if not "All"
        if (currency !== "All") {
          invoicesData = invoicesData.filter(inv => inv.currency === currency);
        }
        
        console.log(`✅ Loaded ${invoicesData.length} total invoices`);
        setAllInvoices(invoicesData);
        setTotalCount(invoicesData.length);
        
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching invoices:", err);
        setError(`Failed to fetch invoices: ${err.message}`);
        setAllInvoices([]);
        setCurrentPageInvoices([]);
        setLoading(false);
      }
    };
    
    fetchAllInvoices();
  }, [currency, sortBy]); // Only re-fetch when currency or sort changes

  // ✅ Cache invalidation function
  const clearDashboardCache = () => {
    const keys = [
      'dashboard-invoices-invoiceDate',
      'dashboard-invoices-creationDate', 
      'dashboard-sales-summary',
      'dashboard-currency-sales-all',
      'dashboard-currency-sales-month',
      'dashboard-currency-sales-quarter',
      'dashboard-currency-sales-year'
    ];
    
    keys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('🗑️ Cleared dashboard cache');
  };

  // ✅ Data compression utility
  const compressData = (data) => {
    try {
      // Remove unnecessary fields to reduce size
      const compressed = data.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        salespersonName: inv.salespersonName,
        total: inv.total,
        currency: inv.currency,
        invoiceDate: inv.invoiceDate,
        createdAt: inv.createdAt
      }));
      return JSON.stringify(compressed);
    } catch (error) {
      console.warn('Failed to compress data:', error);
      return null;
    }
  };

  // ✅ Safe storage function with fallback
  const safeSetStorage = (key, data) => {
    try {
      const compressed = compressData(data);
      if (compressed) {
        sessionStorage.setItem(key, compressed);
        console.log(`💾 Cached ${data.length} invoices (compressed)`);
        return true;
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ Storage quota exceeded, skipping cache');
        // Clear old cache and try again
        clearDashboardCache();
        try {
          const compressed = compressData(data);
          if (compressed) {
            sessionStorage.setItem(key, compressed);
            console.log(`💾 Cached ${data.length} invoices after clearing old cache`);
            return true;
          }
        } catch (retryError) {
          console.warn('⚠️ Still unable to cache data:', retryError);
        }
      }
    }
    return false;
  };
  useEffect(() => {
    if (allInvoices.length > 0) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageInvoices = allInvoices.slice(startIndex, endIndex);
      
      setCurrentPageInvoices(pageInvoices);
      setHasMorePages(endIndex < allInvoices.length);
      
      console.log(`📄 Page ${page}: Showing ${pageInvoices.length} invoices (${startIndex + 1}-${Math.min(endIndex, allInvoices.length)} of ${allInvoices.length})`);
    } else {
      setCurrentPageInvoices([]);
      setHasMorePages(false);
    }
  }, [allInvoices, page, pageSize]);


  // Filter invoices based on search term
  const filteredInvoices = currentPageInvoices.filter(inv => 
    !searchTerm || 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.salespersonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber?.toString().includes(searchTerm)
  );

  if (loading) return <Spinner pageSize={pageSize} />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200">
        <div className="text-red-500 text-4xl mb-4 text-center">⚠️</div>
        <p className="text-center text-red-600 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl sm:text-4xl">📊</span>
                <span className="truncate">OneUp Sales Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Real-time sales analytics and invoice management</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  clearDashboardCache();
                  cachedApiClient.clearCache();
                  window.location.reload();
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm"
              >
                🔄 <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
              >
                {viewMode === "table" ? "🃏" : "📋"} 
                <span className="hidden sm:inline">{viewMode === "table" ? "Card View" : "Table View"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon="💰"
            title="USD Sales"
            value={currencySalesData.currencySales?.USD?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
            subtitle="USD invoices"
            color="green"
          />
          <StatsCard
            icon="💵"
            title="PKR Sales"
            value={currencySalesData.currencySales?.PKR?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
            subtitle="PKR invoices"
            color="blue"
          />
          <StatsCard
            icon="💎"
            title="AED Sales"
            value={currencySalesData.currencySales?.AED?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
            subtitle="AED invoices"
            color="purple"
          />
          <StatsCard
            icon="📄"
            title="Total Invoices"
            value={salesSummary.totalInvoices}
            subtitle="All invoices"
            color="orange"
          />
        </div>

        {/* Debug Information */}
        {/* <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            🐛 Debug Information
          </h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <div>USD Sales: {currencySalesData.currencySales?.USD?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}</div>
            <div>PKR Sales: {currencySalesData.currencySales?.PKR?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}</div>
            <div>AED Sales: {currencySalesData.currencySales?.AED?.totalSales?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}</div>
            <div className="mt-2 text-xs text-yellow-600">
              Separate currency totals (no conversion) - Check browser console for detailed debug logs
            </div>
          </div>
        </div> */}

        {/* Time-Based Currency Sales Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              💱 Currency Sales Analysis
              <span className="text-sm font-normal text-gray-500">
                ({timePeriod === 'all' ? 'All Time' : timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})
              </span>
            </h2>
            <div className="text-sm text-gray-500">
              Total: {currencySalesData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
          </div>
          
          {/* Main Currency Sales Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* USD Sales */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <div className="text-2xl">🇺🇸</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">USD Sales</h3>
                    <p className="text-sm text-gray-500">US Dollar</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Percentage</div>
                  <div className="text-lg font-bold text-green-600">
                    {currencySalesData.currencySales.USD.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sales:</span>
                  <span className="font-bold text-green-600 text-lg">
                    ${currencySalesData.currencySales.USD.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{currencySalesData.currencySales.USD.invoiceCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-medium text-gray-900">
                    ${currencySalesData.currencySales.USD.averageSale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>
            </div>

            {/* PKR Sales */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <div className="text-2xl">🇵🇰</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">PKR Sales</h3>
                    <p className="text-sm text-gray-500">Pakistani Rupee</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Percentage</div>
                  <div className="text-lg font-bold text-blue-600">
                    {currencySalesData.currencySales.PKR.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sales:</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ₨{currencySalesData.currencySales.PKR.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{currencySalesData.currencySales.PKR.invoiceCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-medium text-gray-900">
                    ₨{currencySalesData.currencySales.PKR.averageSale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>
            </div>

            {/* AED Sales */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <div className="text-2xl">🇦🇪</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AED Sales</h3>
                    <p className="text-sm text-gray-500">UAE Dirham</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Percentage</div>
                  <div className="text-lg font-bold text-purple-600">
                    {currencySalesData.currencySales.AED.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sales:</span>
                  <span className="font-bold text-purple-600 text-lg">
                    د.إ{currencySalesData.currencySales.AED.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{currencySalesData.currencySales.AED.invoiceCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-medium text-gray-900">
                    د.إ{currencySalesData.currencySales.AED.averageSale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Row */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📊 Sales Summary ({timePeriod === 'all' ? 'All Time' : timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${currencySalesData.summary.usdTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-sm text-gray-600">USD Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ₨{currencySalesData.summary.pkrTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-sm text-gray-600">PKR Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  د.إ{currencySalesData.summary.aedTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-sm text-gray-600">AED Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {currencySalesData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-sm text-gray-600">Combined Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legacy Currency Breakdown Cards */}
        {Object.keys(salesSummary.salesByCurrency).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💱 All-Time Sales by Currency
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(salesSummary.salesByCurrency).map(([currency, amount]) => (
                <div key={currency} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        {currency} Sales
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {amount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {salesSummary.currencyBreakdown[currency]?.percentage?.toFixed(1)}% of total
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      currency === 'USD' ? 'bg-green-100 text-green-600' :
                      currency === 'PKR' ? 'bg-blue-100 text-blue-600' :
                      currency === 'AED' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <div className="text-2xl">
                        {currency === 'USD' ? '🇺🇸' : currency === 'PKR' ? '🇵🇰' : currency === 'AED' ? '🇦🇪' : '💰'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoices, customers, salespersons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
              </div>
            </div>

      {/* Filters */}
            <div className="flex gap-4 flex-wrap">
        <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setPage(1);
            }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="All">All Currencies</option>
                  <option value="USD">USD 🇺🇸</option>
                  <option value="PKR">PKR 🇵🇰</option>
                  <option value="AED">AED 🇦🇪</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
          <select
            value={timePeriod}
            onChange={(e) => {
              setTimePeriod(e.target.value);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">📊 All Time</option>
            <option value="today">📅 Today</option>
            <option value="week">📆 This Week</option>
            <option value="month">📅 This Month</option>
            <option value="quarter">📊 This Quarter</option>
            <option value="year">📅 This Year</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
              cachedApiClient.clearCache(); // Clear cache when changing sort
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="invoiceDate">📅 Invoice Date</option>
            <option value="creationDate">🕐 Creation Date</option>
          </select>
        </div>

        <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setPage(1); // Reset to first page when changing page size
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page (Recommended)</option>
                  <option value={200}>200 per page</option>
          </select>
              </div>
            </div>
        </div>
      </div>

        {/* Content */}
        {viewMode === "table" ? (
          // Table View
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                📋 Invoices Table
                <span className="text-sm font-normal text-gray-500">({filteredInvoices.length} shown)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Customer</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Salesperson</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map((inv, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(page - 1) * pageSize + (i + 1)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">
                          {inv.invoiceNumber || inv.id}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {inv.invoiceDate?.slice(0, 10) || "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                          {inv.customerName || "Unknown"}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {inv.salespersonName || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          inv.currency === 'USD' ? 'bg-green-100 text-green-800' :
                          inv.currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {inv.currency || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {parseFloat(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Cards View
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                🃏 Invoice Cards
                <span className="text-sm font-normal text-gray-500">({filteredInvoices.length} shown)</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInvoices.map((inv, i) => (
                <InvoiceCard 
                  key={i} 
                  invoice={inv} 
                  index={i} 
                  page={page} 
                  pageSize={pageSize} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredInvoices.length}</span> invoices on page <span className="font-medium">{page}</span> of <span className="font-medium">{Math.ceil(totalCount / pageSize)}</span> pages
              <span className="text-gray-500 ml-2">({totalCount} total invoices loaded)</span>
              {hasMorePages && <span> • More pages available</span>}
              <div className="text-xs text-gray-500 mt-1">
                Frontend pagination • Page size: {pageSize} invoices
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  page === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-blue-300"
                }`}
              >
                ← Previous
              </button>
                
              <div className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2">
                Page {page}
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              </div>
                
              <button
                disabled={!hasMorePages || loading}
                onClick={() => setPage(p => p + 1)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  !hasMorePages || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-blue-300"
                }`}
              >
                Next → {loading && <span className="ml-1">⏳</span>}
              </button>
            </div>
          </div>
          
          {/* Frontend pagination info */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              💡 All invoices loaded once, paginated on frontend for fast navigation
            </div>
            <button
              onClick={() => {
                clearDashboardCache();
                cachedApiClient.clearCache();
                window.location.reload();
              }}
              className="text-xs px-3 py-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;