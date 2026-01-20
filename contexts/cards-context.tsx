"use client";

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import { useDB } from "./db-context";
import { syncService } from "@/lib/sync/sync-service";
import { generateUUID } from "@/lib/utils";
import type { Card, CardType, CardStatus } from "@/types/card";

interface CardFilters {
	type?: CardType;
	status?: CardStatus;
	tagIds?: string[];
}

interface CardsContextValue {
	cards: Card[];
	isLoading: boolean;
	fetchCards: (filters?: CardFilters) => Promise<void>;
	getCard: (id: string) => Promise<Card | undefined>;
	getCardByShareId: (shareId: string) => Promise<Card | undefined>;
	createCard: (
		data: Omit<Card, "id" | "shareId" | "createdAt" | "updatedAt">,
	) => Promise<Card>;
	updateCard: (id: string, data: Partial<Card>) => Promise<Card>;
	deleteCard: (id: string) => Promise<void>;
	promoteCard: (id: string) => Promise<Card>;
	searchCards: (query: string) => Promise<Card[]>;
	setCardsFromCloud: (cards: Card[]) => void;
}

const CardsContext = createContext<CardsContextValue | null>(null);

interface CardsProviderProps {
	children: ReactNode;
	isAuthenticated?: boolean;
	isOnline?: boolean;
}

export function CardsProvider({
	children,
	isAuthenticated = false,
	isOnline = true,
}: CardsProviderProps) {
	const { db } = useDB();
	const [cards, setCards] = useState<Card[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Helper to queue sync operation
	const queueSync = useCallback(
		(action: "create" | "update" | "delete", card: Card) => {
			if (isAuthenticated) {
				syncService.queueOperation("card", action, card.id, card);
				if (isOnline) {
					syncService.processQueue();
				}
			}
		},
		[isAuthenticated, isOnline],
	);

	const fetchCards = useCallback(
		async (filters?: CardFilters) => {
			if (!db) return;
			setIsLoading(true);

			try {
				let result: Card[];

				if (filters?.type) {
					result = await db.getAllFromIndex("cards", "by-type", filters.type);
				} else if (filters?.status) {
					result = await db.getAllFromIndex(
						"cards",
						"by-status",
						filters.status,
					);
				} else {
					result = await db.getAll("cards");
				}

				// Filter by tags if specified
				if (filters?.tagIds && filters.tagIds.length > 0) {
					result = result.filter((card) =>
						filters.tagIds!.every((tagId) => card.tagIds.includes(tagId)),
					);
				}

				const sorted = result.toSorted((a, b) => b.updatedAt - a.updatedAt);
				setCards(sorted);
			} finally {
				setIsLoading(false);
			}
		},
		[db],
	);

	// Subscribe to sync updates
	useEffect(() => {
		const unsubscribe = syncService.subscribeToDataUpdates((data) => {
			if (data.cards && db) {
				// Refetch cards from IndexedDB when sync completes
				fetchCards();
			}
		});

		return unsubscribe;
	}, [db, fetchCards]);

	// Initial load from IndexedDB when DB is ready
	useEffect(() => {
		if (db && cards.length === 0) {
			fetchCards();
		}
	}, [db, cards.length, fetchCards]);

	const getCard = useCallback(
		async (id: string) => {
			if (!db) return undefined;
			return db.get("cards", id);
		},
		[db],
	);

	const getCardByShareId = useCallback(
		async (shareId: string) => {
			if (!db) return undefined;
			return db.getFromIndex("cards", "by-shareId", shareId);
		},
		[db],
	);

	const createCard = useCallback(
		async (
			data: Omit<Card, "id" | "shareId" | "createdAt" | "updatedAt">,
		): Promise<Card> => {
			if (!db) throw new Error("Database not ready");

			const now = Date.now();
			const card: Card = {
				...data,
				id: generateUUID(),
				shareId: nanoid(10),
				createdAt: now,
				updatedAt: now,
			};

			// Save to IndexedDB first (local-first)
			await db.put("cards", card);
			setCards((prev) => [card, ...prev]);

			// Queue for cloud sync
			queueSync("create", card);

			return card;
		},
		[db, queueSync],
	);

	const updateCard = useCallback(
		async (id: string, data: Partial<Card>): Promise<Card> => {
			if (!db) throw new Error("Database not ready");

			const existing = await db.get("cards", id);
			if (!existing) throw new Error("Card not found");

			const updated: Card = {
				...existing,
				...data,
				id: existing.id,
				shareId: existing.shareId,
				createdAt: existing.createdAt,
				updatedAt: Date.now(),
			};

			// Save to IndexedDB first
			await db.put("cards", updated);
			setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));

			// Queue for cloud sync
			queueSync("update", updated);

			return updated;
		},
		[db, queueSync],
	);

	const deleteCard = useCallback(
		async (id: string) => {
			if (!db) throw new Error("Database not ready");

			const card = await db.get("cards", id);
			if (!card) throw new Error("Card not found");

			// Delete associated links
			const linksFrom = await db.getAllFromIndex("links", "by-sourceId", id);
			const linksTo = await db.getAllFromIndex("links", "by-targetId", id);

			const tx = db.transaction(["cards", "links"], "readwrite");
			await Promise.all([
				tx.objectStore("cards").delete(id),
				...linksFrom.map((link) => tx.objectStore("links").delete(link.id)),
				...linksTo.map((link) => tx.objectStore("links").delete(link.id)),
			]);
			await tx.done;

			setCards((prev) => prev.filter((c) => c.id !== id));

			// Queue for cloud sync
			queueSync("delete", card);

			// Also queue link deletions
			for (const link of [...linksFrom, ...linksTo]) {
				if (isAuthenticated) {
					syncService.queueOperation("link", "delete", link.id, link);
				}
			}
		},
		[db, queueSync, isAuthenticated],
	);

	const promoteCard = useCallback(
		async (id: string): Promise<Card> => {
			if (!db) throw new Error("Database not ready");

			const card = await db.get("cards", id);
			if (!card) throw new Error("Card not found");

			if (card.type === "PERMANENT") {
				throw new Error("This card is already permanent");
			}

			// Check if card has any links
			const linksFrom = await db.getAllFromIndex("links", "by-sourceId", id);
			const linksTo = await db.getAllFromIndex("links", "by-targetId", id);

			if (linksFrom.length + linksTo.length === 0) {
				throw new Error("請先建立與現有知識的聯繫（延伸或對立），再進行歸納。");
			}

			const promoted: Card = {
				...card,
				type: "PERMANENT",
				status: "ARCHIVED",
				promotedAt: Date.now(),
				updatedAt: Date.now(),
			};

			await db.put("cards", promoted);
			setCards((prev) => prev.map((c) => (c.id === id ? promoted : c)));

			// Queue for cloud sync
			queueSync("update", promoted);

			return promoted;
		},
		[db, queueSync],
	);

	const searchCards = useCallback(
		async (query: string): Promise<Card[]> => {
			if (!db) return [];

			const allCards = await db.getAll("cards");
			const lowerQuery = query.toLowerCase();

			return allCards
				.filter((card) => card.title.toLowerCase().includes(lowerQuery))
				.sort((a, b) => b.updatedAt - a.updatedAt);
		},
		[db],
	);

	// Update cards from cloud sync
	const setCardsFromCloud = useCallback((cloudCards: Card[]) => {
		const sorted = cloudCards.toSorted((a, b) => b.updatedAt - a.updatedAt);
		setCards(sorted);
	}, []);

	return (
		<CardsContext.Provider
			value={{
				cards,
				isLoading,
				fetchCards,
				getCard,
				getCardByShareId,
				createCard,
				updateCard,
				deleteCard,
				promoteCard,
				searchCards,
				setCardsFromCloud,
			}}
		>
			{children}
		</CardsContext.Provider>
	);
}

export function useCards() {
	const context = useContext(CardsContext);
	if (!context) {
		throw new Error("useCards must be used within a CardsProvider");
	}
	return context;
}
