import { useEffect, useState, useCallback } from "react";
import cachedApiClient from "../api/cachedApiClient";
import * as XLSX from 'xlsx';

// Utility function to get current USD to PKR exchange rate
const getUSDToPKRRate = async () => {
  try {
    // Using a free exchange rate API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    return data.rates.PKR || 280; // Fallback to 280 if API fails
  } catch (error) {
    console.warn('Failed to fetch exchange rate, using fallback rate:', error);
    return 280; // Fallback rate
  }
};

// Utility function to filter invoices by time period (same as Salespersons page)
const filterInvoicesByPeriod = (invoices, period, year, month, quarter, dateType) => {
  const now = new Date();
  
  return invoices.filter(inv => {
    // Use the selected date type (creationDate or invoiceDate)
    const dateToUse = dateType === "creationDate" ? inv.createdAt : inv.invoiceDate;
    const invoiceDate = new Date(dateToUse);
    
    switch (period) {
      case "daily":
        return invoiceDate.toDateString() === now.toDateString();
      case "monthly":
        return invoiceDate.getFullYear() === year && invoiceDate.getMonth() + 1 === month;
      case "quarterly": {
        const invoiceQuarter = Math.ceil((invoiceDate.getMonth() + 1) / 3);
        return invoiceDate.getFullYear() === year && invoiceQuarter === quarter;
      }
      case "yearly":
        return invoiceDate.getFullYear() === year;
      default: // "all"
        return true;
    }
  });
};

// Utility function to calculate total revenue in PKR
const calculateTotalRevenueInPKR = async (invoices) => {
  try {
    // Get current exchange rate
    const usdToPkrRate = await getUSDToPKRRate();
    console.log('💱 Current USD to PKR rate:', usdToPkrRate);
    
    // Filter out cancelled invoices
    const validInvoices = invoices.filter(invoice => 
      invoice.status !== 'Cancelled' && invoice.status !== 'cancelled'
    );
    
    console.log(`📊 Total invoices: ${invoices.length}, Valid invoices (non-cancelled): ${validInvoices.length}`);
    
    let totalRevenuePKR = 0;
    let usdInvoices = 0;
    let pkrInvoices = 0;
    let aedInvoices = 0;
    
    validInvoices.forEach(invoice => {
      const total = parseFloat(invoice.total || 0);
      const currency = invoice.currency || 'USD';
      
      if (currency === 'USD') {
        totalRevenuePKR += total * usdToPkrRate;
        usdInvoices++;
      } else if (currency === 'PKR') {
        totalRevenuePKR += total;
        pkrInvoices++;
      } else if (currency === 'AED') {
        // Convert AED to PKR (AED to USD rate is approximately 0.27, then USD to PKR)
        const aedToUsdRate = 0.27;
        totalRevenuePKR += total * aedToUsdRate * usdToPkrRate;
        aedInvoices++;
      }
    });
    
    return {
      totalRevenuePKR,
      usdToPkrRate,
      validInvoicesCount: validInvoices.length,
      cancelledInvoicesCount: invoices.length - validInvoices.length,
      breakdown: {
        usdInvoices,
        pkrInvoices,
        aedInvoices
      }
    };
  } catch (error) {
    console.error('Error calculating total revenue in PKR:', error);
    return {
      totalRevenuePKR: 0,
      usdToPkrRate: 280,
      validInvoicesCount: 0,
      cancelledInvoicesCount: 0,
      breakdown: { usdInvoices: 0, pkrInvoices: 0, aedInvoices: 0 }
    };
  }
};

// Utility function to export invoices to Excel
const exportInvoicesToExcel = (invoices, period, year, month, quarter, sortBy) => {
  try {
    // Prepare data for Excel export
    const excelData = invoices.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber || invoice.id,
      'Customer Name': invoice.customerName || 'Unknown',
      'Salesperson': invoice.salespersonName || 'Unknown',
      'Total Amount': invoice.total || 0,
      'Currency': invoice.currency || 'USD',
      'Invoice Date': invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A',
      'Creation Date': invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A',
      'Status': invoice.status || 'Active',
      'Payment Status': invoice.payment_status || 'Unknown',
      'Paid Amount': invoice.paid || 0,
      'Unpaid Amount': invoice.unpaid || 0,
      'Description': invoice.description || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Invoice Number
      { wch: 25 }, // Customer Name
      { wch: 20 }, // Salesperson
      { wch: 15 }, // Total Amount
      { wch: 10 }, // Currency
      { wch: 15 }, // Invoice Date
      { wch: 15 }, // Creation Date
      { wch: 12 }, // Status
      { wch: 15 }, // Payment Status
      { wch: 15 }, // Paid Amount
      { wch: 15 }, // Unpaid Amount
      { wch: 30 }  // Description
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    // Generate filename based on filters
    let filename = 'invoices';
    if (period !== 'all') {
      const periodText = period === 'daily' ? 'today' : 
                        period === 'monthly' ? `${year}-${month.toString().padStart(2, '0')}` :
                        period === 'quarterly' ? `Q${quarter}-${year}` :
                        period === 'yearly' ? `${year}` : period;
      filename += `_${periodText}`;
    }
    filename += `_${sortBy === 'creationDate' ? 'creation_date' : 'invoice_date'}`;
    filename += '.xlsx';

    // Save file
    XLSX.writeFile(wb, filename);
    
    console.log(`📊 Exported ${invoices.length} invoices to ${filename}`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

// Utility functions for date handling (same as Salespersons page)
const getMonthName = (monthNum) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthNum - 1];
};

const getPeriodDisplayText = (period, year, month, quarter) => {
  switch (period) {
    case "daily": return "Today";
    case "monthly": return `${getMonthName(month)} ${year}`;
    case "quarterly": return `Q${quarter} ${year}`;
    case "yearly": return `Year ${year}`;
    default: return "All Time";
  }
};

// Utility function to determine payment status
const getPaymentStatus = (invoice) => {
  const paid = parseFloat(invoice.paid || 0);
  const unpaid = parseFloat(invoice.unpaid || 0);
  
  // If unpaid = 0.0, then it's fully paid
  if (unpaid === 0.0) {
    return { status: 'Paid', color: 'bg-green-100 text-green-800' };
  }
  
  // If paid = 0.0, then it's unpaid
  if (paid === 0.0) {
    // Check if there's a sent_at date to determine if payment is due in the future
    if (invoice.sent_at) {
      const sentDate = new Date(invoice.sent_at);
      const now = new Date();
      const diffTime = sentDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        // Payment is due in the future
        if (diffDays === 1) {
          return { status: 'Due in 1 day', color: 'bg-orange-100 text-orange-800' };
        } else if (diffDays < 30) {
          return { status: `Due in ${diffDays} days`, color: 'bg-orange-100 text-orange-800' };
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          return { status: `Due in ${months} month${months > 1 ? 's' : ''}`, color: 'bg-orange-100 text-orange-800' };
        } else {
          const years = Math.floor(diffDays / 365);
          return { status: `Due in ${years} year${years > 1 ? 's' : ''}`, color: 'bg-orange-100 text-orange-800' };
        }
      } else if (diffDays === 0) {
        return { status: 'Due today', color: 'bg-red-100 text-red-800' };
      } else {
        // Payment is overdue
        const overdueDays = Math.abs(diffDays);
        if (overdueDays === 1) {
          return { status: 'Overdue 1 day', color: 'bg-red-100 text-red-800' };
        } else if (overdueDays < 30) {
          return { status: `Overdue ${overdueDays} days`, color: 'bg-red-100 text-red-800' };
        } else if (overdueDays < 365) {
          const months = Math.floor(overdueDays / 30);
          return { status: `Overdue ${months} month${months > 1 ? 's' : ''}`, color: 'bg-red-100 text-red-800' };
        } else {
          const years = Math.floor(overdueDays / 365);
          return { status: `Overdue ${years} year${years > 1 ? 's' : ''}`, color: 'bg-red-100 text-red-800' };
        }
      }
    }
    
    // Default unpaid status
    return { status: 'Not Paid', color: 'bg-red-100 text-red-800' };
  }
  
  // If both paid > 0.0 AND unpaid > 0.0, then it's partially paid
  if (paid > 0.0 && unpaid > 0.0) {
    return { status: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800' };
  }
  
  // If no payment information is available, check if invoice was sent
  if (invoice.sent === true && invoice.sent_at) {
    const sentDate = new Date(invoice.sent_at);
    const now = new Date();
    const diffTime = sentDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return { status: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: 'bg-orange-100 text-orange-800' };
    } else if (diffDays <= 0) {
      return { status: 'Payment Due', color: 'bg-red-100 text-red-800' };
    }
  }
  
  // Default to Not Paid if no other information is available
  return { status: 'Not Paid', color: 'bg-red-100 text-red-800' };
};

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
      Remaining invoices will load in background
    </div>
    <div className="mt-4 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
      🚀 Progressive loading for maximum speed
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
      <div className="flex justify-between">
        <span className="text-gray-600">Status:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          invoice.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
          invoice.status === 'Invoiced' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {invoice.status || 'Active'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Payment:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatus(invoice).color}`}>
          {getPaymentStatus(invoice).status}
        </span>
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
  const [sortBy, setSortBy] = useState("creationDate"); // creationDate or invoiceDate

  // ✅ Pagination state for OneUp API (all records in one call)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Frontend pagination: 100 invoices per page
  const [hasMorePages, setHasMorePages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // ✅ Frontend pagination state
  const [allInvoices, setAllInvoices] = useState([]); // Store all loaded invoices
  const [currentPageInvoices, setCurrentPageInvoices] = useState([]); // Current page invoices


  // ✅ Dashboard statistics
  const [_stats, setStats] = useState({
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

  // ✅ Enhanced filtering system (same as Salespersons page)
  const [period, setPeriod] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  
  // ✅ Time-based currency sales (legacy - keeping for compatibility)
  const [timePeriod] = useState("all");
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

  // ✅ PKR Revenue calculation
  const [pkrRevenueData, setPkrRevenueData] = useState({
    totalRevenuePKR: 0,
    usdToPkrRate: 280,
    validInvoicesCount: 0,
    cancelledInvoicesCount: 0,
    breakdown: { usdInvoices: 0, pkrInvoices: 0, aedInvoices: 0 },
    loading: true
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

  // ✅ Fetch sales summary asynchronously (non-blocking)
  useEffect(() => {
    const fetchSalesSummaryAsync = async () => {
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

      // Use setTimeout to defer this calculation
      setTimeout(async () => {
        try {
          console.log('🔄 Fetching sales summary in background...');
          const response = await cachedApiClient.get('/invoices/sales-summary', { useCache: true });
          const summary = response.data;
          
          console.log('📊 Sales Summary loaded:', summary);
          
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
      }, 200); // Small delay to prioritize invoice loading
    };
    
    fetchSalesSummaryAsync();
  }, []); // Run once on component mount

  // ✅ Fetch currency sales asynchronously (non-blocking)
  useEffect(() => {
    const fetchCurrencySalesAsync = async () => {
      // Use setTimeout to defer this calculation
      setTimeout(async () => {
        try {
          console.log(`🔄 Fetching currency sales in background for time period: ${timePeriod}`);
          
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
          
          console.log('💱 Currency Sales Data loaded:', data);
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
      }, 300); // Small delay to prioritize invoice loading
    };
    
    fetchCurrencySalesAsync();
  }, [timePeriod]); // Run when time period changes

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

  // ✅ Data compression function
  const compressData = (data) => {
    try {
      // Remove unnecessary fields to reduce size but keep status fields
      const compressed = data.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        salespersonName: inv.salespersonName,
        total: inv.total,
        currency: inv.currency,
        invoiceDate: inv.invoiceDate,
        createdAt: inv.createdAt,
        status: inv.status,
        payment_status: inv.payment_status,
        invoice_status: inv.invoice_status,
        delivery_status: inv.delivery_status,
        paid: inv.paid,
        unpaid: inv.unpaid,
        locked: inv.locked,
        sent: inv.sent,
        sent_at: inv.sent_at
      }));
      return JSON.stringify(compressed);
    } catch (error) {
      console.warn('Failed to compress data:', error);
      return null;
    }
  };

  // ✅ Safe storage function with fallback
  const safeSetStorage = useCallback((key, data) => {
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
  }, []);

  // ✅ Debug data removed for better performance - invoices load first

  // ✅ Enhanced invoice loading with filtering (same as Salespersons page)
  useEffect(() => {
    const fetchInvoicesProgressive = async () => {
      // Check if we already have data cached
      const cacheKey = `dashboard-invoices-${sortBy}-${period}-${year}-${month}-${quarter}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData) {
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
        console.log(`🔄 Progressive loading: currency=${currency}, sortBy=${sortBy}, period=${period}`);
        
        // Step 1: Load first batch quickly (1000 invoices)
        console.log('📥 Loading first batch (1000 invoices)...');
        const firstBatchResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=1000&sortBy=${sortBy}`, { useCache: true });
        const firstBatch = firstBatchResponse.data.data || [];
        
        // Apply filtering to first batch (including cancelled invoices)
        const filteredFirstBatch = filterInvoicesByPeriod(firstBatch, period, year, month, quarter, sortBy);
        
        console.log(`🔍 First Batch Debug: Total: ${firstBatch.length}, Filtered: ${filteredFirstBatch.length}`);
        console.log(`🔍 First Batch Debug: SortBy: ${sortBy}, Period: ${period}, Month: ${month}, Year: ${year}`);
        
        // Show first batch immediately
        setAllInvoices(filteredFirstBatch);
        setTotalCount(filteredFirstBatch.length);
        setLoading(false);
        console.log(`✅ First batch loaded: ${filteredFirstBatch.length} invoices - UI updated`);
        
        // Step 2: Load remaining invoices in background
        setTimeout(async () => {
          try {
            console.log('📥 Loading remaining invoices in background...');
            const fullResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=-1&sortBy=${sortBy}`, { useCache: true });
            const allInvoicesData = fullResponse.data.data || [];
            
            // Apply filtering to all invoices (including cancelled invoices)
            const filteredInvoices = filterInvoicesByPeriod(allInvoicesData, period, year, month, quarter, sortBy);
            
            console.log(`📊 Filtered ${filteredInvoices.length} invoices for ${period} period`);
            console.log(`🔍 Debug: Total invoices before filtering: ${allInvoicesData.length}`);
            console.log(`🔍 Debug: SortBy field: ${sortBy}`);
            console.log(`🔍 Debug: Currency filter: ${currency}`);
            
            // Cache the complete filtered data
            safeSetStorage(cacheKey, filteredInvoices);
            
            // Filter by currency if not "All"
            let finalFilteredData = filteredInvoices;
            if (currency !== "All") {
              finalFilteredData = filteredInvoices.filter(inv => inv.currency === currency);
            }
            
            // Update with complete dataset
            setAllInvoices(finalFilteredData);
            setTotalCount(finalFilteredData.length);
            console.log(`✅ Complete dataset loaded: ${finalFilteredData.length} invoices`);
          } catch (err) {
            console.error("❌ Error loading remaining invoices:", err);
          }
        }, 500); // Small delay to let UI render first batch
        
      } catch (err) {
        console.error("❌ Error fetching invoices:", err);
        setError(`Failed to fetch invoices: ${err.message}`);
        setAllInvoices([]);
        setCurrentPageInvoices([]);
        setLoading(false);
      }
    };
    
    fetchInvoicesProgressive();
  }, [currency, sortBy, period, year, month, quarter, safeSetStorage]); // Added new filter dependencies

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

  // ✅ Calculate PKR Revenue asynchronously after invoices are loaded (non-blocking)
  useEffect(() => {
    const calculatePKRRevenueAsync = async () => {
      if (allInvoices.length > 0) {
        // Set loading state but don't block UI
        setPkrRevenueData(prev => ({ ...prev, loading: true }));
        
        // Use setTimeout to defer calculation and not block initial render
        setTimeout(async () => {
          try {
            console.log('💰 Starting PKR revenue calculation in background...');
            // allInvoices now includes cancelled invoices, PKR calculation will handle them
            const revenueData = await calculateTotalRevenueInPKR(allInvoices);
            setPkrRevenueData({
              ...revenueData,
              loading: false
            });
            console.log('✅ PKR Revenue calculated:', revenueData);
          } catch (error) {
            console.error('Error calculating PKR revenue:', error);
            setPkrRevenueData(prev => ({ ...prev, loading: false }));
          }
        }, 100); // Small delay to ensure UI renders first
      }
    };
    
    calculatePKRRevenueAsync();
  }, [allInvoices]);

  // Filter invoices based on search term
  const filteredInvoices = currentPageInvoices.filter(inv => 
    !searchTerm || 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.salespersonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber?.toString().includes(searchTerm)
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 overflow-x-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/5 to-purple-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tr from-indigo-400/5 to-pink-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Beautiful Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-xl border-b border-white/20">
        <div className="max-w-full mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
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

      <div className="relative z-10 max-w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* <StatsCard
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
          /> */}
          <StatsCard
            icon="📄"
            title="Total Invoices"
            value={salesSummary.totalInvoices}
            subtitle="All invoices"
            color="orange"
          />
          <StatsCard
            icon="🇵🇰"
            title="Total Revenue (PKR)"
            value={pkrRevenueData.loading ? "..." : pkrRevenueData.totalRevenuePKR.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            subtitle={`Rate: ${pkrRevenueData.usdToPkrRate} PKR/USD`}
            color="blue"
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

        {/* PKR Revenue Analysis Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🇵🇰 Total Revenue Analysis (PKR)
              {pkrRevenueData.loading && <span className="text-sm text-gray-500">(Calculating...)</span>}
            </h2>
            <div className="text-sm text-gray-500">
              Exchange Rate: {pkrRevenueData.usdToPkrRate} PKR/USD
            </div>
          </div>
          
          {/* PKR Revenue Summary Card */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  ₨{pkrRevenueData.totalRevenuePKR.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">Total Revenue (PKR)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Excluding cancelled invoices
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pkrRevenueData.validInvoicesCount}
                </div>
                <div className="text-sm text-gray-600">Valid Invoices</div>
                <div className="text-xs text-gray-500 mt-1">
                  {pkrRevenueData.cancelledInvoicesCount} cancelled excluded
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ₨{pkrRevenueData.validInvoicesCount > 0 ? (pkrRevenueData.totalRevenuePKR / pkrRevenueData.validInvoicesCount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                </div>
                <div className="text-sm text-gray-600">Average per Invoice</div>
                <div className="text-xs text-gray-500 mt-1">
                  In PKR
                </div>
              </div>
            </div>
          </div>

          {/* Currency Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <div className="text-2xl">🇺🇸</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">USD Converted</h3>
                    <p className="text-sm text-gray-500">US Dollar to PKR</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{pkrRevenueData.breakdown.usdInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium text-gray-900">{pkrRevenueData.usdToPkrRate} PKR/USD</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <div className="text-2xl">🇵🇰</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">PKR Direct</h3>
                    <p className="text-sm text-gray-500">Pakistani Rupee</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{pkrRevenueData.breakdown.pkrInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">No Conversion:</span>
                  <span className="font-medium text-gray-900">Direct PKR</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <div className="text-2xl">🇦🇪</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AED Converted</h3>
                    <p className="text-sm text-gray-500">UAE Dirham to PKR</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoices:</span>
                  <span className="font-medium text-gray-900">{pkrRevenueData.breakdown.aedInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium text-gray-900">AED→USD→PKR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time-Based Currency Sales Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              💱 Currency Sales Analysis
              {/* <span className="text-sm font-normal text-gray-500">
                ({timePeriod === 'all' ? 'All Time' : timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})
              </span> */}
            </h2>
            <div className="text-sm text-gray-500">
              Total: {currencySalesData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
          </div>
          
          {/* Main Currency Sales Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"> */}
            {/* USD Sales */}
            {/* <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
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
            </div> */}

            {/* PKR Sales */}
            {/* <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
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
            </div> */}

            {/* AED Sales */}
            {/* <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
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
          </div> */}

          {/* Summary Row */}
          {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
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
          </div> */}
        </div>

        {/* Legacy Currency Breakdown Cards */}
        {/* {Object.keys(salesSummary.salesByCurrency).length > 0 && (
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
        )} */}

        

      {/* Beautiful Enhanced Filters */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm p-8 mb-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between">
              {/* Filters Section */}
              <div className="flex flex-wrap gap-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">💱</span> Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setPage(1);
                    }}
                    className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 hover:border-blue-300 hover:shadow-md min-w-[160px]"
                  >
                    <option value="All">All Currencies</option>
                    <option value="USD">USD 🇺🇸</option>
                    <option value="PKR">PKR 🇵🇰</option>
                    <option value="AED">AED 🇦🇪</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📅</span> Time Period
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-200 hover:border-purple-300 hover:shadow-md min-w-[140px]"
                  >
                    <option value="all">All Time</option>
                    <option value="daily">Today</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🔄</span> Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                      cachedApiClient.clearCache();
                    }}
                    className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all duration-200 hover:border-indigo-300 hover:shadow-md min-w-[160px]"
                  >
                    <option value="creationDate">🕐 Creation Date</option>
                    <option value="invoiceDate">📅 Invoice Date</option>
                  </select>
                </div>

                {(period === "monthly" || period === "quarterly" || period === "yearly") && (
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📆</span> Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all duration-200 hover:border-green-300 hover:shadow-md min-w-[100px]"
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
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">🗓️</span> Month
                    </label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-400 transition-all duration-200 hover:border-orange-300 hover:shadow-md min-w-[140px]"
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
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📊</span> Quarter
                    </label>
                    <select
                      value={quarter}
                      onChange={(e) => setQuarter(parseInt(e.target.value))}
                      className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-all duration-200 hover:border-teal-300 hover:shadow-md min-w-[140px]"
                    >
                      <option value={1}>Q1 (Jan-Mar)</option>
                      <option value={2}>Q2 (Apr-Jun)</option>
                      <option value={3}>Q3 (Jul-Sep)</option>
                      <option value={4}>Q4 (Oct-Dec)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="text-center xl:text-right bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  📋 {getPeriodDisplayText(period, year, month, quarter)}
                </h3>
                <div className="flex items-center justify-center xl:justify-end gap-4 mb-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    {allInvoices.length} invoice{allInvoices.length !== 1 ? 's' : ''} found
                  </div>
                </div>
                <div className="flex items-center justify-center xl:justify-end gap-2 text-sm">
                  <span className="text-gray-600">Sorted by</span>
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full font-medium">
                    {sortBy === "creationDate" ? "🕐 Creation Date" : "📅 Invoice Date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Excel Download Section */}
        <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-xl border border-emerald-200/50 p-6 mb-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-green-400/20 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-teal-400/20 to-cyan-400/20 rounded-full translate-y-8 -translate-x-8"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2 flex items-center justify-center lg:justify-start gap-3">
                  <span className="text-3xl">📊</span> Export Data
                </h3>
                <p className="text-gray-700 font-medium mb-1">
                  Download filtered invoices to Excel format
                </p>
                <p className="text-sm text-gray-600">
                  Perfect for analysis, reporting, and record keeping
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">
                      {allInvoices.length}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      Invoices Ready
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const success = exportInvoicesToExcel(allInvoices, period, year, month, quarter, sortBy);
                    if (success) {
                      alert(`✅ Successfully exported ${allInvoices.length} invoices to Excel!`);
                    } else {
                      alert('❌ Failed to export invoices. Please try again.');
                    }
                  }}
                  className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-300 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform duration-200">📥</span>
                  <span>Download Excel</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Page Size Selector */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <span className="text-xl">⚙️</span> Display Settings
              </h3>
              <p className="text-sm text-gray-600">
                Choose how many invoices to show per page
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/50 shadow-md">
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-400 transition-all duration-200 hover:border-slate-300 hover:shadow-md font-medium"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page (Recommended)</option>
                  <option value={200}>200 per page</option>
                </select>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/50 shadow-md">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-600 mb-1">
                    {Math.ceil(allInvoices.length / pageSize)}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    Total Pages
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
            {/* Beautiful Controls Section */}
        <div className="bg-gradient-to-r from-white via-gray-50/50 to-slate-50/50 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm p-6 mb-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-400/10 to-slate-400/10 rounded-full -translate-y-12 translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🔍</span> Search Invoices
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search invoices, customers, salespersons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 hover:border-blue-300 hover:shadow-md font-medium"
                  />
                  <div className="absolute left-4 top-3.5 text-gray-400 text-lg">🔍</div>
                </div>
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
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
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
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          inv.status === 'Invoiced' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {inv.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatus(inv).color}`}>
                          {getPaymentStatus(inv).status}
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
                🚀 Progressive loading: First batch → Background completion • Page size: {pageSize} invoices
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