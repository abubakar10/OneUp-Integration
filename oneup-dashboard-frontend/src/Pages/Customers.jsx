import { useState, useEffect } from "react";
import cachedApiClient from "../api/cachedApiClient";
import { formatLargeNumber, formatCurrency, smartFormat } from "../utils/formatters";

// Loading Spinner
const Spinner = () => (
  <div className="flex flex-col justify-center items-center h-screen w-full bg-gradient-to-br from-green-50 to-teal-100">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin absolute top-2 left-2 animate-pulse"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading customer data...</p>
  </div>
);

// Customer Card Component
const CustomerCard = ({ customer, rank }) => {
  const getRankBadge = (rank) => {
    if (rank <= 3) {
      const badges = ["🥇", "🥈", "🥉"];
      return badges[rank - 1];
    }
    return `#${rank}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{getRankBadge(rank)}</div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Rank</div>
          <div className="text-lg font-bold text-gray-900">#{rank}</div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={customer.name}>
          {customer.name}
        </h3>
        <p className="text-sm text-gray-600">Customer ID: {customer.id}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Total Spent</p>
          <p className="text-lg font-bold text-green-800">{smartFormat(customer.totalSpent)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Orders</p>
          <p className="text-lg font-bold text-blue-800">{customer.orderCount}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Average Order</p>
          <p className="text-lg font-bold text-purple-800">
            {smartFormat(customer.totalSpent / customer.orderCount)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Payment Currencies:</p>
        <div className="flex flex-wrap gap-1">
          {customer.currencies.map((currency, idx) => (
            <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${
              currency === 'USD' ? 'bg-green-100 text-green-800' :
              currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {currency}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon, title, value, subtitle, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600"
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <div className="text-2xl">{icon}</div>
        </div>
      </div>
    </div>
  );
};

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("totalSpent"); // totalSpent, orderCount, averageOrder
  const [viewMode, setViewMode] = useState("cards"); // cards or table

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL invoices for complete customer analytics
      console.log("🏢 Fetching ALL customer data from invoices...");
      
      const response = await cachedApiClient.get(`/invoices?page=1&pageSize=-1`);
      const allInvoices = response.data.data || [];
      
      // Process data to create customer analytics
      const customerData = {};
      
      allInvoices.forEach(inv => {
        const customerId = inv.id;
        const customerName = inv.customerName || "Unknown Customer";
        const total = inv.total || 0;
        const currency = inv.currency || "USD";

        if (!customerData[customerId]) {
          customerData[customerId] = {
            id: customerId,
            name: customerName,
            totalSpent: 0,
            orderCount: 0,
            currencies: new Set()
          };
        }

        customerData[customerId].totalSpent += total;
        customerData[customerId].orderCount += 1;
        customerData[customerId].currencies.add(currency);
      });

      // Convert to array and process
      const customersArray = Object.values(customerData).map(customer => ({
        ...customer,
        currencies: Array.from(customer.currencies),
        averageOrder: customer.totalSpent / customer.orderCount
      }));

      // Sort by default criteria
      const sortedCustomers = customersArray.sort((a, b) => b.totalSpent - a.totalSpent);
      
      setCustomers(sortedCustomers);
      console.log(`✅ Processed ${sortedCustomers.length} customers from ${allInvoices.length} invoices`);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setError("Failed to fetch customer data. Please try refreshing the page.");
      // Set empty data to prevent crashes
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort customers
  const filteredAndSortedCustomers = customers
    .filter(customer => 
      !searchTerm || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "orderCount":
          return b.orderCount - a.orderCount;
        case "averageOrder":
          return b.averageOrder - a.averageOrder;
        default: // totalSpent
          return b.totalSpent - a.totalSpent;
      }
    });

  // Calculate stats
  const stats = {
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
    totalOrders: customers.reduce((sum, c) => sum + c.orderCount, 0),
    averageOrderValue: customers.length > 0 ? 
      customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.reduce((sum, c) => sum + c.orderCount, 0) : 0
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">🏢</span>
                Customer Analytics
              </h1>
              <p className="text-gray-600 mt-1">Track customer behavior and spending patterns</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                {viewMode === "cards" ? "📋" : "🃏"} 
                {viewMode === "cards" ? "Table View" : "Card View"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatsCard
            icon="👥"
            title="Total Customers"
            value={stats.totalCustomers.toLocaleString()}
            subtitle="Unique customers"
            color="blue"
          />
          <StatsCard
            icon="💰"
            title="Total Revenue"
            value={smartFormat(stats.totalRevenue)}
            subtitle="All customers"
            color="green"
          />
          <StatsCard
            icon="📦"
            title="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            subtitle="All time"
            color="purple"
          />
          <StatsCard
            icon="📊"
            title="Avg Order Value"
            value={smartFormat(stats.averageOrderValue)}
            subtitle="Per order"
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
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="totalSpent">Total Spent</option>
                  <option value="orderCount">Order Count</option>
                  <option value="averageOrder">Average Order</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "cards" ? (
          // Cards View
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                🃏 Customer Cards
                <span className="text-sm font-normal text-gray-500">({filteredAndSortedCustomers.length} customers)</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {filteredAndSortedCustomers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        ) : (
          // Table View
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                📋 Customer Rankings
                <span className="text-sm font-normal text-gray-500">({filteredAndSortedCustomers.length} customers)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currencies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedCustomers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold">
                          {index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 max-w-xs truncate" title={customer.name}>
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {customer.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-lg font-bold text-green-600">
                          {smartFormat(customer.totalSpent)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {customer.orderCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                        {smartFormat(customer.averageOrder)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.currencies.map((currency, idx) => (
                            <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${
                              currency === 'USD' ? 'bg-green-100 text-green-800' :
                              currency === 'PKR' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {currency}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredAndSortedCustomers.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-600">No customers match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Customers;
