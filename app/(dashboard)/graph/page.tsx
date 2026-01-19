'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { KnowledgeGraph } from '@/components/graph/knowledge-graph';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useCards, useTags, useLinks, useDB } from '@/contexts';
import { useIsMobile } from '@/hooks/use-media-query';
import { CardTypeBadge } from '@/components/cards/card-type-badge';
import type { Card } from '@/types/card';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ExternalLink, Pencil } from 'lucide-react';
import NextLink from 'next/link';

export default function GraphPage() {
  const router = useRouter();
  const { isReady } = useDB();
  const { cards, fetchCards } = useCards();
  const { tags, fetchTags } = useTags();
  const { links, fetchLinks } = useLinks();
  const isMobile = useIsMobile();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (isReady) {
      fetchCards();
      fetchTags();
      fetchLinks();
    }
  }, [isReady, fetchCards, fetchTags, fetchLinks]);

  const handleNodeClick = (card: Card) => {
    setSelectedCard(card);
    setIsDetailOpen(true);
  };

  const handleNodeDoubleClick = (card: Card) => {
    router.push(`/cards/${card.id}/edit`);
  };

  const selectedCardTags = selectedCard
    ? tags.filter((tag) => selectedCard.tagIds.includes(tag.id))
    : [];

  const DetailContent = () => {
    if (!selectedCard) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CardTypeBadge type={selectedCard.type} />
            {selectedCard.isPublic && <Badge variant="secondary">公開</Badge>}
          </div>
          <h3 className="text-lg font-semibold">{selectedCard.title || '無標題'}</h3>
          <p className="text-sm text-muted-foreground">
            更新於 {formatDistanceToNow(selectedCard.updatedAt, { addSuffix: true, locale: zhTW })}
          </p>
        </div>

        {selectedCardTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCardTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
              >
                #{tag.name}
              </Badge>
            ))}
          </div>
        )}

        <div
          className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/50 p-4"
          dangerouslySetInnerHTML={{
            __html: selectedCard.content
              ? selectedCard.content.slice(0, 500) + (selectedCard.content.length > 500 ? '...' : '')
              : '<p class="text-muted-foreground">無內容</p>',
          }}
        />

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <NextLink href={`/cards/${selectedCard.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              檢視詳情
            </NextLink>
          </Button>
          <Button variant="outline" asChild>
            <NextLink href={`/cards/${selectedCard.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </NextLink>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <Header title="知識網路" />

      <div className="flex-1">
        {cards.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">尚未建立任何卡片</p>
              <Button className="mt-4" asChild>
                <NextLink href="/cards/new">建立第一張卡片</NextLink>
              </Button>
            </div>
          </div>
        ) : (
          <KnowledgeGraph
            cards={cards}
            links={links}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        )}
      </div>

      {/* Detail Panel - Sheet for desktop, Drawer for mobile */}
      {isMobile ? (
        <Drawer open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>卡片詳情</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <DetailContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>卡片詳情</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <DetailContent />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
