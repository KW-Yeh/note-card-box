import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

// POST /api/sync/reset - Delete all user data from cloud (for force overwrite)
export async function POST() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			// Delete in order: card_tags, links, cards, tags
			await client.query("DELETE FROM card_tags WHERE card_id IN (SELECT id FROM cards WHERE user_id = $1)", [
				session.user.id,
			]);
			await client.query("DELETE FROM links WHERE user_id = $1", [session.user.id]);
			await client.query("DELETE FROM cards WHERE user_id = $1", [session.user.id]);
			await client.query("DELETE FROM tags WHERE user_id = $1", [session.user.id]);

			await client.query("COMMIT");

			return NextResponse.json({ success: true });
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("POST /api/sync/reset error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
