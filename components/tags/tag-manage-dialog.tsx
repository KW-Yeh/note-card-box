'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_TAG_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/card';
import { Check, Trash2 } from 'lucide-react';

interface TagManageDialogProps {
  tag: Tag | null;
  cardCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TagManageDialog({
  tag,
  cardCount,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: TagManageDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TAG_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync form state when tag changes or dialog opens
  useEffect(() => {
    if (tag && open) {
      setName(tag.name);
      setColor(tag.color || DEFAULT_TAG_COLORS[0]);
    }
  }, [tag, open]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!tag || !name.trim()) return;

    setIsLoading(true);
    try {
      await onUpdate(tag.id, {
        name: name.trim(),
        color,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tag) return;

    setIsLoading(true);
    try {
      await onDelete(tag.id);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tag) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理標籤</DialogTitle>
          <DialogDescription>
            修改標籤「#{tag.name}」的名稱或顏色
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="tag-name">名稱</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入標籤名稱"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>顏色</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                >
                  {color === c && (
                    <Check className="h-4 w-4 mx-auto text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除標籤
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確定要刪除標籤嗎？</AlertDialogTitle>
                <AlertDialogDescription>
                  {cardCount > 0
                    ? `此標籤關聯了 ${cardCount} 張卡片，刪除後這些卡片將不再有此標籤。此操作無法復原。`
                    : '此操作無法復原。'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>刪除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
            >
              儲存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
