export interface GraphLayoutLink {
	sourceId: string;
	targetId: string;
}

export interface GraphPosition {
	x: number;
	y: number;
}

export interface GraphLayoutOptions {
	nodeWidth?: number;
	nodeHeight?: number;
	nodeGap?: number;
	clusterGap?: number;
}

interface SimulationNode extends GraphPosition {
	id: string;
	velocityX: number;
	velocityY: number;
}

interface ComponentLayout {
	positions: Record<string, GraphPosition>;
	width: number;
	height: number;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 84;
const DEFAULT_NODE_GAP = 56;
const DEFAULT_CLUSTER_GAP = 360;
const LINK_DISTANCE = 250;
const SIMULATION_ITERATIONS = 180;

export function findConnectedComponents(
	nodeIds: string[],
	links: GraphLayoutLink[],
): string[][] {
	const uniqueNodeIds = [...new Set(nodeIds)].sort();
	const nodeIdSet = new Set(uniqueNodeIds);
	const adjacency = new Map(
		uniqueNodeIds.map((nodeId) => [nodeId, new Set<string>()]),
	);

	for (const link of links) {
		if (
			link.sourceId === link.targetId ||
			!nodeIdSet.has(link.sourceId) ||
			!nodeIdSet.has(link.targetId)
		) {
			continue;
		}

		adjacency.get(link.sourceId)?.add(link.targetId);
		adjacency.get(link.targetId)?.add(link.sourceId);
	}

	const visited = new Set<string>();
	const components: string[][] = [];

	for (const nodeId of uniqueNodeIds) {
		if (visited.has(nodeId)) continue;

		const component: string[] = [];
		const queue = [nodeId];
		visited.add(nodeId);

		for (let index = 0; index < queue.length; index += 1) {
			const currentId = queue[index];
			component.push(currentId);

			for (const neighborId of adjacency.get(currentId) ?? []) {
				if (visited.has(neighborId)) continue;
				visited.add(neighborId);
				queue.push(neighborId);
			}
		}

		components.push(component.sort());
	}

	return components.sort(
		(left, right) => right.length - left.length || left[0].localeCompare(right[0]),
	);
}

function limit(value: number, maximum: number): number {
	return Math.max(-maximum, Math.min(maximum, value));
}

function layoutComponent(
	nodeIds: string[],
	links: GraphLayoutLink[],
	nodeWidth: number,
	nodeHeight: number,
	nodeGap: number,
): ComponentLayout {
	if (nodeIds.length === 1) {
		return {
			positions: { [nodeIds[0]]: { x: 0, y: 0 } },
			width: nodeWidth,
			height: nodeHeight,
		};
	}

	const componentIds = new Set(nodeIds);
	const componentLinks = links.filter(
		(link) =>
			componentIds.has(link.sourceId) && componentIds.has(link.targetId),
	);
	const radius = Math.max(160, nodeIds.length * 42);
	const nodes = nodeIds.map<SimulationNode>((id, index) => {
		const angle = (index / nodeIds.length) * Math.PI * 2 - Math.PI / 2;
		return {
			id,
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
			velocityX: 0,
			velocityY: 0,
		};
	});
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const minimumDistance = Math.hypot(nodeWidth, nodeHeight) + nodeGap;

	for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration += 1) {
		for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < nodes.length;
				rightIndex += 1
			) {
				const left = nodes[leftIndex];
				const right = nodes[rightIndex];
				let deltaX = right.x - left.x;
				let deltaY = right.y - left.y;
				let distance = Math.hypot(deltaX, deltaY);

				if (distance < 0.01) {
					deltaX = rightIndex % 2 === 0 ? 1 : -1;
					deltaY = leftIndex % 2 === 0 ? 1 : -1;
					distance = Math.SQRT2;
				}

				const directionX = deltaX / distance;
				const directionY = deltaY / distance;
				const repulsion = Math.min(12, 24000 / (distance * distance));
				const collision =
					distance < minimumDistance
						? (minimumDistance - distance) * 0.08
						: 0;
				const force = repulsion + collision;

				left.velocityX -= directionX * force;
				left.velocityY -= directionY * force;
				right.velocityX += directionX * force;
				right.velocityY += directionY * force;
			}
		}

		for (const link of componentLinks) {
			const source = nodesById.get(link.sourceId);
			const target = nodesById.get(link.targetId);
			if (!source || !target) continue;

			const deltaX = target.x - source.x;
			const deltaY = target.y - source.y;
			const distance = Math.max(Math.hypot(deltaX, deltaY), 0.01);
			const spring = (distance - LINK_DISTANCE) * 0.025;
			const forceX = (deltaX / distance) * spring;
			const forceY = (deltaY / distance) * spring;

			source.velocityX += forceX;
			source.velocityY += forceY;
			target.velocityX -= forceX;
			target.velocityY -= forceY;
		}

		for (const node of nodes) {
			node.velocityX += -node.x * 0.0025;
			node.velocityY += -node.y * 0.0025;
			node.velocityX = limit(node.velocityX * 0.78, 18);
			node.velocityY = limit(node.velocityY * 0.78, 18);
			node.x += node.velocityX;
			node.y += node.velocityY;
		}
	}

	const minimumX = Math.min(...nodes.map((node) => node.x - nodeWidth / 2));
	const minimumY = Math.min(...nodes.map((node) => node.y - nodeHeight / 2));
	const maximumX = Math.max(...nodes.map((node) => node.x + nodeWidth / 2));
	const maximumY = Math.max(...nodes.map((node) => node.y + nodeHeight / 2));
	const positions = Object.fromEntries(
		nodes.map((node) => [
			node.id,
			{
				x: Math.round(node.x - nodeWidth / 2 - minimumX),
				y: Math.round(node.y - nodeHeight / 2 - minimumY),
			},
		]),
	);

	return {
		positions,
		width: Math.ceil(maximumX - minimumX),
		height: Math.ceil(maximumY - minimumY),
	};
}

export function createClusteredLayout(
	nodeIds: string[],
	links: GraphLayoutLink[],
	options: GraphLayoutOptions = {},
): Record<string, GraphPosition> {
	if (nodeIds.length === 0) return {};

	const nodeWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
	const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
	const nodeGap = options.nodeGap ?? DEFAULT_NODE_GAP;
	const clusterGap = options.clusterGap ?? DEFAULT_CLUSTER_GAP;
	const components = findConnectedComponents(nodeIds, links);
	const componentLayouts = components.map((component) =>
		layoutComponent(component, links, nodeWidth, nodeHeight, nodeGap),
	);
	const totalArea = componentLayouts.reduce(
		(sum, component) =>
			sum +
			(component.width + clusterGap) * (component.height + clusterGap),
		0,
	);
	const targetRowWidth = Math.max(900, Math.sqrt(totalArea) * 1.35);
	const positions: Record<string, GraphPosition> = {};
	let cursorX = 0;
	let cursorY = 0;
	let rowHeight = 0;

	for (const component of componentLayouts) {
		if (cursorX > 0 && cursorX + component.width > targetRowWidth) {
			cursorX = 0;
			cursorY += rowHeight + clusterGap;
			rowHeight = 0;
		}

		for (const [nodeId, position] of Object.entries(component.positions)) {
			positions[nodeId] = {
				x: position.x + cursorX,
				y: position.y + cursorY,
			};
		}

		cursorX += component.width + clusterGap;
		rowHeight = Math.max(rowHeight, component.height);
	}

	return positions;
}
