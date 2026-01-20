import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

// GET /api/tags - Fetch all tags for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    let query = `
      SELECT id, name, color, created_at as "createdAt"
      FROM tags
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [session.user.id];

    if (since) {
      query += ` AND created_at > to_timestamp($2::bigint / 1000.0)`;
      params.push(Number.parseInt(since));
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

    const tags = result.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
    }));

    return NextResponse.json(tags);
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, color, createdAt } = body;

    const result = await pool.query(
      `INSERT INTO tags (id, user_id, name, color, created_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5::bigint / 1000.0))
       ON CONFLICT (user_id, name) DO UPDATE SET
         color = COALESCE(EXCLUDED.color, tags.color)
       RETURNING *`,
      [id, session.user.id, name.toLowerCase(), color, createdAt]
    );

    const tag = result.rows[0];
    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: new Date(tag.created_at).getTime(),
    });
  } catch (error) {
    console.error('POST /api/tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
