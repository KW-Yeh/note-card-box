'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardTypeBadge } from './card-type-badge';
import { type Card as CardType, type Tag } from '@/types/card';
import { cn } from '@/lib/utils';

interface CardItemProps {
  card: CardType;
  tags?: Tag[];
  onDelete?: (id: string) => void;
  className?: string;
}

export function CardItem({ card, tags = [], onDelete, className }: CardItemProps) {
  const cardTags = tags.filter((tag) => card.tagIds.includes(tag.id));
  const timeAgo = formatDistanceToNow(card.updatedAt, {
    addSuffix: true,
    locale: zhTW,
  });

  // Get first 100 characters of content for preview
  const contentPreview = card.content.slice(0, 100) + (card.content.length > 100 ? '...' : '');

  return (
    <Card className={cn('group relative transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTypeBadge type={card.type} />
              {card.isPublic && (
                <Badge variant="secondary" className="text-xs">
                  公開
                </Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2 text-base">
              <Link href={`/cards/${card.id}`} className="hover:underline">
                {card.title || '無標題'}
              </Link>
            </CardTitle>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">開啟選單</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cards/${card.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  檢視
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/cards/${card.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  編輯
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(card.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Content Preview */}
        {contentPreview && (
          <CardDescription className="line-clamp-2 text-sm">
            {contentPreview}
          </CardDescription>
        )}

        {/* Tags */}
        {cardTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cardTags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
              >
                #{tag.name}
              </Badge>
            ))}
            {cardTags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{cardTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{card.wordCount} 字</span>
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
