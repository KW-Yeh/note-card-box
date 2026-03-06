import { AuroraDSQLPool } from '@aws/aurora-dsql-node-postgres-connector';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const pool = new AuroraDSQLPool({
    host: process.env.AURORA_DSQL_HOST!,
    port: parseInt(process.env.AURORA_DSQL_PORT || '5432'),
    database: process.env.AURORA_DSQL_DB || 'postgres',
    user: process.env.AURORA_DSQL_USER || 'admin',
    region: process.env.AURORA_DSQL_REGION!,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('Connected to Aurora DSQL');
    console.log(`Host: ${process.env.AURORA_DSQL_HOST}`);
    console.log(`Database: ${process.env.AURORA_DSQL_DB || 'postgres'}`);

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_dsql_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Aurora DSQL does not support multiple DDL statements in one transaction.
    // Split by semicolons and execute each statement individually.
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`\nExecuting ${statements.length} migration statements...`);
    for (const statement of statements) {
      await client.query(statement);
    }
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
