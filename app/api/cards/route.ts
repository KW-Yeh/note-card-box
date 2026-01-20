import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

// GET /api/cards - Fetch all cards for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const since = searchParams.get('since'); // For incremental sync

    let query = `
      SELECT
        c.id,
        c.share_id as "shareId",
        c.title,
        c.content,
        c.type,
        c.status,
        c.is_public as "isPublic",
        c.word_count as "wordCount",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        c.promoted_at as "promotedAt",
        COALESCE(
          array_agg(ct.tag_id) FILTER (WHERE ct.tag_id IS NOT NULL),
          '{}'
        ) as "tagIds"
      FROM cards c
      LEFT JOIN card_tags ct ON c.id = ct.card_id
      WHERE c.user_id = $1
    `;
    const params: (string | number)[] = [session.user.id];
    let paramIndex = 2;

    if (type) {
      query += ` AND c.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (since) {
      query += ` AND c.updated_at > to_timestamp($${paramIndex}::bigint / 1000.0)`;
      params.push(Number.parseInt(since));
      paramIndex++;
    }

    query += ` GROUP BY c.id ORDER BY c.updated_at DESC`;

    const result = await pool.query(query, params);

    // Convert timestamps to Unix milliseconds
    const cards = result.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime(),
      promotedAt: row.promotedAt ? new Date(row.promotedAt).getTime() : undefined,
    }));

    return NextResponse.json(cards);
  } catch (error) {
    console.error('GET /api/cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      shareId,
      title,
      content,
      type,
      status,
      isPublic,
      wordCount,
      tagIds,
      createdAt,
      updatedAt,
      promotedAt,
    } = body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert card (upsert)
      const cardResult = await client.query(
        `INSERT INTO cards (
          id, user_id, share_id, title, content, type, status,
          is_public, word_count, created_at, updated_at, promoted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          to_timestamp($10::bigint / 1000.0),
          to_timestamp($11::bigint / 1000.0),
          CASE WHEN $12::bigint IS NOT NULL THEN to_timestamp($12::bigint / 1000.0) ELSE NULL END
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          is_public = EXCLUDED.is_public,
          word_count = EXCLUDED.word_count,
          updated_at = EXCLUDED.updated_at,
          promoted_at = EXCLUDED.promoted_at
        RETURNING *`,
        [
          id,
          session.user.id,
          shareId,
          title,
          content,
          type,
          status,
          isPublic,
          wordCount,
          createdAt,
          updatedAt,
          promotedAt || null,
        ]
      );

      // Update card_tags
      await client.query('DELETE FROM card_tags WHERE card_id = $1', [id]);

      if (tagIds && tagIds.length > 0) {
        const tagValues = tagIds
          .map((_: string, i: number) => `($1, $${i + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO card_tags (card_id, tag_id) VALUES ${tagValues}`,
          [id, ...tagIds]
        );
      }

      await client.query('COMMIT');

      const card = cardResult.rows[0];
      return NextResponse.json({
        ...card,
        shareId: card.share_id,
        isPublic: card.is_public,
        wordCount: card.word_count,
        tagIds: tagIds || [],
        createdAt: new Date(card.created_at).getTime(),
        updatedAt: new Date(card.updated_at).getTime(),
        promotedAt: card.promoted_at
          ? new Date(card.promoted_at).getTime()
          : undefined,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('POST /api/cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
