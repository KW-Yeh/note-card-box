import assert from "node:assert/strict";
import test from "node:test";
import {
	createClusteredLayout,
	findConnectedComponents,
} from "./graph-layout.ts";

test("finds bidirectional connected components and isolated cards", () => {
	const components = findConnectedComponents(
		["d", "c", "b", "a", "e"],
		[
			{ sourceId: "a", targetId: "b" },
			{ sourceId: "c", targetId: "b" },
			{ sourceId: "missing", targetId: "d" },
		],
	);

	assert.deepEqual(components, [["a", "b", "c"], ["d"], ["e"]]);
});

test("creates a position for every card", () => {
	const positions = createClusteredLayout(
		["a", "b", "c", "d"],
		[
			{ sourceId: "a", targetId: "b" },
			{ sourceId: "b", targetId: "c" },
		],
	);

	assert.deepEqual(Object.keys(positions).sort(), ["a", "b", "c", "d"]);
	for (const position of Object.values(positions)) {
		assert.equal(Number.isFinite(position.x), true);
		assert.equal(Number.isFinite(position.y), true);
	}
});

test("keeps separate clusters from occupying the same bounds", () => {
	const positions = createClusteredLayout(
		["a", "b", "c", "d"],
		[
			{ sourceId: "a", targetId: "b" },
			{ sourceId: "c", targetId: "d" },
		],
		{ nodeWidth: 200, nodeHeight: 84, clusterGap: 220 },
	);
	const firstClusterMaximumX = Math.max(positions.a.x, positions.b.x) + 200;
	const secondClusterMinimumX = Math.min(positions.c.x, positions.d.x);

	assert.ok(secondClusterMinimumX - firstClusterMaximumX >= 220);
});

test("keeps directly linked cards closer than cards in other clusters", () => {
	const positions = createClusteredLayout(
		["a", "b", "c", "d", "e", "f"],
		[
			{ sourceId: "a", targetId: "b" },
			{ sourceId: "b", targetId: "c" },
			{ sourceId: "d", targetId: "e" },
		],
	);
	const getDistance = (leftId, rightId) =>
		Math.hypot(
			positions[rightId].x - positions[leftId].x,
			positions[rightId].y - positions[leftId].y,
		);
	const linkedDistances = [
		getDistance("a", "b"),
		getDistance("b", "c"),
		getDistance("d", "e"),
	];
	const crossClusterDistances = ["a", "b", "c"].flatMap((leftId) =>
		["d", "e", "f"].map((rightId) => getDistance(leftId, rightId)),
	);

	assert.ok(Math.max(...linkedDistances) < Math.min(...crossClusterDistances));
});

test("produces a stable layout for the same topology", () => {
	const nodeIds = ["c", "a", "d", "b"];
	const links = [
		{ sourceId: "a", targetId: "b" },
		{ sourceId: "b", targetId: "c" },
		{ sourceId: "c", targetId: "d" },
	];

	assert.deepEqual(
		createClusteredLayout(nodeIds, links),
		createClusteredLayout([...nodeIds].reverse(), [...links].reverse()),
	);
});

test("returns an empty layout when there are no cards", () => {
	assert.deepEqual(createClusteredLayout([], []), {});
});
