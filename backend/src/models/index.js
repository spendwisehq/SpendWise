// backend/src/models/index.js

const User                 = require('./User.model');
const Category             = require('./Category.model');
const Transaction          = require('./Transaction.model');
const Budget               = require('./Budget.model');
const Goal                 = require('./Goal.model');
const Group                = require('./Group.model');
const Split                = require('./Split.model');
const RecurringTransaction = require('./RecurringTransaction.model');
const AIReport             = require('./AIReport.model');
const APIKey               = require('./APIKey.model');
const APIUsageLog          = require('./APIUsageLog.model');

module.exports = {
  User,
  Category,
  Transaction,
  Budget,
  Goal,
  Group,
  Split,
  RecurringTransaction,
  AIReport,
  APIKey,
  APIUsageLog,
};