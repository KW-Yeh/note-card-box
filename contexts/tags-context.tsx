'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { nanoid } from 'nanoid';
import { useDB } from './db-context';
import type { Tag } from '@/types/card';
import { DEFAULT_TAG_COLORS } from '@/lib/constants';

interface TagsContextValue {
  tags: Tag[];
  isLoading: boolean;
  fetchTags: () => Promise<void>;
  getTag: (id: string) => Promise<Tag | undefined>;
  getTagByName: (name: string) => Promise<Tag | undefined>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  getOrCreateTag: (name: string) => Promise<Tag>;
  searchTags: (query: string) => Promise<Tag[]>;
}

const TagsContext = createContext<TagsContextValue | null>(null);

export function TagsProvider({ children }: { children: ReactNode }) {
  const { db } = useDB();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);

    try {
      const result = await db.getAll('tags');
      setTags(result.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const getTag = useCallback(
    async (id: string) => {
      if (!db) return undefined;
      return db.get('tags', id);
    },
    [db]
  );

  const getTagByName = useCallback(
    async (name: string) => {
      if (!db) return undefined;
      return db.getFromIndex('tags', 'by-name', name.toLowerCase());
    },
    [db]
  );

  const createTag = useCallback(
    async (name: string, color?: string): Promise<Tag> => {
      if (!db) throw new Error('Database not ready');

      const normalizedName = name.toLowerCase().trim();

      // Check if tag already exists
      const existing = await db.getFromIndex('tags', 'by-name', normalizedName);
      if (existing) {
        throw new Error('Tag already exists');
      }

      // Assign a random color if not provided
      const tagColor =
        color || DEFAULT_TAG_COLORS[Math.floor(Math.random() * DEFAULT_TAG_COLORS.length)];

      const tag: Tag = {
        id: nanoid(),
        name: normalizedName,
        color: tagColor,
        createdAt: Date.now(),
      };

      await db.put('tags', tag);
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      return tag;
    },
    [db]
  );

  const updateTag = useCallback(
    async (id: string, data: Partial<Tag>): Promise<Tag> => {
      if (!db) throw new Error('Database not ready');

      const existing = await db.get('tags', id);
      if (!existing) throw new Error('Tag not found');

      const updated: Tag = {
        ...existing,
        ...data,
        id: existing.id,
        createdAt: existing.createdAt,
        name: data.name ? data.name.toLowerCase().trim() : existing.name,
      };

      await db.put('tags', updated);
      setTags((prev) =>
        prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return updated;
    },
    [db]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      if (!db) throw new Error('Database not ready');

      await db.delete('tags', id);
      setTags((prev) => prev.filter((t) => t.id !== id));

      // Note: Cards that reference this tag will need to be updated
      // This is handled by the caller
    },
    [db]
  );

  const getOrCreateTag = useCallback(
    async (name: string): Promise<Tag> => {
      if (!db) throw new Error('Database not ready');

      const normalizedName = name.toLowerCase().trim();
      const existing = await db.getFromIndex('tags', 'by-name', normalizedName);

      if (existing) return existing;

      return createTag(normalizedName);
    },
    [db, createTag]
  );

  const searchTags = useCallback(
    async (query: string): Promise<Tag[]> => {
      if (!db) return [];

      const allTags = await db.getAll('tags');
      const lowerQuery = query.toLowerCase();

      return allTags
        .filter((tag) => tag.name.includes(lowerQuery))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [db]
  );

  return (
    <TagsContext.Provider
      value={{
        tags,
        isLoading,
        fetchTags,
        getTag,
        getTagByName,
        createTag,
        updateTag,
        deleteTag,
        getOrCreateTag,
        searchTags,
      }}
    >
      {children}
    </TagsContext.Provider>
  );
}

export function useTags() {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error('useTags must be used within a TagsProvider');
  }
  return context;
}
