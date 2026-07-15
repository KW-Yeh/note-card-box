import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db/postgres';

const VALID_RELATIONS = new Set(['EXTENSION', 'OPPOSITION', 'RELATED']);

// PUT /api/links/[id] - Update a link relationship
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
    const { relation } = await request.json();
    if (typeof relation !== 'string' || !VALID_RELATIONS.has(relation)) {
      return NextResponse.json({ error: 'Invalid relation' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE links
       SET relation = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, source_id, target_id, relation, description, created_at`,
      [relation, id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

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
    console.error('PUT /api/links/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[id] - Delete a link
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

    const result = await pool.query(
      'DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/links/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
