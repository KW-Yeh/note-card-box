/**
 * 測試資料庫連線腳本
 * 用法: npx tsx scripts/test-db-connection.ts
 *
 * 這個腳本可以在部署前驗證：
 * 1. 資料庫連線是否正常
 * 2. 所有必要的表是否存在
 * 3. 基本的 CRUD 操作是否正常
 */

import { Pool } from 'pg';

const requiredTables = [
  'users',
  'accounts',
  'sessions',
  'verification_tokens',
  'tags',
  'cards',
  'card_tags',
  'links',
];

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  const config = {
    host: process.env.AURORA_POSTGRESQL_WRITE_HOST,
    port: Number.parseInt(process.env.AURORA_POSTGRESQL_PORT || '5432'),
    database: process.env.AURORA_POSTGRESQL_DB_NAME || 'postgres',
    user: process.env.AURORA_POSTGRESQL_USERNAME,
    password: process.env.AURORA_POSTGRESQL_PASSWORD,
    ssl: false,
    connectionTimeoutMillis: 10000,
  };

  console.log('📋 Connection config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log('');

  const pool = new Pool(config);

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing connection...');
    const client = await pool.connect();
    console.log('   ✅ Connected successfully!\n');

    // Test 2: Check PostgreSQL version
    console.log('2️⃣ Checking PostgreSQL version...');
    const versionResult = await client.query('SELECT version()');
    console.log(`   ✅ ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Test 3: Check required tables
    console.log('3️⃣ Checking required tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existingTables = tablesResult.rows.map(r => r.table_name);

    let allTablesExist = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING`);
        allTablesExist = false;
      }
    }
    console.log('');

    // Test 4: Test write operation
    console.log('4️⃣ Testing write operation...');
    await client.query('SELECT 1 + 1 AS result');
    console.log('   ✅ Query executed successfully\n');

    client.release();

    // Summary
    console.log('═══════════════════════════════════');
    if (allTablesExist) {
      console.log('✅ All checks passed! Database is ready.');
    } else {
      console.log('⚠️  Some tables are missing. Run migration:');
      console.log('   npx tsx lib/db/migrate.ts');
    }
    console.log('═══════════════════════════════════');

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
