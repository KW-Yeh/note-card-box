import type { Card, Tag, Link } from "@/types/card";
import type { IDBPDatabase } from "idb";
import type { NoteCardBoxDB } from "@/lib/db";

type EntityType = "card" | "tag" | "link";
type ActionType = "create" | "update" | "delete";

export interface SyncQueueItem {
	id: string;
	entity: EntityType;
	action: ActionType;
	entityId: string;
	data?: Card | Tag | Link;
	timestamp: number;
	retries: number;
}

export interface SyncStatus {
	isSyncing: boolean;
	lastSyncAt: number | null;
	pendingCount: number;
	error: string | null;
}

export interface SyncDataUpdate {
	cards?: Card[];
	tags?: Tag[];
	links?: Link[];
}

const SYNC_QUEUE_KEY = "sync-queue";
const LAST_SYNC_KEY = "last-sync-timestamp";
const MAX_RETRIES = 3;

export class SyncService {
	private db: IDBPDatabase<NoteCardBoxDB> | null = null;
	private isSyncing = false;
	private readonly syncListeners: Set<(status: SyncStatus) => void> = new Set();
	private readonly dataUpdateListeners: Set<(data: SyncDataUpdate) => void> =
		new Set();

	setDB(db: IDBPDatabase<NoteCardBoxDB>) {
		this.db = db;
	}

	// Subscribe to sync status changes
	subscribe(listener: (status: SyncStatus) => void): () => void {
		this.syncListeners.add(listener);
		return () => this.syncListeners.delete(listener);
	}

	// Subscribe to data updates after sync
	subscribeToDataUpdates(listener: (data: SyncDataUpdate) => void): () => void {
		this.dataUpdateListeners.add(listener);
		return () => this.dataUpdateListeners.delete(listener);
	}

	private notifyListeners() {
		const status = this.getStatus();
		for (const listener of this.syncListeners) {
			listener(status);
		}
	}

	private notifyDataUpdate(data: SyncDataUpdate) {
		for (const listener of this.dataUpdateListeners) {
			listener(data);
		}
	}

	getStatus(): SyncStatus {
		const queue = this.getQueue();
		const lastSync = localStorage.getItem(LAST_SYNC_KEY);
		return {
			isSyncing: this.isSyncing,
			lastSyncAt: lastSync ? Number.parseInt(lastSync) : null,
			pendingCount: queue.length,
			error: null,
		};
	}

	// Get sync queue from localStorage
	private getQueue(): SyncQueueItem[] {
		try {
			const stored = localStorage.getItem(SYNC_QUEUE_KEY);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	}

	// Save sync queue to localStorage
	private saveQueue(queue: SyncQueueItem[]) {
		localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
		this.notifyListeners();
	}

	// Add operation to sync queue (for offline support)
	queueOperation(
		entity: EntityType,
		action: ActionType,
		entityId: string,
		data?: Card | Tag | Link,
	) {
		const queue = this.getQueue();

		// Remove any existing operation for the same entity
		const filteredQueue = queue.filter(
			(item) => !(item.entity === entity && item.entityId === entityId),
		);

		// If deleting, we don't need to keep any previous creates/updates
		// If creating/updating after a delete, we just add the new operation
		const newItem: SyncQueueItem = {
			id: `${entity}-${entityId}-${Date.now()}`,
			entity,
			action,
			entityId,
			data,
			timestamp: Date.now(),
			retries: 0,
		};

		filteredQueue.push(newItem);
		this.saveQueue(filteredQueue);
	}

	// Process all queued operations
	async processQueue(): Promise<void> {
		if (this.isSyncing) return;

		const queue = this.getQueue();
		if (queue.length === 0) return;

		this.isSyncing = true;
		this.notifyListeners();

		const failedItems: SyncQueueItem[] = [];

		for (const item of queue) {
			try {
				await this.syncItem(item);
			} catch (error) {
				console.error(
					`Sync failed for ${item.entity}/${item.entityId}:`,
					error,
				);
				if (item.retries < MAX_RETRIES) {
					failedItems.push({ ...item, retries: item.retries + 1 });
				}
				// Items that exceeded max retries are dropped
			}
		}

		this.saveQueue(failedItems);
		this.isSyncing = false;
		this.notifyListeners();
	}

	private async syncItem(item: SyncQueueItem): Promise<void> {
		const { entity, action, entityId, data } = item;

		let endpoint: string;
		let method: string;
		let body: string | undefined;

		switch (action) {
			case "create":
			case "update":
				endpoint =
					action === "create"
						? `/api/${entity}s`
						: `/api/${entity}s/${entityId}`;
				method = action === "create" ? "POST" : "PUT";
				body = JSON.stringify(data);
				break;
			case "delete":
				endpoint = `/api/${entity}s/${entityId}`;
				method = "DELETE";
				break;
		}

		const response = await fetch(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body,
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${await response.text()}`);
		}
	}

	// Pull data from cloud and merge with local
	async pullFromCloud(forceFullPull = false): Promise<{
		cards: Card[];
		tags: Tag[];
		links: Link[];
	}> {
		const lastSync = localStorage.getItem(LAST_SYNC_KEY);
		const since = forceFullPull ? "" : (lastSync || "");

		const cardsUrl = since ? `/api/cards?since=${since}` : "/api/cards";
		const tagsUrl = since ? `/api/tags?since=${since}` : "/api/tags";
		const linksUrl = since ? `/api/links?since=${since}` : "/api/links";

		const [cardsRes, tagsRes, linksRes] = await Promise.all([
			fetch(cardsUrl, { cache: "no-store" }),
			fetch(tagsUrl, { cache: "no-store" }),
			fetch(linksUrl, { cache: "no-store" }),
		]);

		if (!cardsRes.ok || !tagsRes.ok || !linksRes.ok) {
			throw new Error("Failed to fetch from cloud");
		}

		const [cards, tags, links] = await Promise.all([
			cardsRes.json() as Promise<Card[]>,
			tagsRes.json() as Promise<Tag[]>,
			linksRes.json() as Promise<Link[]>,
		]);

		return { cards, tags, links };
	}

	// Merge cloud data into IndexedDB and return items that need to be pushed to cloud
	async mergeCloudData(cloudData: {
		cards: Card[];
		tags: Tag[];
		links: Link[];
	}, forceNotify = false): Promise<{
		localOnlyCards: Card[];
		localOnlyTags: Tag[];
		localOnlyLinks: Link[];
	}> {
		if (!this.db) throw new Error("Database not initialized");

		const { cards, tags, links } = cloudData;

		// Get all local data
		const [localCards, localTags, localLinks] = await Promise.all([
			this.db.getAll("cards"),
			this.db.getAll("tags"),
			this.db.getAll("links"),
		]);

		// Create maps for quick lookup
		const cloudCardIds = new Set(cards.map((c) => c.id));
		const cloudTagIds = new Set(tags.map((t) => t.id));
		const cloudLinkIds = new Set(links.map((l) => l.id));

		// Find local-only items (exist in IndexedDB but not in cloud)
		const localOnlyCards = localCards.filter((c) => !cloudCardIds.has(c.id));
		const localOnlyTags = localTags.filter((t) => !cloudTagIds.has(t.id));
		const localOnlyLinks = localLinks.filter((l) => !cloudLinkIds.has(l.id));

		// Merge tags first (cards reference them)
		for (const tag of tags) {
			const local = await this.db.get("tags", tag.id);
			if (!local || tag.createdAt > local.createdAt) {
				await this.db.put("tags", tag);
			}
		}

		// Merge cards
		for (const card of cards) {
			const local = await this.db.get("cards", card.id);
			if (!local || card.updatedAt > local.updatedAt) {
				await this.db.put("cards", card);
			}
		}

		// Merge links
		for (const link of links) {
			const local = await this.db.get("links", link.id);
			if (!local || link.createdAt > local.createdAt) {
				await this.db.put("links", link);
			}
		}

		// Update last sync timestamp
		localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
		this.notifyListeners();

		// Notify listeners about data updates
		// When forceNotify is true, always notify even if no new data (to trigger UI refresh)
		this.notifyDataUpdate({
			cards: cards.length > 0 || forceNotify ? cards : undefined,
			tags: tags.length > 0 || forceNotify ? tags : undefined,
			links: links.length > 0 || forceNotify ? links : undefined,
		});

		return { localOnlyCards, localOnlyTags, localOnlyLinks };
	}

	// Helper to push items in batch to cloud
	private async pushBatchToCloud<T extends Card | Tag | Link>(
		entity: EntityType,
		items: T[],
	): Promise<void> {
		if (items.length === 0) return;

		try {
			const response = await fetch(`/api/${entity}s/batch`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(items),
			});

			if (!response.ok) {
				throw new Error(`Failed to batch push ${entity}s: ${response.status}`);
			}
		} catch (error) {
			console.error(`Error batch pushing ${entity}s:`, error);
			// Queue individual items for retry
			for (const item of items) {
				this.queueOperation(entity, "create", item.id, item);
			}
		}
	}

	// Push local-only items to cloud using batch endpoints
	async pushLocalOnlyItems(
		localOnlyCards: Card[],
		localOnlyTags: Tag[],
		localOnlyLinks: Link[],
	): Promise<void> {
		// Push tags first (cards reference them)
		await this.pushBatchToCloud("tag", localOnlyTags);

		// Push cards
		await this.pushBatchToCloud("card", localOnlyCards);

		// Push links
		await this.pushBatchToCloud("link", localOnlyLinks);
	}

	// Full sync: push pending changes, then pull from cloud
	async fullSync(forceFullPull = false): Promise<{
		cards: Card[];
		tags: Tag[];
		links: Link[];
	}> {
		// First, push any pending local changes
		await this.processQueue();

		// Then pull from cloud
		const cloudData = await this.pullFromCloud(forceFullPull);

		// Merge cloud data into IndexedDB and detect local-only items
		const { localOnlyCards, localOnlyTags, localOnlyLinks } =
			await this.mergeCloudData(cloudData, forceFullPull);

		// Push local-only items to cloud (items that exist locally but not in cloud)
		if (
			localOnlyCards.length > 0 ||
			localOnlyTags.length > 0 ||
			localOnlyLinks.length > 0
		) {
			await this.pushLocalOnlyItems(
				localOnlyCards,
				localOnlyTags,
				localOnlyLinks,
			);
		}

		return cloudData;
	}

	// Push all local data to cloud (for first-time sync after login)
	async pushAllToCloud(): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		const [cards, tags, links] = await Promise.all([
			this.db.getAll("cards"),
			this.db.getAll("tags"),
			this.db.getAll("links"),
		]);

		// Push tags first (cards reference them)
		await this.pushBatchToCloud("tag", tags);

		// Push cards
		await this.pushBatchToCloud("card", cards);

		// Push links
		await this.pushBatchToCloud("link", links);

		localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
		this.notifyListeners();
	}

	// Clear sync state (on logout)
	clearSyncState() {
		localStorage.removeItem(SYNC_QUEUE_KEY);
		localStorage.removeItem(LAST_SYNC_KEY);
		this.notifyListeners();
	}
}

// Singleton instance
export const syncService = new SyncService();
