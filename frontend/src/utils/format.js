export const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

export const CHART_COLORS = ['#1D9E75','#FF6B6B','#4DA6FF','#FFB547','#A78BFA','#F472B6','#34D399','#FB923C'];
