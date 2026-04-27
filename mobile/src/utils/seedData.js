// Seed data — mirrors design prototype, used until backend is wired in.

export const SEED_TRANSACTIONS = [
  { id: 't1', title: 'Third Wave Coffee',  category: 'Dining',        emoji: '☕',  amount: -240,   date: 'Today',       time: '09:14', method: 'Credit · ••4521', note: 'Oat flat white' },
  { id: 't2', title: 'Big Basket',          category: 'Groceries',     emoji: '🛒',  amount: -1860,  date: 'Today',       time: '12:02', method: 'UPI',             note: 'Weekly produce' },
  { id: 't3', title: 'Freelance — Neue',    category: 'Income',        emoji: '💰',  amount: 42000,  date: 'Today',       time: '15:30', method: 'Bank transfer',   note: 'March invoice' },
  { id: 't4', title: 'PVR Cinemas',         category: 'Entertainment', emoji: '🎬',  amount: -820,   date: 'Yesterday',   time: '21:18', method: 'Credit · ••4521', note: 'Dune: Part Three' },
  { id: 't5', title: 'Uber',                category: 'Transport',     emoji: '🚗',  amount: -312,   date: 'Yesterday',   time: '08:22', method: 'UPI',             note: 'Airport drop' },
  { id: 't6', title: 'Zomato',              category: 'Dining',        emoji: '🍽️', amount: -540,   date: 'Yesterday',   time: '20:05', method: 'Credit · ••4521', note: 'Korean dinner' },
  { id: 't7', title: 'Blinkit',             category: 'Groceries',     emoji: '🛒',  amount: -420,   date: '01 Nov 2024', time: '19:44', method: 'UPI',             note: 'Late night snacks' },
  { id: 't8', title: 'Rent — Landlord',     category: 'Housing',       emoji: '🏠',  amount: -18500, date: '01 Nov 2024', time: '10:00', method: 'Bank transfer',   note: 'November rent' },
  { id: 't9', title: 'Zara',                category: 'Shopping',      emoji: '🛍️', amount: -2990,  date: '31 Oct 2024', time: '16:40', method: 'Credit · ••4521', note: 'Wool coat' },
  { id: 't10',title: 'Starbucks',           category: 'Dining',        emoji: '☕',  amount: -380,   date: '31 Oct 2024', time: '08:45', method: 'Credit · ••4521', note: '' },
];

export const CATEGORIES = [
  { key: 'Dining',        emoji: '🍽️', color: '#68dbae', share: 30 },
  { key: 'Groceries',     emoji: '🛒',  color: '#cebdff', share: 20 },
  { key: 'Transport',     emoji: '🚗',  color: '#ffb684', share: 12 },
  { key: 'Housing',       emoji: '🏠',  color: '#7eaaff', share: 49 },
  { key: 'Shopping',      emoji: '🛍️', color: '#ff94c2', share: 8 },
  { key: 'Entertainment', emoji: '🎬',  color: '#facc15', share: 6 },
];

export const GOALS = [
  { id: 'g1', title: 'MacBook Pro M4',  emoji: '💻', saved: 142500, target: 220000, eta: 'Aug 2026', color: '#68dbae' },
  { id: 'g2', title: 'Emergency Fund',  emoji: '🛡️', saved: 68200,  target: 150000, eta: 'Oct 2026', color: '#cebdff' },
  { id: 'g3', title: 'Lisbon Trip',     emoji: '✈️',  saved: 41000,  target: 90000,  eta: 'Jun 2026', color: '#ffb684' },
  { id: 'g4', title: 'Road Bike',       emoji: '🚴', saved: 9200,   target: 45000,  eta: 'Dec 2026', color: '#7eaaff' },
];

export const GROUPS = [
  { id: 'gr1', name: 'Lisbon Trip',  emoji: '✈️', members: 4, youOwe: 0,   owesYou: 3200, total: 18400, accent: '#cebdff' },
  { id: 'gr2', name: 'Apartment 3B', emoji: '🏠', members: 3, youOwe: 840, owesYou: 0,    total: 54200, accent: '#68dbae' },
  { id: 'gr3', name: 'Sunday Climb', emoji: '🧗', members: 5, youOwe: 260, owesYou: 0,    total: 2400,  accent: '#ffb684' },
];

export const FRIENDS = [
  { n: 'Ananya R.', you: 0,   them: 1200, emoji: '🌸' },
  { n: 'Dev S.',    you: 560, them: 0,    emoji: '🎯' },
  { n: 'Priya M.',  you: 0,   them: 2000, emoji: '🌿' },
  { n: 'Rahul V.',  you: 280, them: 0,    emoji: '🔥' },
];

export const SEED_BALANCE = 67060;
