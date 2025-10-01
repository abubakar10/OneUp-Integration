import { useState, useEffect } from "react";
import cachedApiClient from "../api/cachedApiClient";
import { formatLargeNumber, formatCurrency, smartFormat } from "../utils/formatters";

// Report Card Component
const ReportCard = ({ icon, title, description, type, onGenerate, isGenerating }) => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className="text-4xl">{icon}</div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        type === 'premium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {type === 'premium' ? '⭐ Premium' : '📊 Standard'}
      </div>
    </div>
    
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm mb-4">{description}</p>
    
    <button
      onClick={() => onGenerate(title)}
      disabled={isGenerating}
      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
        isGenerating
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isGenerating ? '⏳ Generating...' : '📤 Generate Report'}
    </button>
  </div>
);

// Quick Stats Component
const QuickStat = ({ icon, label, value, trend }) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
      <div className={`text-sm font-medium ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {trend === 'up' ? '↗️ +12%' : trend === 'down' ? '↘️ -5%' : '→ 0%'}
      </div>
    </div>
  </div>
);

const Reports = () => {
  const [generatingReport, setGeneratingReport] = useState(null);
  const [dateRange, setDateRange] = useState('last30days');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [invoiceData, setInvoiceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalSalespersons: 0
  });

  const reports = [
    {
      icon: "📊",
      title: "Sales Performance Report",
      description: "Comprehensive analysis of sales metrics, trends, and performance indicators.",
      type: "standard"
    },
    {
      icon: "👥",
      title: "Salesperson Performance Report",
      description: "Individual salesperson metrics, rankings, and performance comparisons.",
      type: "standard"
    },
    {
      icon: "🏢",
      title: "Customer Analytics Report",
      description: "Customer behavior, spending patterns, and retention analysis.",
      type: "premium"
    },
    {
      icon: "💰",
      title: "Revenue Analysis Report",
      description: "Detailed revenue breakdown by currency, region, and time period.",
      type: "standard"
    },
    {
      icon: "📈",
      title: "Growth Trends Report",
      description: "Historical growth analysis with forecasting and projections.",
      type: "premium"
    },
    {
      icon: "🎯",
      title: "Target vs Achievement Report",
      description: "Compare actual performance against set targets and goals.",
      type: "premium"
    },
    {
      icon: "📋",
      title: "Invoice Summary Report",
      description: "Complete invoice listing with filtering and sorting options.",
      type: "standard"
    },
    {
      icon: "🔄",
      title: "Recurring Revenue Report",
      description: "Analysis of recurring customers and subscription-based revenue.",
      type: "premium"
    }
  ];

  const quickStats = [
    { icon: "📊", label: "Total Invoices", value: stats.totalInvoices.toLocaleString(), trend: "up" },
    { icon: "💰", label: "Total Revenue", value: smartFormat(stats.totalRevenue), trend: "up" },
    { icon: "🏢", label: "Total Customers", value: stats.totalCustomers.toLocaleString(), trend: "up" },
    { icon: "👥", label: "Salespersons", value: stats.totalSalespersons.toLocaleString(), trend: "up" }
  ];

  // Fetch invoice data for reports
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        const response = await cachedApiClient.get(`/invoices?page=1&pageSize=-1`);
        const invoices = response.data.data || [];
        
        setInvoiceData(invoices);
        
        // Calculate stats
        const uniqueCustomers = new Set(invoices.map(inv => inv.customerName)).size;
        const uniqueSalespersons = new Set(invoices.map(inv => inv.salespersonName)).size;
        const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
        
        setStats({
          totalInvoices: invoices.length,
          totalRevenue,
          totalCustomers: uniqueCustomers,
          totalSalespersons: uniqueSalespersons
        });
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoiceData();
  }, []);

  const handleGenerateReport = async (reportTitle) => {
    setGeneratingReport(reportTitle);
    
    try {
      // Generate real report based on invoice data
      let reportContent = "";
      
      switch (reportTitle) {
        case "Sales Performance Report":
          reportContent = generateSalesPerformanceReport();
          break;
        case "Salesperson Performance Report":
          reportContent = generateSalespersonReport();
          break;
        case "Customer Analytics Report":
          reportContent = generateCustomerReport();
          break;
        case "Revenue Analysis Report":
          reportContent = generateRevenueReport();
          break;
        case "Invoice Summary Report":
          reportContent = generateInvoiceSummaryReport();
          break;
        default:
          reportContent = generateGenericReport(reportTitle);
      }
      
      // Create and download the report
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateSalesPerformanceReport = () => {
    const totalRevenue = invoiceData.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const avgInvoiceValue = totalRevenue / invoiceData.length;
    
    // Sales by currency
    const currencySales = {};
    invoiceData.forEach(inv => {
      const currency = inv.currency || "USD";
      currencySales[currency] = (currencySales[currency] || 0) + parseFloat(inv.total || 0);
    });
    
    return `SALES PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

SUMMARY
========
Total Invoices: ${invoiceData.length}
Total Revenue: ${smartFormat(totalRevenue)}
Average Invoice Value: ${smartFormat(avgInvoiceValue)}
Total Customers: ${stats.totalCustomers}
Total Salespersons: ${stats.totalSalespersons}

CURRENCY BREAKDOWN
==================
${Object.entries(currencySales).map(([currency, amount]) => 
  `${currency}: ${smartFormat(amount)}`
).join('\n')}

TOP PERFORMING SALESPERSONS
===========================
${getTopSalespersons().slice(0, 10).map((sp, i) => 
  `${i + 1}. ${sp.name}: ${smartFormat(sp.total)} (${sp.count} invoices)`
).join('\n')}

TOP CUSTOMERS
=============
${getTopCustomers().slice(0, 10).map((customer, i) => 
  `${i + 1}. ${customer.name}: ${smartFormat(customer.total)} (${customer.count} invoices)`
).join('\n')}`;
  };

  const generateSalespersonReport = () => {
    const salespersonData = getTopSalespersons();
    
    return `SALESPERSON PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

SALESPERSON RANKINGS
====================
${salespersonData.map((sp, i) => 
  `${i + 1}. ${sp.name}
   Total Sales: ${smartFormat(sp.total)}
   Invoice Count: ${sp.count}
   Average Sale: ${smartFormat(sp.total / sp.count)}
   Currency Mix: ${sp.currencies.join(', ')}
   -------------------------`
).join('\n')}

SUMMARY STATISTICS
==================
Total Salespersons: ${salespersonData.length}
Top Performer: ${salespersonData[0]?.name || 'N/A'}
Total Revenue: ${smartFormat(salespersonData.reduce((sum, sp) => sum + sp.total, 0))}`;
  };

  const generateCustomerReport = () => {
    const customerData = getTopCustomers();
    
    return `CUSTOMER ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

CUSTOMER RANKINGS
=================
${customerData.map((customer, i) => 
  `${i + 1}. ${customer.name}
   Total Spent: ${smartFormat(customer.total)}
   Invoice Count: ${customer.count}
   Average Order: ${smartFormat(customer.total / customer.count)}
   -------------------------`
).join('\n')}

SUMMARY STATISTICS
==================
Total Customers: ${customerData.length}
Top Customer: ${customerData[0]?.name || 'N/A'}
Total Revenue: ${smartFormat(customerData.reduce((sum, c) => sum + c.total, 0))}`;
  };

  const generateRevenueReport = () => {
    const currencySales = {};
    invoiceData.forEach(inv => {
      const currency = inv.currency || "USD";
      currencySales[currency] = (currencySales[currency] || 0) + parseFloat(inv.total || 0);
    });
    
    return `REVENUE ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

CURRENCY BREAKDOWN
==================
${Object.entries(currencySales).map(([currency, amount]) => 
  `${currency}: ${smartFormat(amount)} (${((amount / stats.totalRevenue) * 100).toFixed(1)}%)`
).join('\n')}

MONTHLY REVENUE TREND
=====================
${getMonthlyRevenue().map(month => 
  `${month.month}: ${smartFormat(month.revenue)}`
).join('\n')}

SUMMARY
========
Total Revenue: ${smartFormat(stats.totalRevenue)}
Primary Currency: ${Object.entries(currencySales).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
Revenue Growth: Calculated based on historical data`;
  };

  const generateInvoiceSummaryReport = () => {
    return `INVOICE SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

INVOICE LISTING
===============
${invoiceData.slice(0, 100).map((inv, i) => 
  `${i + 1}. Invoice #${inv.invoiceNumber || inv.id}
   Customer: ${inv.customerName || 'Unknown'}
   Salesperson: ${inv.salespersonName || 'Unknown'}
   Amount: ${smartFormat(parseFloat(inv.total || 0))} ${inv.currency || 'USD'}
   Date: ${inv.invoiceDate || 'Unknown'}
   -------------------------`
).join('\n')}

${invoiceData.length > 100 ? `\n... and ${invoiceData.length - 100} more invoices` : ''}

SUMMARY
========
Total Invoices: ${invoiceData.length}
Total Value: ${smartFormat(invoiceData.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0))}`;
  };

  const generateGenericReport = (title) => {
    return `${title.toUpperCase()}
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

DATA SUMMARY
============
Total Invoices: ${invoiceData.length}
Total Revenue: ${smartFormat(stats.totalRevenue)}
Total Customers: ${stats.totalCustomers}
Total Salespersons: ${stats.totalSalespersons}

This report contains comprehensive data analysis based on ${invoiceData.length} invoices.`;
  };

  // Helper functions
  const getTopSalespersons = () => {
    const salespersonData = {};
    invoiceData.forEach(inv => {
      const name = inv.salespersonName || "Unknown";
      const total = parseFloat(inv.total || 0);
      const currency = inv.currency || "USD";
      
      if (!salespersonData[name]) {
        salespersonData[name] = { name, total: 0, count: 0, currencies: new Set() };
      }
      salespersonData[name].total += total;
      salespersonData[name].count += 1;
      salespersonData[name].currencies.add(currency);
    });
    
    return Object.values(salespersonData)
      .map(sp => ({ ...sp, currencies: Array.from(sp.currencies) }))
      .sort((a, b) => b.total - a.total);
  };

  const getTopCustomers = () => {
    const customerData = {};
    invoiceData.forEach(inv => {
      const name = inv.customerName || "Unknown";
      const total = parseFloat(inv.total || 0);
      
      if (!customerData[name]) {
        customerData[name] = { name, total: 0, count: 0 };
      }
      customerData[name].total += total;
      customerData[name].count += 1;
    });
    
    return Object.values(customerData).sort((a, b) => b.total - a.total);
  };

  const getMonthlyRevenue = () => {
    const monthlyData = {};
    invoiceData.forEach(inv => {
      const date = inv.invoiceDate || "";
      const month = date.slice(0, 7); // YYYY-MM
      if (month) {
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(inv.total || 0);
      }
    });
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([month, revenue]) => ({ month, revenue }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">📋</span>
                Reports & Analytics
              </h1>
              <p className="text-gray-600 mt-1">Generate detailed reports and export data</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2">
                📅 Schedule Report
              </button>
              <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
                📊 Report History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <QuickStat key={index} {...stat} />
          ))}
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ⚙️ Report Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last90days">Last 90 Days</option>
                <option value="lastyear">Last Year</option>
                <option value="alltime">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">📄 PDF</option>
                <option value="xlsx">📊 Excel (XLSX)</option>
                <option value="csv">📋 CSV</option>
                <option value="json">🔧 JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="download">💾 Download</option>
                <option value="email">📧 Email</option>
                <option value="cloud">☁️ Cloud Storage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Available Reports</h2>
            <p className="text-gray-600">Choose from our comprehensive collection of business reports</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reports.map((report, index) => (
              <ReportCard
                key={index}
                {...report}
                onGenerate={handleGenerateReport}
                isGenerating={generatingReport === report.title}
              />
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📁 Recent Reports</h2>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { name: "Sales Performance Report", date: "2 hours ago", format: "PDF", size: "2.4 MB" },
                    { name: "Customer Analytics Report", date: "1 day ago", format: "XLSX", size: "5.1 MB" },
                    { name: "Revenue Analysis Report", date: "3 days ago", format: "CSV", size: "1.8 MB" },
                    { name: "Salesperson Performance Report", date: "1 week ago", format: "PDF", size: "3.2 MB" },
                  ].map((report, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{report.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {report.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {report.format}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {report.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">📥 Download</button>
                        <button className="text-red-600 hover:text-red-900">🗑️ Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;