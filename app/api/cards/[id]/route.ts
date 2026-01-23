import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

// GET /api/cards/[id] - Get a single card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `SELECT
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
      WHERE c.id = $1 AND c.user_id = $2
      GROUP BY c.id`,
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const card = result.rows[0];
    return NextResponse.json({
      ...card,
      createdAt: new Date(card.createdAt).getTime(),
      updatedAt: new Date(card.updatedAt).getTime(),
      promotedAt: card.promotedAt
        ? new Date(card.promotedAt).getTime()
        : undefined,
    });
  } catch (error) {
    console.error('GET /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/cards/[id] - Update a card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, type, status, isPublic, wordCount, tagIds, updatedAt, promotedAt } =
      body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update card
      const cardResult = await client.query(
        `UPDATE cards SET
          title = COALESCE($1, title),
          content = COALESCE($2, content),
          type = COALESCE($3, type),
          status = COALESCE($4, status),
          is_public = COALESCE($5, is_public),
          word_count = COALESCE($6, word_count),
          updated_at = to_timestamp($7::bigint / 1000.0),
          promoted_at = CASE WHEN $8::bigint IS NOT NULL THEN to_timestamp($8::bigint / 1000.0) ELSE promoted_at END
        WHERE id = $9 AND user_id = $10
        RETURNING *`,
        [
          title,
          content,
          type,
          status,
          isPublic,
          wordCount,
          updatedAt || Date.now(),
          promotedAt || null,
          id,
          session.user.id,
        ]
      );

      if (cardResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      }

      // Update card_tags if provided
      if (tagIds !== undefined) {
        await client.query('DELETE FROM card_tags WHERE card_id = $1', [id]);
        if (tagIds.length > 0) {
          const tagValues = tagIds
            .map((_: string, i: number) => `($1, $${i + 2})`)
            .join(', ');
          await client.query(
            `INSERT INTO card_tags (card_id, tag_id) VALUES ${tagValues}`,
            [id, ...tagIds]
          );
        }
      }

      await client.query('COMMIT');

      const card = cardResult.rows[0];
      return NextResponse.json({
        id: card.id,
        shareId: card.share_id,
        title: card.title,
        content: card.content,
        type: card.type,
        status: card.status,
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
    console.error('PUT /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // card_tags and links will be deleted by CASCADE
    const result = await pool.query(
      'DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
