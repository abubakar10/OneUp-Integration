/**
 * Format large numbers for better UI display
 * @param {number|string} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string
 */
export const formatLargeNumber = (value, options = {}) => {
  const {
    currency = '',
    showCurrency = true,
    decimals = 1,
    forceUnit = null
  } = options;

  const num = parseFloat(value) || 0;
  
  if (num === 0) return showCurrency ? `${currency} 0` : '0';
  
  const absNum = Math.abs(num);
  let formattedValue;
  let unit = '';
  
  if (forceUnit) {
    switch (forceUnit) {
      case 'B':
        formattedValue = (num / 1000000000).toFixed(decimals);
        unit = 'B';
        break;
      case 'M':
        formattedValue = (num / 1000000).toFixed(decimals);
        unit = 'M';
        break;
      case 'K':
        formattedValue = (num / 1000).toFixed(decimals);
        unit = 'K';
        break;
      default:
        formattedValue = num.toFixed(decimals);
    }
  } else {
    if (absNum >= 1000000000) {
      formattedValue = (num / 1000000000).toFixed(decimals);
      unit = 'B';
    } else if (absNum >= 1000000) {
      formattedValue = (num / 1000000).toFixed(decimals);
      unit = 'M';
    } else if (absNum >= 1000) {
      formattedValue = (num / 1000).toFixed(decimals);
      unit = 'K';
    } else {
      formattedValue = num.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals 
      });
    }
  }
  
  // Remove unnecessary decimal zeros
  formattedValue = parseFloat(formattedValue).toString();
  
  if (showCurrency && currency) {
    return `${currency} ${formattedValue}${unit}`;
  }
  
  return `${formattedValue}${unit}`;
};

/**
 * Format currency with proper spacing and units
 * @param {number|string} value - The value to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  return formatLargeNumber(value, { currency, showCurrency: true, decimals: 1 });
};

/**
 * Format percentage values
 * @param {number|string} value - The percentage value
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value) => {
  const num = parseFloat(value) || 0;
  return `${num.toFixed(1)}%`;
};

/**
 * Format currency breakdown text for better readability
 * @param {object} breakdown - Currency breakdown object
 * @returns {string} Formatted breakdown string
 */
export const formatCurrencyBreakdown = (breakdown) => {
  if (!breakdown || typeof breakdown !== 'object') return '';
  
  return Object.entries(breakdown)
    .map(([currency, amount]) => `${currency}: ${formatLargeNumber(amount, { decimals: 1 })}`)
    .join(' • ');
};

/**
 * Smart number formatting for different contexts
 * @param {number|string} value - The number to format
 * @param {string} context - Context: 'compact', 'full', 'currency'
 * @returns {string} Formatted number
 */
export const smartFormat = (value, context = 'compact') => {
  const num = parseFloat(value);
  
  // Handle NaN, null, undefined, or invalid values
  if (!isFinite(num)) {
    return 'N/A';
  }
  
  switch (context) {
    case 'compact':
      return formatLargeNumber(num, { showCurrency: false });
    case 'full':
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    case 'currency':
      return formatCurrency(num);
    default:
      return formatLargeNumber(num, { showCurrency: false });
  }
};

/**
 * Safe number formatting that handles edge cases
 * @param {number|string} value - The number to format
 * @returns {string} Safely formatted number
 */
export const safeFormat = (value) => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  const num = parseFloat(value);
  if (!isFinite(num)) {
    return 'N/A';
  }
  
  return smartFormat(num);
};
