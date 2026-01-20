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
import type { Tag } from "@/types/card";
import { DEFAULT_TAG_COLORS } from "@/lib/constants";

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
	setTagsFromCloud: (tags: Tag[]) => void;
}

const TagsContext = createContext<TagsContextValue | null>(null);

interface TagsProviderProps {
	children: ReactNode;
	isAuthenticated?: boolean;
	isOnline?: boolean;
}

export function TagsProvider({
	children,
	isAuthenticated = false,
	isOnline = true,
}: TagsProviderProps) {
	const { db } = useDB();
	const [tags, setTags] = useState<Tag[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Helper to queue sync operation
	const queueSync = useCallback(
		(action: "create" | "update" | "delete", tag: Tag) => {
			if (isAuthenticated) {
				syncService.queueOperation("tag", action, tag.id, tag);
				if (isOnline) {
					syncService.processQueue();
				}
			}
		},
		[isAuthenticated, isOnline],
	);

	const fetchTags = useCallback(async () => {
		if (!db) return;
		setIsLoading(true);

		try {
			const result = await db.getAll("tags");
			const sorted = result.toSorted((a, b) => a.name.localeCompare(b.name));
			setTags(sorted);
		} finally {
			setIsLoading(false);
		}
	}, [db]);

	// Subscribe to sync updates
	useEffect(() => {
		const unsubscribe = syncService.subscribeToDataUpdates((data) => {
			if (data.tags && db) {
				// Refetch tags from IndexedDB when sync completes
				fetchTags();
			}
		});

		return unsubscribe;
	}, [db, fetchTags]);

	// Initial load from IndexedDB when DB is ready
	useEffect(() => {
		if (db && tags.length === 0) {
			fetchTags();
		}
	}, [db, tags.length, fetchTags]);
	const getTag = useCallback(
		async (id: string) => {
			if (!db) return undefined;
			return db.get("tags", id);
		},
		[db],
	);

	const getTagByName = useCallback(
		async (name: string) => {
			if (!db) return undefined;
			return db.getFromIndex("tags", "by-name", name.toLowerCase());
		},
		[db],
	);

	const createTag = useCallback(
		async (name: string, color?: string): Promise<Tag> => {
			if (!db) throw new Error("Database not ready");

			const normalizedName = name.toLowerCase().trim();

			// Check if tag already exists
			const existing = await db.getFromIndex("tags", "by-name", normalizedName);
			if (existing) {
				throw new Error("Tag already exists");
			}

			// Assign a random color if not provided
			const tagColor =
				color ||
				DEFAULT_TAG_COLORS[
					Math.floor(Math.random() * DEFAULT_TAG_COLORS.length)
				];

			const tag: Tag = {
				id: generateUUID(),
				name: normalizedName,
				color: tagColor,
				createdAt: Date.now(),
			};

			// Save to IndexedDB first
			await db.put("tags", tag);
			setTags((prev) =>
				[...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
			);

			// Queue for cloud sync
			queueSync("create", tag);

			return tag;
		},
		[db, queueSync],
	);

	const updateTag = useCallback(
		async (id: string, data: Partial<Tag>): Promise<Tag> => {
			if (!db) throw new Error("Database not ready");

			const existing = await db.get("tags", id);
			if (!existing) throw new Error("Tag not found");

			const updated: Tag = {
				...existing,
				...data,
				id: existing.id,
				createdAt: existing.createdAt,
				name: data.name ? data.name.toLowerCase().trim() : existing.name,
			};

			await db.put("tags", updated);
			setTags((prev) =>
				prev
					.map((t) => (t.id === id ? updated : t))
					.sort((a, b) => a.name.localeCompare(b.name)),
			);

			// Queue for cloud sync
			queueSync("update", updated);

			return updated;
		},
		[db, queueSync],
	);

	const deleteTag = useCallback(
		async (id: string) => {
			if (!db) throw new Error("Database not ready");

			const tag = await db.get("tags", id);
			if (!tag) throw new Error("Tag not found");

			await db.delete("tags", id);
			setTags((prev) => prev.filter((t) => t.id !== id));

			// Queue for cloud sync
			queueSync("delete", tag);

			// Note: Cards that reference this tag will need to be updated
			// This is handled by the caller
		},
		[db, queueSync],
	);

	const getOrCreateTag = useCallback(
		async (name: string): Promise<Tag> => {
			if (!db) throw new Error("Database not ready");

			const normalizedName = name.toLowerCase().trim();
			const existing = await db.getFromIndex("tags", "by-name", normalizedName);

			if (existing) return existing;

			return createTag(normalizedName);
		},
		[db, createTag],
	);

	const searchTags = useCallback(
		async (query: string): Promise<Tag[]> => {
			if (!db) return [];

			const allTags = await db.getAll("tags");
			const lowerQuery = query.toLowerCase();

			return allTags
				.filter((tag) => tag.name.includes(lowerQuery))
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		[db],
	);

	// Update tags from cloud sync
	const setTagsFromCloud = useCallback((cloudTags: Tag[]) => {
		const sorted = cloudTags.toSorted((a, b) => a.name.localeCompare(b.name));
		setTags(sorted);
	}, []);

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
				setTagsFromCloud,
			}}
		>
			{children}
		</TagsContext.Provider>
	);
}

export function useTags() {
	const context = useContext(TagsContext);
	if (!context) {
		throw new Error("useTags must be used within a TagsProvider");
	}
	return context;
}
