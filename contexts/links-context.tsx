"use client";

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	type ReactNode,
} from "react";
import { useDB } from "./db-context";
import { syncService } from "@/lib/sync/sync-service";
import { generateUUID } from "@/lib/utils";
import type { Link, RelationType, Card } from "@/types/card";

interface LinksContextValue {
	links: Link[];
	isLoading: boolean;
	fetchLinks: () => Promise<void>;
	getLinksForCard: (cardId: string) => Promise<{ from: Link[]; to: Link[] }>;
	createLink: (
		sourceId: string,
		targetId: string,
		relation: RelationType,
		description?: string,
	) => Promise<Link>;
	deleteLink: (id: string) => Promise<void>;
	suggestRelatedCards: (
		cardTagIds: string[],
		excludeCardId?: string,
	) => Promise<Card[]>;
	setLinksFromCloud: (links: Link[]) => void;
}

const LinksContext = createContext<LinksContextValue | null>(null);

interface LinksProviderProps {
	children: ReactNode;
	isAuthenticated?: boolean;
	isOnline?: boolean;
}

export function LinksProvider({
	children,
	isAuthenticated = false,
	isOnline = true,
}: LinksProviderProps) {
	const { db } = useDB();
	const [links, setLinks] = useState<Link[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Helper to queue sync operation
	const queueSync = useCallback(
		(action: "create" | "delete", link: Link) => {
			if (isAuthenticated) {
				syncService.queueOperation("link", action, link.id, link);
				if (isOnline) {
					syncService.processQueue();
				}
			}
		},
		[isAuthenticated, isOnline],
	);

	const fetchLinks = useCallback(async () => {
		if (!db) return;
		setIsLoading(true);

		try {
			const result = await db.getAll("links");
			setLinks(result);
		} finally {
			setIsLoading(false);
		}
	}, [db]);

	// Subscribe to sync updates
	useEffect(() => {
		const unsubscribe = syncService.subscribeToDataUpdates((data) => {
			if (data.links && db) {
				// Refetch links from IndexedDB when sync completes
				fetchLinks();
			}
		});

		return unsubscribe;
	}, [db, fetchLinks]);

	// Initial load from IndexedDB when DB is ready
	useEffect(() => {
		if (db && links.length === 0) {
			fetchLinks();
		}
	}, [db, links.length, fetchLinks]);

	const getLinksForCard = useCallback(
		async (cardId: string) => {
			if (!db) return { from: [], to: [] };

			const [from, to] = await Promise.all([
				db.getAllFromIndex("links", "by-sourceId", cardId),
				db.getAllFromIndex("links", "by-targetId", cardId),
			]);

			return { from, to };
		},
		[db],
	);

	const createLink = useCallback(
		async (
			sourceId: string,
			targetId: string,
			relation: RelationType,
			description?: string,
		): Promise<Link> => {
			if (!db) throw new Error("Database not ready");

			// Check if link already exists
			const existingLinks = await db.getAllFromIndex(
				"links",
				"by-sourceId",
				sourceId,
			);
			const duplicate = existingLinks.find((l) => l.targetId === targetId);
			if (duplicate) {
				throw new Error("Link already exists");
			}

			const link: Link = {
				id: generateUUID(),
				sourceId,
				targetId,
				relation,
				description,
				createdAt: Date.now(),
			};

			// Save to IndexedDB first
			await db.put("links", link);
			setLinks((prev) => [...prev, link]);

			// Queue for cloud sync
			queueSync("create", link);

			return link;
		},
		[db, queueSync],
	);

	const deleteLink = useCallback(
		async (id: string) => {
			if (!db) throw new Error("Database not ready");

			const link = await db.get("links", id);
			if (!link) throw new Error("Link not found");

			await db.delete("links", id);
			setLinks((prev) => prev.filter((l) => l.id !== id));

			// Queue for cloud sync
			queueSync("delete", link);
		},
		[db, queueSync],
	);

	const suggestRelatedCards = useCallback(
		async (cardTagIds: string[], excludeCardId?: string): Promise<Card[]> => {
			if (!db || cardTagIds.length === 0) return [];

			const allPermanentCards = await db.getAllFromIndex(
				"cards",
				"by-type",
				"PERMANENT",
			);

			return allPermanentCards
				.filter((card) => card.id !== excludeCardId)
				.map((card) => ({
					...card,
					score: card.tagIds.filter((tagId) => cardTagIds.includes(tagId))
						.length,
				}))
				.filter((card) => card.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, 5);
		},
		[db],
	);

	// Update links from cloud sync
	const setLinksFromCloud = useCallback((cloudLinks: Link[]) => {
		setLinks(cloudLinks);
	}, []);

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
				setLinksFromCloud,
			}}
		>
			{children}
		</LinksContext.Provider>
	);
}

export function useLinks() {
	const context = useContext(LinksContext);
	if (!context) {
		throw new Error("useLinks must be used within a LinksProvider");
	}
	return context;
}
