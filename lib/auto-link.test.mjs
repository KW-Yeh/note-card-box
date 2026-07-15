import assert from "node:assert/strict";
import test from "node:test";
import {
	AUTO_LINK_THRESHOLD,
	calculateCardSimilarity,
	findAutoLinkSuggestions,
} from "./auto-link.ts";

function createCard({ id, title, ...overrides }) {
	return {
		shareId: `share-${id}`,
		content: "",
		type: "PERMANENT",
		status: "ARCHIVED",
		isPublic: false,
		wordCount: 0,
		tagIds: [],
		createdAt: 1,
		updatedAt: 1,
		...overrides,
		id,
		title,
	};
}

test("shared tags meet the automatic-link threshold", () => {
	const left = createCard({ id: "left", title: "第一張", tagIds: ["react"] });
	const right = createCard({ id: "right", title: "第二張", tagIds: ["react"] });

	assert.ok(calculateCardSimilarity(left, right) >= AUTO_LINK_THRESHOLD);
	assert.equal(findAutoLinkSuggestions([left, right], []).length, 1);
});

test("similar Chinese titles are linked without tags", () => {
	const left = createCard({ id: "left", title: "React 效能最佳化" });
	const right = createCard({ id: "right", title: "React 效能最佳化實作" });

	assert.ok(calculateCardSimilarity(left, right) >= AUTO_LINK_THRESHOLD);
});

test("highly similar content is linked when titles and tags differ", () => {
	const left = createCard({
		id: "left",
		title: "前端筆記",
		content: "<p>使用 React memo 減少元件重複渲染並改善頁面效能</p>",
	});
	const right = createCard({
		id: "right",
		title: "效能研究",
		content: "React memo 可以減少元件重複渲染並改善頁面效能",
	});

	assert.ok(calculateCardSimilarity(left, right) >= AUTO_LINK_THRESHOLD);
});

test("an existing reverse link prevents a duplicate suggestion", () => {
	const left = createCard({ id: "left", title: "相同標題" });
	const right = createCard({ id: "right", title: "相同標題" });
	const existingLink = {
		id: "link",
		sourceId: right.id,
		targetId: left.id,
		relation: "EXTENSION",
		createdAt: 1,
	};

	assert.deepEqual(
		findAutoLinkSuggestions([left, right], [existingLink]),
		[],
	);
});

test("full scans return every qualifying pair without a top-N limit", () => {
	const cards = Array.from({ length: 4 }, (_, index) =>
		createCard({
			id: `card-${index}`,
			title: `卡片 ${index}`,
			tagIds: ["shared"],
			createdAt: index,
		}),
	);

	assert.equal(findAutoLinkSuggestions(cards, []).length, 6);
});
