import type { Card, Link } from "@/types/card";

export const AUTO_LINK_THRESHOLD = 0.35;

export interface AutoLinkSuggestion {
	sourceId: string;
	targetId: string;
	score: number;
}

const LATIN_STOP_WORDS = new Set([
	"and",
	"are",
	"for",
	"from",
	"that",
	"the",
	"this",
	"with",
]);

const HTML_TAG_PATTERN = /<[^>]*>/g;
const LATIN_WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const HAN_PATTERN = /\p{Script=Han}+/gu;

function normalizeText(value: string): string {
	return value
		.normalize("NFKC")
		.replace(HTML_TAG_PATTERN, " ")
		.replace(/&[a-zA-Z0-9#]+;/g, " ")
		.toLocaleLowerCase();
}

function tokenize(value: string): Set<string> {
	const normalized = normalizeText(value);
	const tokens = new Set<string>();

	for (const match of normalized.matchAll(LATIN_WORD_PATTERN)) {
		const word = match[0];
		if (/\p{Script=Han}/u.test(word)) continue;
		if (word.length >= 2 && !LATIN_STOP_WORDS.has(word)) tokens.add(word);
	}

	for (const match of normalized.matchAll(HAN_PATTERN)) {
		const phrase = match[0];
		if (phrase.length <= 2) {
			tokens.add(phrase);
			continue;
		}

		for (let index = 0; index < phrase.length - 1; index += 1) {
			tokens.add(phrase.slice(index, index + 2));
		}
		for (let index = 0; index < phrase.length - 2; index += 1) {
			tokens.add(phrase.slice(index, index + 3));
		}
	}

	return tokens;
}

function diceSimilarity(left: Set<string>, right: Set<string>): number {
	if (left.size === 0 || right.size === 0) return 0;

	let sharedCount = 0;
	for (const token of left) {
		if (right.has(token)) sharedCount += 1;
	}

	return (2 * sharedCount) / (left.size + right.size);
}

function hasSharedTag(left: Card, right: Card): boolean {
	if (left.tagIds.length === 0 || right.tagIds.length === 0) return false;
	const rightTagIds = new Set(right.tagIds);
	return left.tagIds.some((tagId) => rightTagIds.has(tagId));
}

export function calculateCardSimilarity(left: Card, right: Card): number {
	const leftTitleTokens = tokenize(left.title);
	const rightTitleTokens = tokenize(right.title);
	const leftContentTokens = tokenize(left.content);
	const rightContentTokens = tokenize(right.content);

	const tagScore = hasSharedTag(left, right) ? 1 : 0;
	const titleScore = diceSimilarity(leftTitleTokens, rightTitleTokens);
	const contentScore = diceSimilarity(leftContentTokens, rightContentTokens);
	const crossScore = Math.max(
		diceSimilarity(leftTitleTokens, rightContentTokens),
		diceSimilarity(rightTitleTokens, leftContentTokens),
	);

	const combinedScore =
		tagScore * 0.4 +
		titleScore * 0.45 +
		contentScore * 0.1 +
		crossScore * 0.05;

	return Math.max(combinedScore, contentScore * 0.4, crossScore * 0.4);
}

function pairKey(leftId: string, rightId: string): string {
	return [leftId, rightId].toSorted().join(":");
}

function createSuggestion(
	left: Card,
	right: Card,
	score: number,
	preferredSourceId?: string,
): AutoLinkSuggestion {
	if (preferredSourceId) {
		return {
			sourceId: preferredSourceId,
			targetId: preferredSourceId === left.id ? right.id : left.id,
			score,
		};
	}

	const source =
		left.createdAt > right.createdAt ||
		(left.createdAt === right.createdAt && left.id > right.id)
			? left
			: right;

	return {
		sourceId: source.id,
		targetId: source.id === left.id ? right.id : left.id,
		score,
	};
}

export function findAutoLinkSuggestions(
	cards: Card[],
	existingLinks: Link[],
	options: { cardId?: string; threshold?: number } = {},
): AutoLinkSuggestion[] {
	const threshold = options.threshold ?? AUTO_LINK_THRESHOLD;
	const existingPairs = new Set(
		existingLinks.map((link) => pairKey(link.sourceId, link.targetId)),
	);
	const suggestions: AutoLinkSuggestion[] = [];

	for (let leftIndex = 0; leftIndex < cards.length; leftIndex += 1) {
		const left = cards[leftIndex];
		for (let rightIndex = leftIndex + 1; rightIndex < cards.length; rightIndex += 1) {
			const right = cards[rightIndex];
			if (options.cardId && left.id !== options.cardId && right.id !== options.cardId) {
				continue;
			}
			if (existingPairs.has(pairKey(left.id, right.id))) continue;

			const score = calculateCardSimilarity(left, right);
			if (score < threshold) continue;

			suggestions.push(
				createSuggestion(left, right, score, options.cardId),
			);
		}
	}

	return suggestions.toSorted((left, right) => right.score - left.score);
}
