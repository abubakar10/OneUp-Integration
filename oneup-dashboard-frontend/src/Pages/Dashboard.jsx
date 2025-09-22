import { useEffect, useState } from "react";
import cachedApiClient from "../api/cachedApiClient";

// Enhanced Spinner with cache status
const Spinner = ({ isFromCache = false, pageSize = 100 }) => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">
      {isFromCache ? "📦 Loading from cache..." : `🌐 Fetching ${pageSize} invoices...`}
    </p>
    <div className="mt-2 text-sm text-gray-500">
      {isFromCache ? "Lightning fast!" : "Please wait, this may take a moment"}
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
        <h3 className="font-semibold text-gray-900 text-lg">#{invoice.invoice.invoiceNumber || invoice.invoice.id}</h3>
        <p className="text-sm text-gray-500">Invoice #{(page - 1) * pageSize + (index + 1)}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        invoice.invoice.currency === 'USD' ? 'bg-green-100 text-green-800' :
        invoice.invoice.currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
        'bg-purple-100 text-purple-800'
      }`}>
        {invoice.invoice.currency}
      </span>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-600">Customer:</span>
        <span className="font-medium text-gray-900 text-right">{invoice.invoice.customerName}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Salesperson:</span>
        <span className="font-medium text-blue-600">{invoice.salespersonName || "Unknown"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Date:</span>
        <span className="font-medium text-gray-900">{invoice.invoice.invoice_date?.slice(0, 10) || "—"}</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-gray-600 font-medium">Total:</span>
                        <span className="text-xl font-bold text-green-600">{parseFloat(invoice.invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      </div>
    </div>
  </div>
);

function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [currency, setCurrency] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // table or cards
  const [sortBy, setSortBy] = useState("invoiceDate"); // invoiceDate or creationDate

  // ✅ Pagination state for OneUp API (100 records max per page)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // 100 invoices per page as requested
  const [hasMorePages, setHasMorePages] = useState(false);

  // ✅ Caching state for faster loading
  const [cache, setCache] = useState(new Map());
  const [isFromCache, setIsFromCache] = useState(false);

  // ✅ Dashboard statistics
  const [stats, setStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    avgSale: 0,
    topSalesperson: ""
  });

  // Calculate stats from current page data
  useEffect(() => {
    if (invoices.length > 0) {
      const totalSales = invoices.reduce((sum, inv) => {
        const total = parseFloat(inv.invoice?.total || 0);
        return sum + (isNaN(total) ? 0 : total);
      }, 0);
      
      const avgSale = totalSales / invoices.length;
      
      // Find top salesperson on current page
      const salespersonSales = {};
      invoices.forEach(inv => {
        const name = inv.salespersonName || "Unknown";
        const total = parseFloat(inv.invoice?.total || 0);
        salespersonSales[name] = (salespersonSales[name] || 0) + (isNaN(total) ? 0 : total);
      });
      
      const topSalesperson = Object.entries(salespersonSales)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "Unknown";

      setStats({
        totalSales: isNaN(totalSales) ? 0 : totalSales,
        totalInvoices: invoices.length,
        avgSale: isNaN(avgSale) ? 0 : avgSale,
        topSalesperson
      });
    } else {
      setStats({
        totalSales: 0,
        totalInvoices: 0,
        avgSale: 0,
        topSalesperson: "Unknown"
      });
    }
  }, [invoices]);

  // ✅ Direct API fetching without caching issues
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const q = currency === "All" ? "" : `&currency=${currency}`;
      const sortParam = `&sortBy=${sortBy}`;

      try {
        console.log(`🔄 Fetching invoices: page=${page}, pageSize=${pageSize}, currency=${currency}, sortBy=${sortBy}`);
        
        // Direct API call without caching to avoid issues
        const response = await cachedApiClient.get(`/invoices?page=${page}&pageSize=${pageSize}${q}${sortParam}`, { useCache: false });
        const meta = response.data;

        console.log('📊 API Response:', meta);

        // Handle API error responses
        if (meta.error) {
          console.error('❌ API Error:', meta.error);
          setError(meta.error);
          setInvoices([]);
          setHasMorePages(false);
          setLoading(false);
          return;
        }

        // Set invoices data
        const invoicesData = meta.data || [];
        console.log(`✅ Setting ${invoicesData.length} invoices`);
        setInvoices(invoicesData);
        setHasMorePages(meta.hasMorePages || false);
        
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching invoices:", err);
        setError(`Failed to fetch invoices: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currency, page, pageSize, sortBy]);

  // Update cache stats for display
  useEffect(() => {
    const stats = cachedApiClient.getCacheStats();
    setCache(new Map(stats.keys.map((key) => [key, { timestamp: Date.now() }])));
  }, [invoices]);

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(inv => 
    !searchTerm || 
    inv.invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.salespersonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice.invoiceNumber?.toString().includes(searchTerm)
  );

  if (loading) return <Spinner isFromCache={isFromCache} pageSize={pageSize} />;
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
                  cachedApiClient.clearCache();
                  setCache(new Map());
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
            title="Total Sales"
            value={stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            subtitle="Current page"
            color="green"
          />
          <StatsCard
            icon="📄"
            title="Invoices"
            value={stats.totalInvoices}
            subtitle={hasMorePages ? "More available" : "All shown"}
            color="blue"
          />
          <StatsCard
            icon="📈"
            title="Average Sale"
            value={stats.avgSale.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            subtitle="Per invoice"
            color="purple"
          />
          <StatsCard
            icon="🏆"
            title="Top Salesperson"
            value={stats.topSalesperson}
            subtitle="Current page"
            color="orange"
          />
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
              cachedApiClient.clearCache(); // Clear cache when changing sort
              setCache(new Map());
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
              setPage(1);
                    cachedApiClient.clearCache(); // Clear cache when changing page size
                    setCache(new Map());
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page (Recommended)</option>
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
                          {inv.invoice?.invoice_number || inv.invoice?.invoiceNumber || inv.invoice?.id}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {inv.invoice?.invoice_date?.slice(0, 10) || inv.invoice?.invoiceDate?.slice(0, 10) || "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                          {inv.invoice?.customer_name || inv.invoice?.customerName || "Unknown"}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {inv.salespersonName || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          inv.invoice?.currency === 'USD' ? 'bg-green-100 text-green-800' :
                          inv.invoice?.currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {inv.invoice?.currency || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {parseFloat(inv.invoice?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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
              Showing <span className="font-medium">{filteredInvoices.length}</span> invoices on page <span className="font-medium">{page}</span>
              {hasMorePages && <span> • More pages available</span>}
              {isFromCache && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  📦 Cached
                </span>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Cache size: {cache.size} pages • Page size: {pageSize} invoices
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
          
          {/* Cache management */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              💡 Previously visited pages load instantly from cache
            </div>
            <button
              onClick={() => {
                cachedApiClient.clearCache();
                setCache(new Map());
              }}
              className="text-xs px-3 py-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              🗑️ Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;