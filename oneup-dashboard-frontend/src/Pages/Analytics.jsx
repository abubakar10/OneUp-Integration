import { useState, useEffect } from "react";
import cachedApiClient from "../api/cachedApiClient";
import { formatLargeNumber, formatCurrency, smartFormat } from "../utils/formatters";

// Chart Component (Simple Bar Chart)
const BarChart = ({ data, title, color = "blue" }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500"
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm font-medium text-gray-600 truncate">
              {item.label}
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-gray-200 rounded-full h-4 relative overflow-hidden">
                <div
                  className={`${colorClasses[color]} h-full rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-sm font-bold text-gray-900 text-right">
              {smartFormat(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Metric Card
const MetricCard = ({ icon, title, value, change, trend }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="text-3xl">{icon}</div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
        trend === 'up' ? 'bg-green-100 text-green-800' : 
        trend === 'down' ? 'bg-red-100 text-red-800' : 
        'bg-gray-100 text-gray-800'
      }`}>
        {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→'} {change}
      </div>
    </div>
    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

// Enhanced Spinner - Progressive loading strategy
const Spinner = () => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">
      ⚡ Loading first batch (1000 invoices)...
    </p>
    <div className="mt-2 text-sm text-gray-500">
      Complete analytics will load in background
    </div>
    <div className="mt-4 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
      🚀 Progressive loading for maximum speed
    </div>
  </div>
);

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    salesByPerson: [],
    salesByCurrency: [],
    salesByMonth: [],
    topCustomers: [],
    metrics: {
      currencyRevenue: {},
      totalInvoices: 0,
      averageInvoiceValue: 0,
      topSalesperson: ""
    }
  });
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // ✅ Progressive loading: First batch for immediate display
      console.log("📊 Loading first batch (1000 invoices) for immediate analytics...");
      
      const firstBatchResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=1000`);
      const firstBatch = firstBatchResponse.data.data || [];
      
      // Process first batch data for initial analytics
      const salesByPerson = {};
      const salesByCurrency = {};
      const customerSales = {};
      const monthlySales = {};
      const currencyRevenue = {};

      firstBatch.forEach(inv => {
        const salesperson = inv.salespersonName || "Unknown";
        const currency = inv.currency || "USD";
        const customer = inv.customerName || "Unknown";
        const total = parseFloat(inv.total || 0);
        const date = inv.invoiceDate || "";
        const month = date.slice(0, 7); // YYYY-MM format

        // Sales by person
        salesByPerson[salesperson] = (salesByPerson[salesperson] || 0) + total;
        
        // Sales by currency
        salesByCurrency[currency] = (salesByCurrency[currency] || 0) + total;
        
        // Currency revenue (separate totals)
        currencyRevenue[currency] = (currencyRevenue[currency] || 0) + total;
        
        // Top customers
        customerSales[customer] = (customerSales[customer] || 0) + total;
        
        // Monthly sales
        if (month) {
          monthlySales[month] = (monthlySales[month] || 0) + total;
        }
      });

      // Convert to chart data format
      const salesByPersonData = Object.entries(salesByPerson)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([label, value]) => ({ label, value }));

      const salesByCurrencyData = Object.entries(salesByCurrency)
        .sort(([,a], [,b]) => b - a)
        .map(([label, value]) => ({ label, value }));

      const topCustomersData = Object.entries(customerSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([label, value]) => ({ label: label.slice(0, 20) + (label.length > 20 ? '...' : ''), value }));

      const salesByMonthData = Object.entries(monthlySales)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12)
        .map(([label, value]) => ({ label, value }));

      console.log(`📊 First batch: ${firstBatch.length} invoices processed for analytics`);
      
      setData({
        salesByPerson: salesByPersonData,
        salesByCurrency: salesByCurrencyData,
        salesByMonth: salesByMonthData,
        topCustomers: topCustomersData,
        metrics: {
          currencyRevenue,
          totalInvoices: firstBatch.length,
          averageInvoiceValue: currencyRevenue["USD"] / firstBatch.filter(inv => inv.currency === "USD").length || 0,
          topSalesperson: salesByPersonData[0]?.label || "Unknown"
        }
      });
      
      setLoading(false);
      
      // ✅ Load complete dataset in background for accurate analytics
      setTimeout(async () => {
        try {
          console.log("📊 Loading complete dataset in background...");
          const fullResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=-1`);
          const allInvoices = fullResponse.data.data || [];
          
          // Process complete data for accurate analytics
          const completeSalesByPerson = {};
          const completeSalesByCurrency = {};
          const completeCustomerSales = {};
          const completeMonthlySales = {};
          const completeCurrencyRevenue = {};

          allInvoices.forEach(inv => {
            const salesperson = inv.salespersonName || "Unknown";
            const currency = inv.currency || "USD";
            const customer = inv.customerName || "Unknown";
            const total = parseFloat(inv.total || 0);
            const date = inv.invoiceDate || "";
            const month = date.slice(0, 7); // YYYY-MM format

            // Sales by person
            completeSalesByPerson[salesperson] = (completeSalesByPerson[salesperson] || 0) + total;
            
            // Sales by currency
            completeSalesByCurrency[currency] = (completeSalesByCurrency[currency] || 0) + total;
            
            // Currency revenue (separate totals)
            completeCurrencyRevenue[currency] = (completeCurrencyRevenue[currency] || 0) + total;
            
            // Top customers
            completeCustomerSales[customer] = (completeCustomerSales[customer] || 0) + total;
            
            // Monthly sales
            if (month) {
              completeMonthlySales[month] = (completeMonthlySales[month] || 0) + total;
            }
          });

          // Convert to chart data format
          const completeSalesByPersonData = Object.entries(completeSalesByPerson)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([label, value]) => ({ label, value }));

          const completeSalesByCurrencyData = Object.entries(completeSalesByCurrency)
            .sort(([,a], [,b]) => b - a)
            .map(([label, value]) => ({ label, value }));

          const completeTopCustomersData = Object.entries(completeCustomerSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([label, value]) => ({ label: label.slice(0, 20) + (label.length > 20 ? '...' : ''), value }));

          const completeSalesByMonthData = Object.entries(completeMonthlySales)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 12)
            .map(([label, value]) => ({ label, value }));

          console.log(`✅ Complete dataset: ${allInvoices.length} invoices processed for analytics`);
          
          setData({
            salesByPerson: completeSalesByPersonData,
            salesByCurrency: completeSalesByCurrencyData,
            salesByMonth: completeSalesByMonthData,
            topCustomers: completeTopCustomersData,
            metrics: {
              currencyRevenue: completeCurrencyRevenue,
              totalInvoices: allInvoices.length,
              averageInvoiceValue: completeCurrencyRevenue["USD"] / allInvoices.filter(inv => inv.currency === "USD").length || 0,
              topSalesperson: completeSalesByPersonData[0]?.label || "Unknown"
            }
          });
        } catch (err) {
          console.error("❌ Error loading complete analytics dataset:", err);
        }
      }, 500); // Small delay to let UI render first batch
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // Fallback: create mock data if API fails
      setData({
        salesByPerson: [
          { label: "Loading...", value: 0 }
        ],
        salesByCurrency: [
          { label: "USD", value: 0 }
        ],
        salesByMonth: [
          { label: "Current", value: 0 }
        ],
        topCustomers: [
          { label: "Loading...", value: 0 }
        ],
        metrics: {
          totalRevenue: 0,
          totalInvoices: 0,
          averageInvoiceValue: 0,
          topSalesperson: "Loading..."
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">📈</span>
                Sales Analytics
              </h1>
              <p className="text-gray-600 mt-1">Insights and performance metrics</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="year">This Year</option>
                <option value="month">This Month</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon="💰"
                title="USD Revenue"
                value={smartFormat(data.metrics.currencyRevenue?.USD || 0)}
                change="USD Sales"
                trend="up"
              />
              <MetricCard
                icon="💵"
                title="PKR Revenue"
                value={smartFormat(data.metrics.currencyRevenue?.PKR || 0)}
                change="PKR Sales"
                trend="up"
              />
              <MetricCard
                icon="💎"
                title="AED Revenue"
                value={smartFormat(data.metrics.currencyRevenue?.AED || 0)}
                change="AED Sales"
                trend="up"
              />
              <MetricCard
                icon="📄"
                title="Total Invoices"
                value={data.metrics.totalInvoices.toLocaleString()}
                change="All currencies"
                trend="up"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <BarChart
                data={data.salesByPerson}
                title="🏆 Top Salespersons"
                color="blue"
              />
              <BarChart
                data={data.salesByCurrency}
                title="💱 Sales by Currency"
                color="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BarChart
                data={data.topCustomers}
                title="🏢 Top Customers"
                color="purple"
              />
              <BarChart
                data={data.salesByMonth}
                title="📅 Monthly Sales Trend"
                color="orange"
              />
            </div>

            {/* Insights Panel */}
            <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                💡 Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">🎯 Performance Leader</h4>
                  <p className="text-sm text-blue-700">
                    <strong>{data.metrics.topSalesperson}</strong> is your top performer, 
                    driving significant revenue growth.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">💰 Revenue Growth</h4>
                  <p className="text-sm text-green-700">
                    Average invoice value of <strong>{smartFormat(data.metrics.averageInvoiceValue)}</strong> shows 
                    healthy transaction sizes.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">🌍 Market Diversity</h4>
                  <p className="text-sm text-purple-700">
                    Multi-currency sales indicate strong international presence 
                    across different markets.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
