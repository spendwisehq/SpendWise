// backend/server.js — FULL FILE

require('dotenv').config();
const app = require('./src/app');
const { env } = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Start HTTP server
    const server = app.listen(env.port, () => {
      console.log('─────────────────────────────────────');
      console.log(`🚀 SpendWise Backend Running`);
      console.log(`📍 URL    : http://localhost:${env.port}`);
      console.log(`🌍 ENV    : ${env.nodeEnv}`);
      console.log(`🍃 DB     : MongoDB — ${env.db.name}`);
      console.log(`❤️  Health : http://localhost:${env.port}/health`);
      console.log('─────────────────────────────────────');
    });

    // 3. Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received — shutting down`);
      server.close(async () => {
        await disconnectDB();
        console.log('✅ SpendWise shutdown complete');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ SpendWise failed to start:', error.message);
    process.exit(1);
  }
};

startServer();