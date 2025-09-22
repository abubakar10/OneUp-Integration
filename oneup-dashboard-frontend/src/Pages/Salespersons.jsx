import { useEffect, useState } from "react";
import cachedApiClient from "../api/cachedApiClient";
import { formatLargeNumber, formatCurrency, smartFormat, formatCurrencyBreakdown } from "../utils/formatters";

// Enhanced Spinner
const Spinner = () => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-purple-50 to-pink-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading performance data...</p>
  </div>
);

// Performance Card Component
const PerformanceCard = ({ salesperson, rank, isTopPerformer = false }) => {
  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "from-yellow-400 to-yellow-500 text-yellow-800";
    if (rank === 2) return "from-gray-300 to-gray-400 text-gray-800";
    if (rank === 3) return "from-orange-400 to-orange-500 text-orange-800";
    return "from-blue-400 to-blue-500 text-blue-800";
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2 ${
      isTopPerformer ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      {/* Rank Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getRankColor(rank)}`}>
          {getRankIcon(rank)} Rank {rank}
        </div>
        {isTopPerformer && (
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            ⭐ Top Performer
          </div>
        )}
      </div>

      {/* Salesperson Info */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{salesperson.salespersonName}</h3>
        <p className="text-sm text-gray-600">Employee ID: {salesperson.employeeId}</p>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Total Sales</p>
          <p className="text-lg font-bold text-green-800">{smartFormat(salesperson.totalSales)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Invoices</p>
          <p className="text-lg font-bold text-blue-800">{salesperson.invoiceCount}</p>
        </div>
      </div>

      {/* Average Sale */}
      <div className="mb-4">
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Average Sale</p>
          <p className="text-lg font-bold text-purple-800">
            {smartFormat(salesperson.totalSales / salesperson.invoiceCount)}
          </p>
        </div>
      </div>

      {/* Currency Breakdown */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Currency Breakdown:</p>
        <div className="space-y-2">
          {salesperson.currencies?.map((curr, idx) => (
            <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-700">{curr.currency}</span>
              <span className="text-sm font-bold text-gray-900">{smartFormat(curr.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stats Overview Component
const StatsOverview = ({ salespersons }) => {
  const totalSales = salespersons.reduce((sum, sp) => sum + (sp.totalSales || 0), 0);
  const totalInvoices = salespersons.reduce((sum, sp) => sum + (sp.invoiceCount || 0), 0);
  const avgSale = totalSales / totalInvoices || 0;
  const topPerformer = salespersons[0]?.salespersonName || "N/A";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Sales</p>
            <p className="text-2xl font-bold text-green-600">{smartFormat(totalSales)}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <span className="text-2xl">💰</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Invoices</p>
            <p className="text-2xl font-bold text-blue-600">{totalInvoices}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <span className="text-2xl">📄</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Average Sale</p>
            <p className="text-2xl font-bold text-purple-600">{smartFormat(avgSale)}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Top Performer</p>
            <p className="text-lg font-bold text-orange-600">{topPerformer}</p>
          </div>
          <div className="p-3 bg-orange-100 rounded-lg">
            <span className="text-2xl">🏆</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function Salespersons() {
  const [salespersons, setSalespersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // cards or table
  
  // Filter states
  const [period, setPeriod] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  // Fetch and process invoice data to create salesperson analytics
  useEffect(() => {
    const fetchSalespersonData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch multiple pages of invoice data
        const pages = [1]; // Get first page only to reduce API load
        const responses = await Promise.all(
          pages.map(page => cachedApiClient.get(`/invoices?page=${page}&pageSize=100`).catch(() => null))
        );

        // Combine all invoice data
        const allInvoices = responses
          .filter(res => res !== null)
          .flatMap(res => res.data.data || []);

        // Process data to create salesperson analytics
        const salespersonData = {};
        
        allInvoices.forEach(inv => {
          const salespersonName = inv.salespersonName || "Unknown";
          const employeeId = inv.invoice.employee_id || 0;
          const total = inv.invoice.total || 0;
          const currency = inv.invoice.currency || "USD";

          if (!salespersonData[employeeId]) {
            salespersonData[employeeId] = {
              employeeId,
              salespersonName,
              totalSales: 0,
              invoiceCount: 0,
              currencies: {}
            };
          }

          salespersonData[employeeId].totalSales += total;
          salespersonData[employeeId].invoiceCount += 1;
          
          if (!salespersonData[employeeId].currencies[currency]) {
            salespersonData[employeeId].currencies[currency] = { currency, total: 0 };
          }
          salespersonData[employeeId].currencies[currency].total += total;
        });

        // Convert to array and add currency breakdown
        const salespersonsArray = Object.values(salespersonData).map(sp => ({
          ...sp,
          currencies: Object.values(sp.currencies)
        }));

        // Sort by total sales (highest first)
        const sortedSalespersons = salespersonsArray.sort((a, b) => b.totalSales - a.totalSales);
        
        setSalespersons(sortedSalespersons);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching salesperson data:", error);
        setError("Failed to fetch salesperson data");
        setLoading(false);
      }
    };

    fetchSalespersonData();
  }, [period, year, month, quarter]);

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPeriodDisplayText = () => {
    switch (period) {
      case "daily": return "Today";
      case "monthly": return `${getMonthName(month)} ${year}`;
      case "quarterly": return `Q${quarter} ${year}`;
      case "yearly": return `Year ${year}`;
      default: return "All Time";
    }
  };

  const getMonthName = (monthNum) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[monthNum - 1];
  };

  if (loading) return <Spinner />;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">👥</span>
                Salesperson Performance
              </h1>
              <p className="text-gray-600 mt-1">Track and analyze sales team performance</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
              >
                {viewMode === "cards" ? "📋" : "🃏"} 
                {viewMode === "cards" ? "Table View" : "Card View"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="daily">Today</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {(period === "monthly" || period === "quarterly" || period === "yearly") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {[...Array(5)].map((_, i) => {
                      const yearOption = new Date().getFullYear() - i;
                      return (
                        <option key={yearOption} value={yearOption}>
                          {yearOption}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {period === "monthly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {period === "quarterly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={1}>Q1 (Jan-Mar)</option>
                    <option value={2}>Q2 (Apr-Jun)</option>
                    <option value={3}>Q3 (Jul-Sep)</option>
                    <option value={4}>Q4 (Oct-Dec)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Performance for {getPeriodDisplayText()}
              </h3>
              <p className="text-gray-600">
                {salespersons.length} salesperson{salespersons.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {salespersons.length > 0 && <StatsOverview salespersons={salespersons} />}

        {/* Content */}
        {viewMode === "cards" ? (
          // Cards View
          <div>
            {salespersons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                {salespersons.map((sp, index) => (
                  <PerformanceCard
                    key={`${sp.employeeId}-${index}`}
                    salesperson={sp}
                    rank={index + 1}
                    isTopPerformer={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No sales data found for the selected period.</p>
              </div>
            )}
          </div>
        ) : (
          // Table View
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                📋 Performance Rankings
                <span className="text-sm font-normal text-gray-500">({salespersons.length} salespersons)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesperson</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average Sale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currencies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salespersons.map((sp, index) => (
                    <tr key={`${sp.employeeId}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold">
                          {index === 0 && "🥇"} 
                          {index === 1 && "🥈"} 
                          {index === 2 && "🥉"} 
                          {index > 2 && `#${index + 1}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{sp.salespersonName}</div>
                        <div className="text-sm text-gray-500">ID: {sp.employeeId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-lg font-bold text-green-600">
                          {sp.totalSales?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {sp.invoiceCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                        {(sp.totalSales / sp.invoiceCount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {sp.currencies?.map((curr, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="font-medium">{curr.currency}:</span>
                              <span className="text-gray-900">{smartFormat(curr.total)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {salespersons.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>No sales data found for the selected period.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Salespersons;