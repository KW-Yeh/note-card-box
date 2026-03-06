import { DsqlSigner } from "@aws/aurora-dsql-node-postgres-connector";
import { Pool } from "pg";

const host = process.env.AURORA_DSQL_HOST!;
const region = process.env.AURORA_DSQL_REGION!;

const signer = new DsqlSigner({ hostname: host, region });

// Generate IAM auth token synchronously at module init via top-level await.
// Tokens expire in ~1 hour but existing connections remain valid for the pool lifetime.
const token = await signer.getDbConnectAdminAuthToken();

const pool = new Pool({
	host,
	port: Number.parseInt(process.env.AURORA_DSQL_PORT || "5432"),
	database: process.env.AURORA_DSQL_DB || "postgres",
	user: process.env.AURORA_DSQL_USER || "admin",
	password: token,
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
