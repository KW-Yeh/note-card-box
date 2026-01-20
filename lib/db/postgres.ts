import { Pool } from "pg";

// 主要連線池 (Write Host) - 用於寫入操作
const pool = new Pool({
	host: process.env.AURORA_POSTGRESQL_WRITE_HOST,
	port: Number.parseInt(process.env.AURORA_POSTGRESQL_PORT || "5432"),
	database: process.env.AURORA_POSTGRESQL_DB_NAME || "postgres",
	user: process.env.AURORA_POSTGRESQL_USERNAME,
	password: process.env.AURORA_POSTGRESQL_PASSWORD,
	ssl: {
		rejectUnauthorized: false, // 對於 AWS RDS/Aurora，可以設為 false
	},
	max: 10,
	idleTimeoutMillis: 30000,
});

export default pool;

// Read Replica Pool - 用於查詢操作 (可選)
export const readPool = new Pool({
	host: process.env.AURORA_POSTGRESQL_READ_HOST,
	port: Number.parseInt(process.env.AURORA_POSTGRESQL_PORT || "5432"),
	database: process.env.AURORA_POSTGRESQL_DB_NAME || "postgres",
	user: process.env.AURORA_POSTGRESQL_USERNAME,
	password: process.env.AURORA_POSTGRESQL_PASSWORD,
	ssl: {
		rejectUnauthorized: false, // 對於 AWS RDS/Aurora，可以設為 false
	},
	max: 10,
	idleTimeoutMillis: 30000,
});

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
