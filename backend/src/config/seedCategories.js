// backend/src/config/seedCategories.js

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');

const defaultCategories = [
  { name: 'Food & Dining',    icon: '🍔', color: '#E85D24', type: 'expense', isSystem: true, keywords: ['swiggy','zomato','restaurant','cafe','food','dining','eat','lunch','dinner','breakfast','hotel','dhaba'] },
  { name: 'Transportation',   icon: '🚗', color: '#378ADD', type: 'expense', isSystem: true, keywords: ['uber','ola','rapido','metro','bus','train','petrol','diesel','fuel','irctc','flight','indigo','air'] },
  { name: 'Shopping',         icon: '🛒', color: '#D4537E', type: 'expense', isSystem: true, keywords: ['amazon','flipkart','myntra','ajio','meesho','mall','store','shop','purchase','buy'] },
  { name: 'Entertainment',    icon: '🎬', color: '#7F77DD', type: 'expense', isSystem: true, keywords: ['netflix','hotstar','prime','spotify','youtube','movie','cinema','pvr','inox','concert','game'] },
  { name: 'Health & Medical', icon: '🏥', color: '#1D9E75', type: 'expense', isSystem: true, keywords: ['hospital','pharmacy','medicine','doctor','clinic','apollo','1mg','netmeds','gym','fitness'] },
  { name: 'Rent & Housing',   icon: '🏠', color: '#EF9F27', type: 'expense', isSystem: true, keywords: ['rent','maintenance','electricity','water','gas','society','housing','apartment'] },
  { name: 'Education',        icon: '📚', color: '#185FA5', type: 'expense', isSystem: true, keywords: ['udemy','coursera','college','school','tuition','books','course','exam','fee'] },
  { name: 'Utilities',        icon: '💡', color: '#639922', type: 'expense', isSystem: true, keywords: ['electricity','bill','recharge','mobile','internet','wifi','broadband','jio','airtel','vi'] },
  { name: 'Travel',           icon: '✈️', color: '#993556', type: 'expense', isSystem: true, keywords: ['hotel','booking','makemytrip','goibibo','oyo','trip','vacation','holiday','tour'] },
  { name: 'Groceries',        icon: '🥬', color: '#3B6D11', type: 'expense', isSystem: true, keywords: ['bigbasket','blinkit','zepto','dmart','reliance','grocery','vegetables','milk','dairy'] },
  { name: 'Personal Care',    icon: '💄', color: '#72243E', type: 'expense', isSystem: true, keywords: ['salon','spa','nykaa','beauty','haircut','parlour','cosmetics'] },
  { name: 'Investment',       icon: '📈', color: '#0F6E56', type: 'expense', isSystem: true, keywords: ['zerodha','groww','mutual fund','sip','stock','shares','crypto','fd','ppf'] },
  { name: 'Salary',           icon: '💰', color: '#085041', type: 'income',  isSystem: true, keywords: ['salary','stipend','payroll','ctc','credit'] },
  { name: 'Freelance',        icon: '💼', color: '#3C3489', type: 'income',  isSystem: true, keywords: ['freelance','client','project','payment received','invoice'] },
  { name: 'Other Income',     icon: '💵', color: '#888780', type: 'income',  isSystem: true, keywords: ['bonus','gift','cashback','refund','reward'] },
  { name: 'Other',            icon: '📦', color: '#B4B2A9', type: 'both',    isSystem: true, keywords: [] },
];

const categorySchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  icon:       { type: String, required: true },
  color:      { type: String, required: true },
  type:       { type: String, enum: ['expense', 'income', 'both'], default: 'expense' },
  isSystem:   { type: Boolean, default: false },
  userId:     { type: mongoose.Schema.Types.ObjectId, default: null },
  keywords:   { type: [String], default: [] },
  isActive:   { type: Boolean, default: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, default: null },
  budget: { monthly: { type: Number, default: null } },
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

const seedCategories = async () => {
  try {
    await connectDB();

    const existing = await Category.countDocuments({ isSystem: true });

    if (existing > 0) {
      console.log(`✅ ${existing} system categories already exist. Skipping.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const inserted = await Category.insertMany(defaultCategories);
    console.log(`✅ Seeded ${inserted.length} default categories successfully`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedCategories();