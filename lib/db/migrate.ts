import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const pool = new Pool({
    host: process.env.AURORA_POSTGRESQL_WRITE_HOST,
    port: parseInt(process.env.AURORA_POSTGRESQL_PORT || '5432'),
    database: process.env.AURORA_POSTGRESQL_DB_NAME || 'postgres',
    user: process.env.AURORA_POSTGRESQL_USERNAME,
    password: process.env.AURORA_POSTGRESQL_PASSWORD,
    ssl: false,
  });

  const client = await pool.connect();

  try {
    console.log('Connected to Aurora PostgreSQL');
    console.log(`Host: ${process.env.AURORA_POSTGRESQL_WRITE_HOST}`);
    console.log(`Database: ${process.env.AURORA_POSTGRESQL_DB_NAME}`);

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\nExecuting migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Verify tables created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\nCreated tables:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
