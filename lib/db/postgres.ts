import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";

const pool = new AuroraDSQLPool({
	host: process.env.AURORA_DSQL_HOST!,
	port: Number.parseInt(process.env.AURORA_DSQL_PORT || "5432"),
	database: process.env.AURORA_DSQL_DB || "postgres",
	user: process.env.AURORA_DSQL_USER || "admin",
	region: process.env.AURORA_DSQL_REGION!,
	ssl: { rejectUnauthorized: false },
	max: 10,
	idleTimeoutMillis: 30000,
});

export default pool;

// Helper function for executing queries
export async function query<T = unknown>(
	text: string,
	params?: unknown[],
): Promise<T[]> {
	const client = await pool.connect();
	try {
		const result = await client.query(text, params);
		return result.rows as T[];
	} finally {
		client.release();
	}
}
