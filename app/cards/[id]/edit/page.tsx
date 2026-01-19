'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Link as LinkIcon } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { CardTypeBadge } from '@/components/cards/card-type-badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCards, useTags, useLinks, useDB } from '@/contexts';
import { type Card, type CardType, type RelationType, type Tag, CARD_TYPE_LABELS, RELATION_TYPE_LABELS } from '@/types/card';
import { TITLE_MAX_LENGTH } from '@/lib/constants';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

const CARD_TYPES: CardType[] = ['INNOVATION', 'LITERATURE', 'PROJECT', 'PERMANENT'];

export default function EditCardPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isReady } = useDB();
  const { getCard, updateCard, searchCards } = useCards();
  const { tags, fetchTags, getOrCreateTag } = useTags();
  const { createLink, getLinksForCard, suggestRelatedCards } = useLinks();

  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CardType>('INNOVATION');
  const [tagInput, setTagInput] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Link picker state
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<Card[]>([]);
  const [selectedLinkTarget, setSelectedLinkTarget] = useState<Card | null>(null);
  const [linkRelation, setLinkRelation] = useState<RelationType>('EXTENSION');
  const [suggestedCards, setSuggestedCards] = useState<Card[]>([]);
  const [existingLinks, setExistingLinks] = useState<{ from: string[]; to: string[] }>({
    from: [],
    to: [],
  });

  useEffect(() => {
    if (isReady) {
      fetchTags();
      loadCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id]);

  const loadCard = async () => {
    setIsLoading(true);
    try {
      const cardData = await getCard(id);
      if (cardData) {
        setCard(cardData);
        setTitle(cardData.title);
        setContent(cardData.content);
        setType(cardData.type);
        setSelectedTagIds(cardData.tagIds);

        // Load existing links
        const links = await getLinksForCard(id);
        setExistingLinks({
          from: links.from.map((l) => l.targetId),
          to: links.to.map((l) => l.sourceId),
        });

        // Load suggested cards
        const suggested = await suggestRelatedCards(cardData.tagIds, id);
        setSuggestedCards(suggested);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;

    if (!title.trim()) {
      toast.error('請輸入標題');
      return;
    }

    setIsSaving(true);
    try {
      await updateCard(id, {
        title: title.trim(),
        content,
        type,
        status: type === 'PERMANENT' ? 'ARCHIVED' : card.status,
        wordCount: content.replace(/<[^>]*>/g, '').length,
        tagIds: selectedTagIds,
      });

      toast.success('卡片已更新');
      router.push(`/cards/${id}`);
    } catch (error) {
      toast.error('更新失敗');
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
    } catch (error) {
      toast.error('新增標籤失敗');
    }
  };

  const handleHashtagsChange = async (hashtagIds: string[]) => {
    // Process hashtag IDs - some might be "new:tagname" for new tags
    const processedIds: string[] = [];

    for (const id of hashtagIds) {
      if (id.startsWith('new:')) {
        // Create new tag
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

    // Merge with existing selected tags (don't replace, just add new ones from content)
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

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleLinkSearch = async (query: string) => {
    setLinkSearch(query);
    if (query.length >= 2) {
      const results = await searchCards(query);
      // Filter out current card and already linked cards
      const filtered = results.filter(
        (c) =>
          c.id !== id &&
          c.type === 'PERMANENT' &&
          !existingLinks.from.includes(c.id) &&
          !existingLinks.to.includes(c.id)
      );
      setLinkSearchResults(filtered);
    } else {
      setLinkSearchResults([]);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedLinkTarget) return;

    try {
      await createLink(id, selectedLinkTarget.id, linkRelation);
      setExistingLinks((prev) => ({
        ...prev,
        from: [...prev.from, selectedLinkTarget.id],
      }));
      setIsLinkDialogOpen(false);
      setSelectedLinkTarget(null);
      setLinkSearch('');
      toast.success('連結已建立');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立連結失敗');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">找不到此卡片</p>
        <Button asChild>
          <Link href="/cards">返回列表</Link>
        </Button>
      </div>
    );
  }

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex flex-col">
      <Header title="編輯卡片" />

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/cards/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回檢視
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

          {/* Links Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>關聯卡片</Label>
              <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    建立連結
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>建立與永久卡片的連結</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label>搜尋永久卡片</Label>
                      <Input
                        value={linkSearch}
                        onChange={(e) => handleLinkSearch(e.target.value)}
                        placeholder="輸入關鍵字搜尋..."
                      />
                    </div>

                    {/* Search Results */}
                    {linkSearchResults.length > 0 && (
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {linkSearchResults.map((result) => (
                          <div
                            key={result.id}
                            className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                              selectedLinkTarget?.id === result.id
                                ? 'border-primary bg-primary/10'
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => setSelectedLinkTarget(result)}
                          >
                            <div className="flex items-center gap-2">
                              <CardTypeBadge type={result.type} />
                              <span className="font-medium">{result.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested Cards */}
                    {linkSearch.length < 2 && suggestedCards.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">推薦連結</Label>
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                          {suggestedCards.map((result) => (
                            <div
                              key={result.id}
                              className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                                selectedLinkTarget?.id === result.id
                                  ? 'border-primary bg-primary/10'
                                  : 'hover:bg-accent'
                              }`}
                              onClick={() => setSelectedLinkTarget(result)}
                            >
                              <div className="flex items-center gap-2">
                                <CardTypeBadge type={result.type} />
                                <span className="font-medium">{result.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relation Type */}
                    {selectedLinkTarget && (
                      <div className="space-y-2">
                        <Label>連結類型</Label>
                        <Select
                          value={linkRelation}
                          onValueChange={(v) => setLinkRelation(v as RelationType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXTENSION">
                              {RELATION_TYPE_LABELS.EXTENSION} - 相關延伸
                            </SelectItem>
                            <SelectItem value="OPPOSITION">
                              {RELATION_TYPE_LABELS.OPPOSITION} - 對立觀點
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateLink} disabled={!selectedLinkTarget}>
                        建立連結
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground">
              已建立 {existingLinks.from.length + existingLinks.to.length} 個連結
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href={`/cards/${id}`}>取消</Link>
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
