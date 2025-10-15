// ✅ Web Worker for PKR revenue calculation (non-blocking)
self.onmessage = function(e) {
  const { invoices, usdToPkrRate } = e.data;
  
  try {
    console.log('💰 Worker: Starting PKR revenue calculation...');
    
    // Filter out cancelled invoices
    const validInvoices = invoices.filter(invoice => 
      invoice.status !== 'Cancelled' && invoice.status !== 'cancelled'
    );
    
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
    
    const result = {
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
    
    console.log('✅ Worker: PKR revenue calculation complete');
    self.postMessage({ success: true, data: result });
  } catch (error) {
    console.error('❌ Worker: Error calculating PKR revenue:', error);
    self.postMessage({ success: false, error: error.message });
  }
};
