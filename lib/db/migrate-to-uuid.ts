import type { IDBPDatabase } from "idb";
import type { NoteCardBoxDB } from "@/lib/db";
import { generateUUID } from "@/lib/utils";
import type { Card, Tag, Link } from "@/types/card";

const MIGRATION_KEY = "uuid-migration-completed";

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
	return localStorage.getItem(MIGRATION_KEY) === "true";
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
	localStorage.setItem(MIGRATION_KEY, "true");
}

/**
 * Migrate all data from nanoid format to UUID format
 */
export async function migrateToUUID(db: IDBPDatabase<NoteCardBoxDB>): Promise<{
	success: boolean;
	migratedTags: number;
	migratedCards: number;
	migratedLinks: number;
	error?: string;
}> {
	try {
		// Check if migration already completed
		if (isMigrationCompleted()) {
			console.log("UUID migration already completed");
			return {
				success: true,
				migratedTags: 0,
				migratedCards: 0,
				migratedLinks: 0,
			};
		}

		console.log("Starting UUID migration...");

		// Step 1: Migrate tags first (cards reference them)
		const tags = await db.getAll("tags");
		const tagIdMap = new Map<string, string>(); // old ID -> new UUID
		let migratedTagsCount = 0;

		for (const tag of tags) {
			if (!isValidUUID(tag.id)) {
				const newId = generateUUID();
				tagIdMap.set(tag.id, newId);

				// Delete old entry
				await db.delete("tags", tag.id);

				// Insert with new UUID
				const newTag: Tag = {
					...tag,
					id: newId,
				};
				await db.put("tags", newTag);

				migratedTagsCount++;
				console.log(`Migrated tag: ${tag.name} (${tag.id} -> ${newId})`);
			}
		}

		// Step 2: Migrate cards and update their tag references
		const cards = await db.getAll("cards");
		const cardIdMap = new Map<string, string>(); // old ID -> new UUID
		let migratedCardsCount = 0;

		for (const card of cards) {
			if (!isValidUUID(card.id)) {
				const newId = generateUUID();
				cardIdMap.set(card.id, newId);

				// Update tag IDs to new UUIDs
				const newTagIds = card.tagIds
					.map((tagId) => tagIdMap.get(tagId) || tagId)
					.filter((tagId) => isValidUUID(tagId));

				// Delete old entry
				await db.delete("cards", card.id);

				// Insert with new UUID
				const newCard: Card = {
					...card,
					id: newId,
					tagIds: newTagIds,
				};
				await db.put("cards", newCard);

				migratedCardsCount++;
				console.log(`Migrated card: ${card.title} (${card.id} -> ${newId})`);
			}
		}

		// Step 3: Migrate links and update their card references
		const links = await db.getAll("links");
		let migratedLinksCount = 0;

		for (const link of links) {
			const needsMigration =
				!isValidUUID(link.id) ||
				!isValidUUID(link.sourceId) ||
				!isValidUUID(link.targetId);

			if (needsMigration) {
				const newId = isValidUUID(link.id) ? link.id : generateUUID();
				const newSourceId = cardIdMap.get(link.sourceId) || link.sourceId;
				const newTargetId = cardIdMap.get(link.targetId) || link.targetId;

				// Only migrate if both cards exist with valid UUIDs
				if (isValidUUID(newSourceId) && isValidUUID(newTargetId)) {
					// Delete old entry
					await db.delete("links", link.id);

					// Insert with new UUIDs
					const newLink: Link = {
						...link,
						id: newId,
						sourceId: newSourceId,
						targetId: newTargetId,
					};
					await db.put("links", newLink);

					migratedLinksCount++;
					console.log(
						`Migrated link: ${link.id} -> ${newId} (${link.sourceId} -> ${newSourceId}, ${link.targetId} -> ${newTargetId})`,
					);
				} else {
					// Delete orphaned link
					await db.delete("links", link.id);
					console.log(
						`Deleted orphaned link: ${link.id} (source or target card not found)`,
					);
				}
			}
		}

		// Mark migration as completed
		markMigrationCompleted();

		console.log("UUID migration completed successfully");
		console.log(`- Tags migrated: ${migratedTagsCount}`);
		console.log(`- Cards migrated: ${migratedCardsCount}`);
		console.log(`- Links migrated: ${migratedLinksCount}`);

		return {
			success: true,
			migratedTags: migratedTagsCount,
			migratedCards: migratedCardsCount,
			migratedLinks: migratedLinksCount,
		};
	} catch (error) {
		console.error("UUID migration failed:", error);
		return {
			success: false,
			migratedTags: 0,
			migratedCards: 0,
			migratedLinks: 0,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Reset migration status (for testing purposes)
 */
export function resetMigrationStatus(): void {
	localStorage.removeItem(MIGRATION_KEY);
	console.log("Migration status reset");
}
