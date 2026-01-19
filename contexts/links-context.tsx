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
import type { Link, RelationType, Card } from '@/types/card';

interface LinksContextValue {
  links: Link[];
  isLoading: boolean;
  fetchLinks: () => Promise<void>;
  getLinksForCard: (cardId: string) => Promise<{ from: Link[]; to: Link[] }>;
  createLink: (
    sourceId: string,
    targetId: string,
    relation: RelationType,
    description?: string
  ) => Promise<Link>;
  deleteLink: (id: string) => Promise<void>;
  suggestRelatedCards: (cardTagIds: string[], excludeCardId?: string) => Promise<Card[]>;
}

const LinksContext = createContext<LinksContextValue | null>(null);

export function LinksProvider({ children }: { children: ReactNode }) {
  const { db } = useDB();
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);

    try {
      const result = await db.getAll('links');
      setLinks(result);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const getLinksForCard = useCallback(
    async (cardId: string) => {
      if (!db) return { from: [], to: [] };

      const [from, to] = await Promise.all([
        db.getAllFromIndex('links', 'by-sourceId', cardId),
        db.getAllFromIndex('links', 'by-targetId', cardId),
      ]);

      return { from, to };
    },
    [db]
  );

  const createLink = useCallback(
    async (
      sourceId: string,
      targetId: string,
      relation: RelationType,
      description?: string
    ): Promise<Link> => {
      if (!db) throw new Error('Database not ready');

      // Check if link already exists
      const existingLinks = await db.getAllFromIndex('links', 'by-sourceId', sourceId);
      const duplicate = existingLinks.find((l) => l.targetId === targetId);
      if (duplicate) {
        throw new Error('Link already exists');
      }

      const link: Link = {
        id: nanoid(),
        sourceId,
        targetId,
        relation,
        description,
        createdAt: Date.now(),
      };

      await db.put('links', link);
      setLinks((prev) => [...prev, link]);
      return link;
    },
    [db]
  );

  const deleteLink = useCallback(
    async (id: string) => {
      if (!db) throw new Error('Database not ready');

      await db.delete('links', id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    },
    [db]
  );

  const suggestRelatedCards = useCallback(
    async (cardTagIds: string[], excludeCardId?: string): Promise<Card[]> => {
      if (!db || cardTagIds.length === 0) return [];

      const allPermanentCards = await db.getAllFromIndex('cards', 'by-type', 'PERMANENT');

      return allPermanentCards
        .filter((card) => card.id !== excludeCardId)
        .map((card) => ({
          ...card,
          score: card.tagIds.filter((tagId) => cardTagIds.includes(tagId)).length,
        }))
        .filter((card) => card.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },
    [db]
  );

  return (
    <LinksContext.Provider
      value={{
        links,
        isLoading,
        fetchLinks,
        getLinksForCard,
        createLink,
        deleteLink,
        suggestRelatedCards,
      }}
    >
      {children}
    </LinksContext.Provider>
  );
}

export function useLinks() {
  const context = useContext(LinksContext);
  if (!context) {
    throw new Error('useLinks must be used within a LinksProvider');
  }
  return context;
}
