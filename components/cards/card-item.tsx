'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Share2, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
import { ConfirmPublicDialog } from './confirm-public-dialog';
import { type Card as CardType, type Tag } from '@/types/card';
import { cn } from '@/lib/utils';

interface CardItemProps {
  card: CardType;
  tags?: Tag[];
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, isPublic: boolean) => Promise<void>;
  className?: string;
}

export function CardItem({ card, tags = [], onDelete, onTogglePublic, className }: CardItemProps) {
  const { data: session } = useSession();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLoggedIn = !!session?.user;
  const cardTags = tags.filter((tag) => card.tagIds.includes(tag.id));
  const timeAgo = formatDistanceToNow(card.updatedAt, {
    addSuffix: true,
    locale: zhTW,
  });

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${card.shareId}`
    : '';

  const handleShareClick = useCallback(() => {
    if (!card.isPublic) {
      setShowConfirmDialog(true);
    } else {
      copyShareLink();
    }
  }, [card.isPublic]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('已複製分享連結');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  }, [shareUrl]);

  const handleConfirmPublic = useCallback(async () => {
    if (!onTogglePublic) return;

    setIsUpdating(true);
    try {
      await onTogglePublic(card.id, true);
      setShowConfirmDialog(false);
      toast.success('卡片已設為公開');
      // 設為公開後自動複製連結
      await copyShareLink();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失敗');
    } finally {
      setIsUpdating(false);
    }
  }, [card.id, onTogglePublic, copyShareLink]);

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
              {isLoggedIn && onTogglePublic && (
                <DropdownMenuItem onClick={handleShareClick}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  {copied ? '已複製' : '分享'}
                </DropdownMenuItem>
              )}
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
        {card.content && (
          <CardDescription
            className="line-clamp-2 text-sm"
            dangerouslySetInnerHTML={{ __html: card.content }}
          />
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

      {/* Confirm Public Dialog */}
      <ConfirmPublicDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmPublic}
        isLoading={isUpdating}
      />
    </Card>
  );
}
