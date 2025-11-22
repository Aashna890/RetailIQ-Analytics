export function createPageUrl(pageName) {
  // Convert page name to URL slug
  const slugMap = {
    'DataImport': '/data-import',
    'Dashboard': '/dashboard',
    'Customers': '/customers',
    'SalesForecast': '/sales-forecast',
    'Recommendations': '/recommendations',
    'MarketBasket': '/market-basket',
    'Anomalies': '/anomalies'
  };
  
  return slugMap[pageName] || '/';
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function calculatePercentageChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(1);
}
