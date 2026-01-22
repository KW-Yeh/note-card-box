import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

// POST /api/tags/batch - Batch create/update tags
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await request.json();

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const tag of tags) {
        const { id, name, color, createdAt } = tag;

        const result = await client.query(
          `INSERT INTO tags (id, user_id, name, color, created_at)
           VALUES ($1, $2, $3, $4, to_timestamp($5::bigint / 1000.0))
           ON CONFLICT (user_id, name) DO UPDATE SET
             color = COALESCE(EXCLUDED.color, tags.color)
           RETURNING *`,
          [id, session.user.id, name.toLowerCase(), color, createdAt]
        );

        const savedTag = result.rows[0];
        results.push({
          id: savedTag.id,
          name: savedTag.name,
          color: savedTag.color,
          createdAt: new Date(savedTag.created_at).getTime(),
        });
      }

      await client.query('COMMIT');

      return NextResponse.json(results);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('POST /api/tags/batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
