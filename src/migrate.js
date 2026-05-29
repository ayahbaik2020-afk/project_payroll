const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Use DATABASE_URL_DIRECT for migration if available, otherwise fallback to DATABASE_URL
if (process.env.DATABASE_URL_DIRECT) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_DIRECT;
}

const { initDb, pool } = require('./database');

async function runMigration() {
  console.log("=========================================");
  console.log("     RUNNING SUPABASE SCHEMA MIGRATION   ");
  console.log("=========================================\n");
  
  try {
    console.log("Connecting to Supabase and executing DDL queries...");
    await initDb();
    console.log("\nMigration completed successfully! All tables are verified.");
  } catch (err) {
    console.error("\nMigration failed with error:", err.message);
    process.exit(1);
  } finally {
    // Close connection pool
    await pool.end();
    process.exit(0);
  }
}

runMigration();
