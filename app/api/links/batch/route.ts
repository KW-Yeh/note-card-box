import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

// POST /api/links/batch - Batch create/update links
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const links = await request.json();

    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Collect all card IDs that need validation
    const cardIds = new Set<string>();
    for (const link of links) {
      cardIds.add(link.sourceId);
      cardIds.add(link.targetId);
    }

    // Validate that all referenced cards exist and belong to user
    const cardsCheck = await pool.query(
      `SELECT id FROM cards WHERE id = ANY($1) AND user_id = $2`,
      [Array.from(cardIds), session.user.id]
    );

    const validCardIds = new Set(cardsCheck.rows.map(row => row.id));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      const skipped = [];

      for (const link of links) {
        const { id, sourceId, targetId, relation, description, createdAt } = link;

        // Skip links with invalid card references
        if (!validCardIds.has(sourceId) || !validCardIds.has(targetId)) {
          skipped.push({ id, reason: 'One or both cards not found' });
          continue;
        }

        const result = await client.query(
          `INSERT INTO links (id, user_id, source_id, target_id, relation, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7::bigint / 1000.0))
           ON CONFLICT (source_id, target_id) DO UPDATE SET
             relation = EXCLUDED.relation,
             description = EXCLUDED.description
           RETURNING *`,
          [id, session.user.id, sourceId, targetId, relation, description, createdAt]
        );

        const savedLink = result.rows[0];
        results.push({
          id: savedLink.id,
          sourceId: savedLink.source_id,
          targetId: savedLink.target_id,
          relation: savedLink.relation,
          description: savedLink.description,
          createdAt: new Date(savedLink.created_at).getTime(),
        });
      }

      await client.query('COMMIT');

      return NextResponse.json({ saved: results, skipped });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('POST /api/links/batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
