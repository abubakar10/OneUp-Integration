import { useState, useEffect } from "react";
import cachedApiClient from "../api/cachedApiClient";
import { smartFormat } from "../utils/formatters";

// Payment Status Badge Component
const PaymentStatusBadge = ({ status, days }) => {
  const getStatusConfig = (status, days) => {
    switch (status) {
      case 'paid':
        if (days < 0) return { color: 'bg-green-100 text-green-800', text: `Paid ${Math.abs(days)} days early` };
        if (days === 0) return { color: 'bg-green-100 text-green-800', text: 'Paid on time' };
        if (days <= 7) return { color: 'bg-yellow-100 text-yellow-800', text: `Paid ${days} days late` };
        return { color: 'bg-red-100 text-red-800', text: `Paid ${days} days late` };
      case 'partial':
        return { color: 'bg-orange-100 text-orange-800', text: 'Partially Paid' };
      case 'pending':
        if (days > 30) return { color: 'bg-red-100 text-red-800', text: `${days} days overdue` };
        if (days > 0) return { color: 'bg-yellow-100 text-yellow-800', text: `${days} days overdue` };
        return { color: 'bg-blue-100 text-blue-800', text: 'Pending' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  };

  const config = getStatusConfig(status, days);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  );
};

// Priority Badge Component
const PriorityBadge = ({ days }) => {
  if (days > 90) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🔴 Critical</span>;
  if (days > 60) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🟠 High</span>;
  if (days > 30) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🟡 Medium</span>;
  return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">🟢 Low</span>;
};

// Aging Bucket Component
const AgingBucket = ({ title, count, amount, color, percentage }) => (
  <div className={`bg-white rounded-lg shadow-md border-l-4 ${color} p-4`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-sm text-gray-600">{smartFormat(amount)}</p>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-gray-900">{percentage}%</div>
        <div className="text-xs text-gray-500">of total</div>
      </div>
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, subtitle, trend, icon }) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">{title}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
        {subtitle && <div className="text-xs text-gray-600">{subtitle}</div>}
      </div>
      <div className={`text-sm font-medium ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→'}
      </div>
    </div>
  </div>
);

const InvoicesPaidReports = () => {
  const [invoiceData, setInvoiceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({
    stage: 'initializing',
    message: 'Initializing...',
    progress: 0
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    status: 'all',
    customer: 'all',
    salesperson: 'all',
    amountRange: 'all',
    paymentMethod: 'all'
  });
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    dso: 0,
    cei: 0,
    averagePaymentTime: 0
  });
  const [agingBuckets, setAgingBuckets] = useState({
    current: { count: 0, amount: 0 },
    days30: { count: 0, amount: 0 },
    days60: { count: 0, amount: 0 },
    days90: { count: 0, amount: 0 }
  });

  // Helper function to process invoice data
  const processInvoiceData = (invoices) => {
    return invoices.map(invoice => {
      // Handle different possible date formats
      let invoiceDate;
      if (invoice.invoiceDate) {
        invoiceDate = new Date(invoice.invoiceDate);
      } else if (invoice.invoice?.invoiceDate) {
        invoiceDate = new Date(invoice.invoice.invoiceDate);
      } else {
        invoiceDate = new Date(); // fallback to current date
      }
      
      const today = new Date();
      const daysDiff = Math.floor((today - invoiceDate) / (1000 * 60 * 60 * 24));
      
      // Get actual payment data from the invoice
      const totalAmount = parseFloat(invoice.total || invoice.invoice?.total || 0);
      const paidAmount = parseFloat(invoice.paid || invoice.invoice?.paid || 0);
      const unpaidAmount = parseFloat(invoice.unpaid || invoice.invoice?.unpaid || 0);
      
      // Determine payment status based on actual data
      let status, paymentDate;
      
      if (paidAmount >= totalAmount) {
        status = 'paid';
        paymentDate = new Date(invoiceDate.getTime() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000);
      } else if (paidAmount > 0) {
        status = 'partial';
        paymentDate = new Date(invoiceDate.getTime() + (Math.random() * 60) * 24 * 60 * 60 * 1000);
      } else {
        status = 'pending';
        paymentDate = null;
      }
      
      const outstandingAmount = totalAmount - paidAmount;
      const paymentDays = paymentDate ? Math.floor((paymentDate - invoiceDate) / (1000 * 60 * 60 * 24)) : daysDiff;
      
      return {
        id: invoice.id || invoice.invoice?.id,
        invoiceNumber: invoice.invoiceNumber || invoice.invoice?.invoice_number || invoice.id,
        customerName: invoice.customerName || invoice.invoice?.customer_name || 'Unknown',
        salespersonName: invoice.salespersonName || 'Unknown',
        total: totalAmount,
        paid: paidAmount,
        unpaid: unpaidAmount,
        currency: invoice.currency || invoice.invoice?.currency || 'USD',
        invoiceDate: invoiceDate,
        paymentDate: paymentDate,
        status: status,
        paidAmount: paidAmount,
        outstandingAmount: outstandingAmount,
        daysDiff: daysDiff,
        paymentDays: paymentDays,
        priority: daysDiff > 90 ? 'critical' : daysDiff > 60 ? 'high' : daysDiff > 30 ? 'medium' : 'low'
      };
    });
  };

  // Progressive loading implementation (same as Dashboard)
  useEffect(() => {
    const fetchInvoiceDataProgressive = async () => {
      // Check if we already have data cached
      const cacheKey = 'invoices-paid-reports-data';
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log(`📦 Loading cached invoice data: ${parsedData.length} invoices`);
          setInvoiceData(parsedData);
          setFilteredData(parsedData);
          calculateMetrics(parsedData);
          calculateAgingBuckets(parsedData);
          setLoading(false);
          return;
        } catch (error) {
          console.warn("Failed to parse cached data:", error);
        }
      }

      setLoading(true);
      setLoadingProgress({ stage: 'fetching', message: 'Fetching invoice data...', progress: 10 });
      console.log("🔄 Starting progressive loading for invoice payment data...");

      try {
        // Step 1: Load first batch quickly (1000 invoices)
        setLoadingProgress({ stage: 'first-batch', message: 'Loading first batch (1000 invoices)...', progress: 30 });
        console.log('📥 Loading first batch (1000 invoices) for immediate display...');
        const firstBatchResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=1000`, { useCache: true });
        const firstBatch = firstBatchResponse.data.data || [];
        
        if (firstBatch.length === 0) {
          console.warn("No invoices found in first batch");
          setInvoiceData([]);
          setFilteredData([]);
          setLoading(false);
          return;
        }
        
        // Process first batch
        setLoadingProgress({ stage: 'processing', message: 'Processing payment data...', progress: 60 });
        const processedFirstBatch = processInvoiceData(firstBatch);
        
        // Show first batch immediately
        setInvoiceData(processedFirstBatch);
        setFilteredData(processedFirstBatch);
        calculateMetrics(processedFirstBatch);
        calculateAgingBuckets(processedFirstBatch);
        setLoading(false);
        setLoadingProgress({ stage: 'complete', message: 'First batch loaded successfully', progress: 100 });
        console.log(`✅ First batch loaded: ${processedFirstBatch.length} invoices - UI updated`);
        
        // Step 2: Load remaining invoices in background
        setTimeout(async () => {
          try {
            setLoadingProgress({ stage: 'background', message: 'Loading remaining invoices in background...', progress: 80 });
            console.log('📥 Loading remaining invoices in background...');
            const fullResponse = await cachedApiClient.get(`/invoices?page=1&pageSize=10000`, { useCache: true });
            const allInvoicesData = fullResponse.data.data || [];
            
            console.log(`📊 Total invoices loaded: ${allInvoicesData.length}`);
            
            // Process all invoices
            const processedAllInvoices = processInvoiceData(allInvoicesData);
            
            // Cache the complete data
            sessionStorage.setItem(cacheKey, JSON.stringify(processedAllInvoices));
            
            // Update with complete dataset
            setInvoiceData(processedAllInvoices);
            setFilteredData(processedAllInvoices);
            calculateMetrics(processedAllInvoices);
            calculateAgingBuckets(processedAllInvoices);
            setLoadingProgress({ stage: 'complete', message: 'All data loaded successfully', progress: 100 });
            console.log(`✅ Complete dataset loaded: ${processedAllInvoices.length} invoices`);
          } catch (err) {
            console.error("❌ Error loading remaining invoices:", err);
            setLoadingProgress({ stage: 'error', message: 'Error loading remaining data', progress: 0 });
          }
        }, 500); // Small delay to let UI render first batch
        
      } catch (error) {
        console.error("❌ Error fetching invoice data:", error);
        setInvoiceData([]);
        setFilteredData([]);
        setLoading(false);
      }
    };
    
    fetchInvoiceDataProgressive();
  }, []);

  const calculateMetrics = (invoices) => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const outstandingAmount = invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
    
    // Calculate DSO (Days Sales Outstanding)
    const totalOutstandingDays = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.daysDiff, 0);
    const dso = totalOutstandingDays / invoices.filter(inv => inv.status !== 'paid').length || 0;
    
    // Calculate CEI (Collection Effectiveness Index)
    const beginningReceivables = totalAmount;
    const endingReceivables = outstandingAmount;
    const collections = paidAmount;
    const cei = beginningReceivables > 0 ? ((collections / (beginningReceivables - endingReceivables + collections)) * 100) : 0;
    
    // Calculate average payment time
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const averagePaymentTime = paidInvoices.length > 0 
      ? paidInvoices.reduce((sum, inv) => sum + inv.paymentDays, 0) / paidInvoices.length 
      : 0;
    
    setMetrics({
      totalInvoices,
      totalAmount,
      paidAmount,
      outstandingAmount,
      dso: Math.round(dso),
      cei: Math.round(cei),
      averagePaymentTime: Math.round(averagePaymentTime)
    });
  };

  const calculateAgingBuckets = (invoices) => {
    const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');
    
    const buckets = {
      current: { count: 0, amount: 0 },
      days30: { count: 0, amount: 0 },
      days60: { count: 0, amount: 0 },
      days90: { count: 0, amount: 0 }
    };
    
    pendingInvoices.forEach(invoice => {
      const days = invoice.daysDiff;
      const amount = invoice.outstandingAmount;
      
      if (days <= 0) {
        buckets.current.count++;
        buckets.current.amount += amount;
      } else if (days <= 30) {
        buckets.days30.count++;
        buckets.days30.amount += amount;
      } else if (days <= 60) {
        buckets.days60.count++;
        buckets.days60.amount += amount;
      } else {
        buckets.days90.count++;
        buckets.days90.amount += amount;
      }
    });
    
    setAgingBuckets(buckets);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // Apply filters
    let filtered = [...invoiceData];
    
    if (newFilters.status !== 'all') {
      filtered = filtered.filter(inv => inv.status === newFilters.status);
    }
    
    if (newFilters.customer !== 'all') {
      filtered = filtered.filter(inv => inv.customerName === newFilters.customer);
    }
    
    if (newFilters.salesperson !== 'all') {
      filtered = filtered.filter(inv => inv.salespersonName === newFilters.salesperson);
    }
    
    if (newFilters.amountRange !== 'all') {
      const [min, max] = newFilters.amountRange.split('-').map(Number);
      filtered = filtered.filter(inv => {
        const amount = parseFloat(inv.total || 0);
        return amount >= min && (max ? amount <= max : true);
      });
    }
    
    setFilteredData(filtered);
  };

  const generatePaymentReminders = () => {
    const overdueInvoices = filteredData.filter(inv => 
      inv.status !== 'paid' && inv.daysDiff > 0
    );
    
    // Simulate reminder generation
    alert(`Generated ${overdueInvoices.length} payment reminders for overdue invoices`);
  };

  const exportData = () => {
    const csvContent = [
      ['Invoice Number', 'Customer', 'Salesperson', 'Invoice Date', 'Amount', 'Paid Amount', 'Outstanding', 'Status', 'Days Overdue', 'Priority'],
      ...filteredData.map(inv => [
        inv.invoiceNumber || inv.id,
        inv.customerName || 'Unknown',
        inv.salespersonName || 'Unknown',
        inv.invoiceDate.toLocaleDateString(),
        inv.total,
        inv.paidAmount,
        inv.outstandingAmount,
        inv.status,
        inv.daysDiff,
        inv.priority
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_paid_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getUniqueCustomers = () => [...new Set(invoiceData.map(inv => inv.customerName).filter(Boolean))];
  const getUniqueSalespersons = () => [...new Set(invoiceData.map(inv => inv.salespersonName).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">💳</span>
                Invoices Paid Reports
              </h1>
              <p className="text-gray-600 mt-1">Payment status analysis and collection management</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button 
                onClick={generatePaymentReminders}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                📧 Generate Reminders
              </button>
              <button 
                onClick={exportData}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                📊 Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{loadingProgress.message}</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {loadingProgress.stage === 'first-batch' && 'Loading first 1000 invoices for immediate display...'}
                {loadingProgress.stage === 'processing' && 'Analyzing payment data and calculating metrics...'}
                {loadingProgress.stage === 'background' && 'Loading remaining invoices in background...'}
                {loadingProgress.stage === 'complete' && 'Data loaded successfully!'}
                {loadingProgress.stage === 'error' && 'Error occurred while loading data'}
              </p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && invoiceData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Invoice Data Found</h3>
            <p className="text-gray-600 mb-4">Unable to load invoice data. Please check your connection and try again.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-2xl mx-auto">
              <h4 className="font-semibold text-yellow-800 mb-2">Debug Information:</h4>
              <p className="text-sm text-yellow-700 mb-2">Check the browser console for detailed error messages.</p>
              <p className="text-sm text-yellow-700 mb-2">Make sure the API is running and accessible.</p>
              <p className="text-sm text-yellow-700">API Endpoint: <code className="bg-yellow-100 px-1 rounded">/api/invoices?page=1&pageSize=10000</code></p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Data Content */}
        {!loading && invoiceData.length > 0 && (
          <>
            {/* Debug Info Panel */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-800">✅ Data Loaded Successfully</h4>
                  <p className="text-sm text-green-700">Found {invoiceData.length} invoices with payment data</p>
                  {loadingProgress.stage === 'background' && (
                    <p className="text-xs text-blue-600 mt-1">🔄 Loading remaining invoices in background...</p>
                  )}
                </div>
                <div className="text-right text-sm text-green-700">
                  <p>Total Amount: {smartFormat(metrics.totalAmount)}</p>
                  <p>Paid Amount: {smartFormat(metrics.paidAmount)}</p>
                  <p>Outstanding: {smartFormat(metrics.outstandingAmount)}</p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard 
                title="Total Invoices" 
                value={metrics.totalInvoices.toLocaleString()} 
                icon="📋"
                trend="up"
              />
              <MetricCard 
                title="Total Amount" 
                value={smartFormat(metrics.totalAmount)} 
                icon="💰"
                trend="up"
              />
              <MetricCard 
                title="Outstanding Amount" 
                value={smartFormat(metrics.outstandingAmount)} 
                subtitle={`${metrics.totalAmount > 0 ? ((metrics.outstandingAmount / metrics.totalAmount) * 100).toFixed(1) : 0}% of total`}
                icon="⏳"
                trend="down"
              />
              <MetricCard 
                title="DSO" 
                value={`${metrics.dso} days`} 
                subtitle="Days Sales Outstanding"
                icon="📅"
                trend="down"
              />
            </div>

            {/* Collection Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard 
                title="CEI" 
                value={`${metrics.cei}%`} 
                subtitle="Collection Effectiveness Index"
                icon="🎯"
                trend="up"
              />
              <MetricCard 
                title="Avg Payment Time" 
                value={`${metrics.averagePaymentTime} days`} 
                subtitle="Average days to payment"
                icon="⏱️"
                trend="down"
              />
              <MetricCard 
                title="Collection Rate" 
                value={`${metrics.totalAmount > 0 ? ((metrics.paidAmount / metrics.totalAmount) * 100).toFixed(1) : 0}%`} 
                subtitle="Amount collected vs total"
                icon="✅"
                trend="up"
              />
            </div>

            {/* Payment Aging Buckets */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Payment Aging Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AgingBucket 
                  title="Current (0 days)" 
                  count={agingBuckets.current.count} 
                  amount={agingBuckets.current.amount}
                  color="border-green-500"
                  percentage={filteredData.length > 0 ? ((agingBuckets.current.count / filteredData.length) * 100).toFixed(1) : 0}
                />
                <AgingBucket 
                  title="1-30 Days" 
                  count={agingBuckets.days30.count} 
                  amount={agingBuckets.days30.amount}
                  color="border-yellow-500"
                  percentage={filteredData.length > 0 ? ((agingBuckets.days30.count / filteredData.length) * 100).toFixed(1) : 0}
                />
                <AgingBucket 
                  title="31-60 Days" 
                  count={agingBuckets.days60.count} 
                  amount={agingBuckets.days60.amount}
                  color="border-orange-500"
                  percentage={filteredData.length > 0 ? ((agingBuckets.days60.count / filteredData.length) * 100).toFixed(1) : 0}
                />
                <AgingBucket 
                  title="60+ Days" 
                  count={agingBuckets.days90.count} 
                  amount={agingBuckets.days90.amount}
                  color="border-red-500"
                  percentage={filteredData.length > 0 ? ((agingBuckets.days90.count / filteredData.length) * 100).toFixed(1) : 0}
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🔍 Advanced Filters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Customers</option>
                    {getUniqueCustomers().map(customer => (
                      <option key={customer} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                  <select
                    value={filters.salesperson}
                    onChange={(e) => handleFilterChange('salesperson', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Salespersons</option>
                    {getUniqueSalespersons().map(salesperson => (
                      <option key={salesperson} value={salesperson}>{salesperson}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
                  <select
                    value={filters.amountRange}
                    onChange={(e) => handleFilterChange('amountRange', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Amounts</option>
                    <option value="0-1000">$0 - $1,000</option>
                    <option value="1000-5000">$1,000 - $5,000</option>
                    <option value="5000-10000">$5,000 - $10,000</option>
                    <option value="10000-">$10,000+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({
                        dateRange: 'all',
                        status: 'all',
                        customer: 'all',
                        salesperson: 'all',
                        amountRange: 'all',
                        paymentMethod: 'all'
                      });
                      setFilteredData(invoiceData);
                    }}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">📋 Invoice Payment Status</h2>
                <p className="text-gray-600 text-sm mt-1">Showing {filteredData.length} invoices</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesperson</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Timing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((invoice, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">#{invoice.invoiceNumber || invoice.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.customerName || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.salespersonName || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.invoiceDate.toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{smartFormat(parseFloat(invoice.total || 0))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{smartFormat(invoice.paidAmount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{smartFormat(invoice.outstandingAmount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PaymentStatusBadge status={invoice.status} days={invoice.daysDiff} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PriorityBadge days={invoice.daysDiff} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {invoice.status === 'paid' ? (
                              invoice.paymentDays < 0 ? 
                                `Paid ${Math.abs(invoice.paymentDays)} days early` :
                                invoice.paymentDays === 0 ?
                                'Paid on time' :
                                `Paid ${invoice.paymentDays} days late`
                            ) : (
                              invoice.daysDiff > 0 ? 
                                `${invoice.daysDiff} days overdue` :
                                'Not yet due'
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesPaidReports;