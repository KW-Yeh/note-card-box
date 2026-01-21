'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, Globe, Lock, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Card } from '@/types/card';

interface ShareDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePublic: (isPublic: boolean) => Promise<void>;
  isSynced: boolean;
}

export function ShareDialog({
  card,
  open,
  onOpenChange,
  onTogglePublic,
  isSynced,
}: ShareDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${card.shareId}`
    : '';

  const handleTogglePublic = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await onTogglePublic(checked);
      toast.success(checked ? '卡片已設為公開' : '卡片已設為私人');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失敗');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('已複製分享連結');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  }, [shareUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享卡片</DialogTitle>
          <DialogDescription>
            {isSynced
              ? '管理此卡片的分享設定'
              : '請先登入並同步卡片到雲端才能分享'}
          </DialogDescription>
        </DialogHeader>

        {!isSynced ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              此卡片尚未同步到雲端。請先登入帳號，系統會自動同步您的卡片。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {card.isPublic ? (
                  <Globe className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="public-switch" className="text-base">
                    {card.isPublic ? '公開分享中' : '私人卡片'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {card.isPublic
                      ? '任何人都可以透過連結查看'
                      : '只有你可以看到這張卡片'}
                  </p>
                </div>
              </div>
              <Switch
                id="public-switch"
                checked={card.isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={isUpdating}
              />
            </div>

            {card.isPublic && (
              <div className="space-y-2">
                <Label>分享連結</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
