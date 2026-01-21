import { NextRequest, NextResponse } from 'next/server';
import { readPool } from '@/lib/db/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId || shareId.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid share ID' },
        { status: 400 }
      );
    }

    const result = await readPool.query(
      `SELECT
        c.share_id as "shareId",
        c.title,
        c.content,
        c.type,
        c.word_count as "wordCount",
        c.created_at as "createdAt",
        COALESCE(
          array_agg(t.name) FILTER (WHERE t.name IS NOT NULL),
          '{}'
        ) as "tags"
      FROM cards c
      LEFT JOIN card_tags ct ON c.id = ct.card_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.share_id = $1 AND c.is_public = TRUE
      GROUP BY c.id`,
      [shareId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Card not found or not public' },
        { status: 404 }
      );
    }

    const card = result.rows[0];
    return NextResponse.json({
      ...card,
      createdAt: new Date(card.createdAt).getTime(),
    });
  } catch (error) {
    console.error('GET /api/share/[shareId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
