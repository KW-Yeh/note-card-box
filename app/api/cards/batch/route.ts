import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

// POST /api/cards/batch - Batch create/update cards
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await request.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const card of cards) {
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
        } = card;

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

        const savedCard = cardResult.rows[0];
        results.push({
          id: savedCard.id,
          shareId: savedCard.share_id,
          title: savedCard.title,
          content: savedCard.content,
          type: savedCard.type,
          status: savedCard.status,
          isPublic: savedCard.is_public,
          wordCount: savedCard.word_count,
          tagIds: tagIds || [],
          createdAt: new Date(savedCard.created_at).getTime(),
          updatedAt: new Date(savedCard.updated_at).getTime(),
          promotedAt: savedCard.promoted_at
            ? new Date(savedCard.promoted_at).getTime()
            : undefined,
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
    console.error('POST /api/cards/batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
