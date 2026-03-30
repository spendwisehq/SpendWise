// backend/src/config/db.js — FULL FILE

const mongoose = require('mongoose');
const { env } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.db.uri, {
      dbName: env.db.name,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Atlas connected`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Atlas disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Atlas reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Atlas error:', err.message);
    });

  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    console.error('👉 Check your MONGODB_URI and network access settings');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('✅ MongoDB Atlas disconnected cleanly');
};

const testConnection = async () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    status: states[state],
    host: mongoose.connection.host,
    dbName: mongoose.connection.name,
  };
};

module.exports = { connectDB, disconnectDB, testConnection };