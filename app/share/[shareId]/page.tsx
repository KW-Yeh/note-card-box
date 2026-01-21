import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CardTypeBadge } from '@/components/cards/card-type-badge';
import { Badge } from '@/components/ui/badge';
import { readPool } from '@/lib/db/postgres';
import type { CardType } from '@/types/card';

interface PageProps {
  params: Promise<{ shareId: string }>;
}

interface SharedCard {
  shareId: string;
  title: string;
  content: string;
  type: CardType;
  wordCount: number;
  createdAt: number;
  tags: string[];
}

async function getSharedCard(shareId: string): Promise<SharedCard | null> {
  try {
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

    if (result.rows.length === 0) return null;

    const card = result.rows[0];
    return {
      ...card,
      createdAt: new Date(card.createdAt).getTime(),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const card = await getSharedCard(shareId);

  if (!card) {
    return {
      title: '卡片不存在 | Note Card Box',
    };
  }

  const plainText = card.content.replace(/<[^>]*>/g, '').slice(0, 160);

  return {
    title: `${card.title || '無標題'} | Note Card Box`,
    description: plainText || '分享的卡片內容',
    openGraph: {
      title: card.title || '無標題',
      description: plainText || '分享的卡片內容',
      type: 'article',
      siteName: 'Note Card Box',
    },
    twitter: {
      card: 'summary',
      title: card.title || '無標題',
      description: plainText || '分享的卡片內容',
    },
  };
}

export default async function SharedCardPage({ params }: PageProps) {
  const { shareId } = await params;
  const card = await getSharedCard(shareId);

  if (!card) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <header className="mb-8 text-center">
          <p className="text-sm text-muted-foreground">
            分享自 <span className="font-semibold">Note Card Box</span>
          </p>
        </header>

        <article className="space-y-6">
          <div className="space-y-4">
            <CardTypeBadge type={card.type} />
            <h1 className="text-2xl font-bold">{card.title || '無標題'}</h1>
            <p className="text-sm text-muted-foreground">
              建立於 {format(card.createdAt, 'yyyy/MM/dd', { locale: zhTW })}
              {' · '}{card.wordCount} 字
            </p>
          </div>

          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-card p-6"
            dangerouslySetInnerHTML={{ __html: card.content || '<p class="text-muted-foreground">無內容</p>' }}
          />
        </article>

        <footer className="mt-8 rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            想要建立自己的知識卡片盒？
          </p>
          <a
            href="/"
            className="mt-2 inline-block text-primary hover:underline"
          >
            開始使用 Note Card Box
          </a>
        </footer>
      </div>
    </div>
  );
}
