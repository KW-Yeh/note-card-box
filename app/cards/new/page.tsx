'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCards, useTags, useDB } from '@/contexts';
import { type CardType, type Tag, CARD_TYPE_LABELS } from '@/types/card';
import { TITLE_MAX_LENGTH } from '@/lib/constants';
import { toast } from 'sonner';

const CARD_TYPES: CardType[] = ['INNOVATION', 'LITERATURE', 'PROJECT', 'PERMANENT'];

export default function NewCardPage() {
  const router = useRouter();
  const { isReady } = useDB();
  const { createCard } = useCards();
  const { tags, fetchTags, getOrCreateTag } = useTags();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CardType>('INNOVATION');
  const [tagInput, setTagInput] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isReady) {
      fetchTags();
    }
  }, [isReady, fetchTags]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('請輸入標題');
      return;
    }

    setIsSaving(true);
    try {
      const card = await createCard({
        title: title.trim(),
        content,
        type,
        status: type === 'PERMANENT' ? 'ARCHIVED' : 'PENDING',
        isPublic: false,
        wordCount: content.replace(/<[^>]*>/g, '').length,
        tagIds: selectedTagIds,
      });

      toast.success('卡片已建立');
      router.push(`/cards/${card.id}`);
    } catch (error) {
      toast.error('建立失敗');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async () => {
    const tagName = tagInput.trim().replace(/^#/, '');
    if (!tagName) return;

    try {
      const tag = await getOrCreateTag(tagName);
      if (!selectedTagIds.includes(tag.id)) {
        setSelectedTagIds((prev) => [...prev, tag.id]);
      }
      setTagInput('');
    } catch {
      toast.error('新增標籤失敗');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleHashtagsChange = async (hashtagIds: string[]) => {
    const processedIds: string[] = [];

    for (const id of hashtagIds) {
      if (id.startsWith('new:')) {
        const tagName = id.slice(4);
        try {
          const tag = await getOrCreateTag(tagName);
          processedIds.push(tag.id);
        } catch {
          // Ignore errors for duplicate tags
        }
      } else {
        processedIds.push(id);
      }
    }

    setSelectedTagIds((prev) => {
      const combined = new Set([...prev, ...processedIds]);
      return Array.from(combined);
    });
  };

  const handleSearchTags = async (query: string): Promise<Tag[]> => {
    if (!query) return tags.slice(0, 5);
    return tags
      .filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex flex-col">
      <Header title="新增卡片" />

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cards">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Link>
          </Button>

          {/* Card Type */}
          <div className="space-y-2">
            <Label htmlFor="type">卡片類型</Label>
            <Select value={type} onValueChange={(v) => setType(v as CardType)}>
              <SelectTrigger id="type" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CARD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">標題</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
              placeholder="輸入卡片標題..."
              maxLength={TITLE_MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              {title.length} / {TITLE_MAX_LENGTH}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>標籤</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="輸入標籤名稱..."
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                新增
              </Button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="cursor-pointer"
                    style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    #{tag.name} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>內容（輸入 # 可插入標籤）</Label>
            <TiptapEditor
              content={content}
              onChange={setContent}
              onHashtagsChange={handleHashtagsChange}
              onSearchTags={handleSearchTags}
              tags={tags}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/cards">取消</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
