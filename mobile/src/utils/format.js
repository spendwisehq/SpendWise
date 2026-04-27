// mobile/src/utils/format.js
// Portable from web — Intl.NumberFormat works in Hermes (Expo SDK 50+)

export const fmt = (v, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

export const fmtINR = (v) =>
  '₹' + Math.abs(Number(v) || 0).toLocaleString('en-IN');

export const CHART_COLORS = ['#68dbae','#cebdff','#ffb684','#7eaaff','#ff94c2','#facc15','#9b7fed','#26a37a'];
