import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

// GET /api/links - Fetch all links for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const cardId = searchParams.get('cardId');

    let query = `
      SELECT
        id,
        source_id as "sourceId",
        target_id as "targetId",
        relation,
        description,
        created_at as "createdAt"
      FROM links
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [session.user.id];
    let paramIndex = 2;

    if (cardId) {
      query += ` AND (source_id = $${paramIndex} OR target_id = $${paramIndex})`;
      params.push(cardId);
      paramIndex++;
    }

    if (since) {
      query += ` AND created_at > to_timestamp($${paramIndex}::bigint / 1000.0)`;
      params.push(Number.parseInt(since));
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    const links = result.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
    }));

    return NextResponse.json(links);
  } catch (error) {
    console.error('GET /api/links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/links - Create a new link
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, sourceId, targetId, relation, description, createdAt } = body;

    // Validate that both cards exist and belong to user
    const cardsCheck = await pool.query(
      'SELECT id FROM cards WHERE id IN ($1, $2) AND user_id = $3',
      [sourceId, targetId, session.user.id]
    );

    if (cardsCheck.rows.length !== 2) {
      return NextResponse.json(
        { error: 'One or both cards not found' },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `INSERT INTO links (id, user_id, source_id, target_id, relation, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7::bigint / 1000.0))
       ON CONFLICT (source_id, target_id) DO UPDATE SET
         relation = EXCLUDED.relation,
         description = EXCLUDED.description
       RETURNING *`,
      [id, session.user.id, sourceId, targetId, relation, description, createdAt]
    );

    const link = result.rows[0];
    return NextResponse.json({
      id: link.id,
      sourceId: link.source_id,
      targetId: link.target_id,
      relation: link.relation,
      description: link.description,
      createdAt: new Date(link.created_at).getTime(),
    });
  } catch (error) {
    console.error('POST /api/links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
