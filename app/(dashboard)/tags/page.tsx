'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { CardGrid } from '@/components/cards/card-grid';
import { TagManageDialog } from '@/components/tags/tag-manage-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCards, useTags, useDB } from '@/contexts';
import { X, Search, Tag as TagIcon, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { Tag } from '@/types/card';

export default function TagsPage() {
  const { isReady } = useDB();
  const { cards, fetchCards, isLoading: cardsLoading, updateCard } = useCards();
  const { tags, fetchTags, updateTag, deleteTag, isLoading: tagsLoading } = useTags();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  useEffect(() => {
    if (isReady) {
      fetchCards();
      fetchTags();
    }
  }, [isReady, fetchCards, fetchTags]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tags, searchQuery]);

  // Filter cards by selected tags (intersection - must have ALL selected tags)
  const filteredCards = useMemo(() => {
    if (selectedTagIds.length === 0) return cards;
    return cards.filter((card) =>
      selectedTagIds.every((tagId) => card.tagIds.includes(tagId))
    );
  }, [cards, selectedTagIds]);

  // Get card count for each tag
  const tagCardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tags.forEach((tag) => {
      counts[tag.id] = cards.filter((card) => card.tagIds.includes(tag.id)).length;
    });
    return counts;
  }, [tags, cards]);

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearSelection = () => {
    setSelectedTagIds([]);
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    await updateCard(id, { isPublic });
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setIsManageDialogOpen(true);
  };

  const handleUpdateTag = async (id: string, data: { name?: string; color?: string }) => {
    try {
      await updateTag(id, data);
      toast.success('標籤已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失敗');
      throw error;
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      // Remove from selection if selected
      if (selectedTagIds.includes(id)) {
        setSelectedTagIds((prev) => prev.filter((tagId) => tagId !== id));
      }
      await deleteTag(id);
      toast.success('標籤已刪除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刪除失敗');
      throw error;
    }
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const isLoading = cardsLoading || tagsLoading;

  return (
    <div className="flex flex-col">
      <Header title="標籤瀏覽器" />

      <div className="flex-1 p-4 md:p-6">
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋標籤..."
              className="pl-9"
            />
          </div>

          {/* Selected Tags */}
          {selectedTagIds.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">已選擇的標籤（交集搜尋）</p>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="mr-1 h-3 w-3" />
                  清除全部
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="default"
                    className="cursor-pointer gap-1"
                    style={{ backgroundColor: tag.color || undefined }}
                    onClick={() => handleTagClick(tag.id)}
                  >
                    #{tag.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* All Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              所有標籤 ({filteredTags.length})
            </p>

            {isLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20" />
                ))}
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <TagIcon className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery ? '找不到符合的標籤' : '尚未建立任何標籤'}
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    const cardCount = tagCardCounts[tag.id] || 0;

                    return (
                      <div key={tag.id} className="group relative inline-flex items-center">
                        <Badge
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer whitespace-nowrap pr-7"
                          style={{
                            backgroundColor: isSelected
                              ? tag.color || undefined
                              : tag.color ? `${tag.color}20` : undefined,
                            borderColor: tag.color || undefined,
                          }}
                          onClick={() => handleTagClick(tag.id)}
                        >
                          #{tag.name}
                          <span className="ml-1 opacity-60">({cardCount})</span>
                        </Badge>
                        <button
                          type="button"
                          className="absolute right-1 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTag(tag);
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedTagIds.length > 0
                  ? `符合條件的卡片 (${filteredCards.length})`
                  : `所有卡片 (${cards.length})`}
              </p>
            </div>

            <CardGrid
              cards={filteredCards}
              tags={tags}
              isLoading={cardsLoading}
              onTogglePublic={handleTogglePublic}
              emptyMessage={
                selectedTagIds.length > 0
                  ? '沒有同時包含所有選擇標籤的卡片'
                  : '尚未建立任何卡片'
              }
            />
          </div>
        </div>
      </div>

      {/* Tag Management Dialog */}
      <TagManageDialog
        tag={editingTag}
        cardCount={editingTag ? tagCardCounts[editingTag.id] || 0 : 0}
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        onUpdate={handleUpdateTag}
        onDelete={handleDeleteTag}
      />
    </div>
  );
}
