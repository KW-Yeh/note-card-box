"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import {
	ReactFlow,
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	type Edge,
	type Connection,
	Panel,
	ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode, type CardNode, type CardNodeData } from "./graph-node";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useLinks } from "@/contexts";
import { useIsMobile } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { Info, LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import {
	RELATION_TYPE_LABELS,
	type Card,
	type RelationType,
	type CardType,
} from "@/types/card";

interface KnowledgeGraphProps {
	readonly cards: Card[];
	readonly links: Array<{
		id: string;
		sourceId: string;
		targetId: string;
		relation: RelationType;
		description?: string;
		createdAt: number;
	}>;
	readonly onNodeClick?: (card: Card) => void;
	readonly onNodeDoubleClick?: (card: Card) => void;
}

const nodeTypes = {
	card: GraphNode,
};

const relationTypes: RelationType[] = ["EXTENSION", "OPPOSITION", "RELATED"];

interface SelectedEdge {
	id: string;
	x: number;
	y: number;
}

interface RelationEditorProps {
	relation: RelationType;
	isUpdating: boolean;
	onSelect: (relation: RelationType) => void;
	onDelete: () => void;
}

function RelationEditor({
	relation,
	isUpdating,
	onSelect,
	onDelete,
}: RelationEditorProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm font-medium">連結關係</p>
				<div className="flex items-center gap-2">
					{isUpdating ? (
						<LoaderCircle
							className="h-4 w-4 animate-spin text-muted-foreground"
							aria-label="更新中"
						/>
					) : null}
					<Badge variant="secondary">
						目前：{RELATION_TYPE_LABELS[relation]}
					</Badge>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{relationTypes
					.filter((option) => option !== relation)
					.map((option) => (
						<Button
							key={option}
							variant="outline"
							onClick={() => onSelect(option)}
							disabled={isUpdating}
							className="min-h-11 cursor-pointer"
						>
							{RELATION_TYPE_LABELS[option]}
						</Button>
					))}
			</div>
			<Button
				variant="destructive"
				onClick={onDelete}
				disabled={isUpdating}
				className="min-h-11 w-full cursor-pointer"
			>
				<Trash2 className="mr-2 h-4 w-4" />
				刪除連結
			</Button>
		</div>
	);
}

const edgeStyles: Record<RelationType, Partial<Edge>> = {
	EXTENSION: {
		style: { stroke: "#6b7280", strokeWidth: 2 },
		animated: false,
	},
	OPPOSITION: {
		style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5,5" },
		animated: true,
	},
	RELATED: {
		style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "2,4" },
		animated: false,
	},
};

function getEdgeLabel(relation: RelationType): string | undefined {
	if (relation === "OPPOSITION") return "對立";
	if (relation === "RELATED") return "待確認";
	return undefined;
}

const cardTypeFilters: {
	type: CardType | "ALL";
	label: string;
	color: string;
}[] = [
	{ type: "ALL", label: "全部", color: "bg-gray-500" },
	{ type: "PERMANENT", label: "永久", color: "bg-violet-500" },
	{ type: "INNOVATION", label: "創新", color: "bg-amber-500" },
	{ type: "LITERATURE", label: "文獻", color: "bg-blue-500" },
	{ type: "PROJECT", label: "專案", color: "bg-emerald-500" },
];

export function KnowledgeGraph({
	cards,
	links,
	onNodeClick,
	onNodeDoubleClick,
}: KnowledgeGraphProps) {
	const graphContainerRef = useRef<HTMLDivElement>(null);
	const [activeFilter, setActiveFilter] = useState<CardType | "ALL">("ALL");
	const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);
	const [isAutoLinking, startAutoLinking] = useTransition();
	const [isUpdatingLink, startUpdatingLink] = useTransition();
	const isMobile = useIsMobile();
	const { createLink, updateLink, deleteLink, fetchLinks, autoLinkAll } =
		useLinks();
	const selectedLink = selectedEdge
		? links.find((link) => link.id === selectedEdge.id)
		: undefined;

	useEffect(() => {
		if (!selectedEdge) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelectedEdge(null);
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [selectedEdge]);

	// Filter cards based on active filter
	const filteredCards = useMemo(() => {
		if (activeFilter === "ALL") return cards;
		return cards.filter((card) => card.type === activeFilter);
	}, [cards, activeFilter]);

	const filteredCardIds = useMemo(
		() => new Set(filteredCards.map((c) => c.id)),
		[filteredCards],
	);

	// Create nodes from cards
	const initialNodes: CardNode[] = useMemo(() => {
		// Simple grid layout
		const cols = Math.ceil(Math.sqrt(filteredCards.length));
		const spacing = { x: 250, y: 150 };

		return filteredCards.map((card, index) => ({
			id: card.id,
			type: "card",
			position: {
				x: (index % cols) * spacing.x,
				y: Math.floor(index / cols) * spacing.y,
			},
			data: {
				label: card.title,
				cardType: card.type,
				wordCount: card.wordCount,
			} satisfies CardNodeData,
			connectable: true, // Enable connecting nodes
		}));
	}, [filteredCards]);

	// Create edges from links (only for visible cards)
	const initialEdges: Edge[] = useMemo(() => {
		return links
			.filter(
				(link) =>
					filteredCardIds.has(link.sourceId) &&
					filteredCardIds.has(link.targetId),
			)
			.map((link) => ({
				id: link.id,
				source: link.sourceId,
				target: link.targetId,
				...edgeStyles[link.relation],
				label: getEdgeLabel(link.relation),
				labelStyle: { fill: "#6b7280", fontSize: 10 },
				labelBgStyle: { fill: "transparent" },
				// Selected state styling
				style: {
					...edgeStyles[link.relation].style,
				},
				// Enhance visibility when selected
				focusable: true,
			}));
	}, [links, filteredCardIds]);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Update nodes/edges when filtered data changes
	useMemo(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	const handleNodeClick = useCallback(
		(_: React.MouseEvent, node: CardNode) => {
			setSelectedEdge(null);
			if (onNodeClick) {
				const card = cards.find((c) => c.id === node.id);
				if (card) onNodeClick(card);
			}
		},
		[cards, onNodeClick],
	);

	const handleNodeDoubleClick = useCallback(
		(_: React.MouseEvent, node: CardNode) => {
			if (onNodeDoubleClick) {
				const card = cards.find((c) => c.id === node.id);
				if (card) onNodeDoubleClick(card);
			}
		},
		[cards, onNodeDoubleClick],
	);

	const handleConnect = useCallback(
		async (connection: Connection) => {
			if (!connection.source || !connection.target) return;

			try {
				const newLink = await createLink(
					connection.source,
					connection.target,
					"EXTENSION",
					undefined,
				);

				// Add edge to the graph with the correct link ID
				const newEdge: Edge = {
					id: newLink.id,
					source: connection.source,
					target: connection.target,
					...edgeStyles.EXTENSION,
					label: getEdgeLabel("EXTENSION"),
					labelStyle: { fill: "#6b7280", fontSize: 10 },
					labelBgStyle: { fill: "transparent" },
				};

				setEdges((eds) => addEdge(newEdge, eds));
				toast.success("連結已建立");
			} catch (error) {
				if (error instanceof Error) {
					toast.error(error.message);
				} else {
					toast.error("建立連結失敗");
				}
			}
		},
		[createLink, setEdges],
	);

	const handleEdgeClick = useCallback(
		(event: React.MouseEvent, edge: Edge) => {
			const bounds = graphContainerRef.current?.getBoundingClientRect();
			if (!bounds) return;

			const halfWidth = 128;
			setSelectedEdge({
				id: edge.id,
				x: Math.min(
					Math.max(event.clientX - bounds.left, halfWidth),
					bounds.width - halfWidth,
				),
				y: Math.max(event.clientY - bounds.top, 180),
			});
		},
		[],
	);

	const handleEdgesDelete = useCallback(
		async (edgesToDelete: Edge[]) => {
			try {
				// Delete all selected edges
				await Promise.all(edgesToDelete.map((edge) => deleteLink(edge.id)));

				// Refresh the links data
				await fetchLinks();
				setSelectedEdge(null);
				toast.success(`已刪除 ${edgesToDelete.length} 個連結`);
			} catch (error) {
				if (error instanceof Error) {
					toast.error(error.message);
				} else {
					toast.error("刪除連結失敗");
				}
			}
		},
		[deleteLink, fetchLinks],
	);

	const handleUpdateRelation = useCallback(
		(relation: RelationType) => {
			if (!selectedLink) return;

			startUpdatingLink(async () => {
				try {
					await updateLink(selectedLink.id, relation);
					toast.success(`連結已更新為「${RELATION_TYPE_LABELS[relation]}」`);
				} catch (error) {
					toast.error(error instanceof Error ? error.message : "更新連結失敗");
				}
			});
		},
		[selectedLink, updateLink],
	);

	const handleDeleteSelectedLink = useCallback(() => {
		if (!selectedLink) return;

		startUpdatingLink(async () => {
			try {
				await deleteLink(selectedLink.id);
				setSelectedEdge(null);
				toast.success("連結已刪除");
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "刪除連結失敗");
			}
		});
	}, [deleteLink, selectedLink]);

	const handleAutoLink = useCallback(() => {
		startAutoLinking(async () => {
			try {
				const createdCount = await autoLinkAll();
				toast.success(
					createdCount > 0
						? `已建立 ${createdCount} 個待確認連結`
						: "沒有發現新的相關連結",
				);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "自動連結失敗");
			}
		});
	}, [autoLinkAll]);

	return (
		<div ref={graphContainerRef} className="relative h-full w-full">
			<style>{`
				/* Selected edge styling */
				.react-flow__edge.selected .react-flow__edge-path,
				.react-flow__edge:focus .react-flow__edge-path,
				.react-flow__edge:focus-visible .react-flow__edge-path {
					stroke: #3b82f6 !important;
					stroke-width: 4 !important;
					filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.8));
				}
				
				/* Hover effect for edges */
				.react-flow__edge:hover .react-flow__edge-path {
					stroke-width: 3 !important;
					cursor: pointer;
				}
				
				/* Selected edge label */
				.react-flow__edge.selected .react-flow__edge-text,
				.react-flow__edge:focus .react-flow__edge-text {
					fill: #3b82f6 !important;
					font-weight: 600;
				}
			`}</style>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={handleNodeClick}
				onNodeDoubleClick={handleNodeDoubleClick}
				onEdgeClick={handleEdgeClick}
				onPaneClick={() => setSelectedEdge(null)}
				onConnect={handleConnect}
				onEdgesDelete={handleEdgesDelete}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.1}
				maxZoom={2}
				defaultEdgeOptions={{
					type: "smoothstep",
				}}
				connectionLineStyle={{ stroke: "#6b7280", strokeWidth: 2 }}
				connectionLineType={ConnectionLineType.SmoothStep}
				edgesReconnectable={false}
				deleteKeyCode={["Backspace", "Delete"]}
			>
				<Background />
				<Controls />

				{/* Filter Panel */}
				<Panel position="top-left" className="space-y-2">
					<div className="flex flex-wrap gap-2 rounded-lg bg-background/80 p-2 backdrop-blur-sm">
						{cardTypeFilters.map((filter) => (
							<Button
								key={filter.type}
								variant={activeFilter === filter.type ? "default" : "outline"}
								size="sm"
								onClick={() => setActiveFilter(filter.type)}
								className="gap-2"
							>
								<span className={`h-2 w-2 rounded-full ${filter.color}`} />
								{filter.label}
							</Button>
						))}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={handleAutoLink}
						disabled={isAutoLinking || cards.length < 2}
						className="min-h-11 w-full cursor-pointer bg-background/90"
					>
						{isAutoLinking ? (
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="mr-2 h-4 w-4" />
						)}
						{isAutoLinking ? "分析卡片中..." : "自動連結"}
					</Button>
				</Panel>

				{/* Stats Panel - hidden on mobile to avoid overlap with filter buttons */}
				<Panel position="top-right" className="hidden sm:block">
					<div className="rounded-lg bg-background/80 p-3 backdrop-blur-sm">
						<div className="space-y-1 text-sm">
							<p>
								<span className="text-muted-foreground">卡片數：</span>
								<span className="font-medium">{filteredCards.length}</span>
							</p>
							<p>
								<span className="text-muted-foreground">連結數：</span>
								<span className="font-medium">{edges.length}</span>
							</p>
						</div>
					</div>
				</Panel>

				{/* Stats Panel for mobile - positioned at bottom right */}
				<Panel position="bottom-right" className="block sm:hidden">
					<div className="rounded-lg bg-background/80 p-2 backdrop-blur-sm text-xs">
						<span className="text-muted-foreground">卡片：</span>
						<span className="font-medium">{filteredCards.length}</span>
						<span className="mx-2 text-muted-foreground">|</span>
						<span className="text-muted-foreground">連結：</span>
						<span className="font-medium">{edges.length}</span>
					</div>
				</Panel>

				{/* Legend */}
				<Panel position="bottom-left">
					<div className="rounded-lg bg-background/80 p-3 backdrop-blur-sm">
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							連結類型
						</p>
						<div className="flex gap-4 text-xs">
							<div className="flex items-center gap-2">
								<div className="h-0.5 w-6 bg-gray-500" />
								<span>相關</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="h-0.5 w-6 bg-red-500"
									style={{
										backgroundImage:
											"repeating-linear-gradient(90deg, #ef4444 0, #ef4444 5px, transparent 5px, transparent 10px)",
									}}
								/>
								<span>對立</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-0.5 w-6 border-t-2 border-dotted border-amber-500" />
								<span>待確認</span>
							</div>
						</div>
						<div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
							<p className="flex items-center gap-1">
								<Info className="h-3.5 w-3.5" />
								提示：
							</p>
							<p>
								• 點選連結線會變成
								<span className="text-blue-500 font-semibold">藍色</span>並發光
							</p>
							<p>• 選中後按 Delete 或 Backspace 刪除</p>
						</div>
					</div>
				</Panel>
			</ReactFlow>

			{selectedLink && !isMobile ? (
				<div
					role="dialog"
					aria-label="編輯連結關係"
					className="absolute z-50 w-64 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
					style={{
						left: selectedEdge?.x,
						top: selectedEdge?.y,
						transform: "translate(-50%, calc(-100% - 12px))",
					}}
					onPointerDown={(event) => event.stopPropagation()}
				>
					<RelationEditor
						relation={selectedLink.relation}
						isUpdating={isUpdatingLink}
						onSelect={handleUpdateRelation}
						onDelete={handleDeleteSelectedLink}
					/>
				</div>
			) : null}

			<Drawer
				open={Boolean(selectedLink && isMobile)}
				onOpenChange={(open) => {
					if (!open) setSelectedEdge(null);
				}}
			>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>編輯連結</DrawerTitle>
						<DrawerDescription>
							選擇這兩張卡片之間的關係，或刪除此連結。
						</DrawerDescription>
					</DrawerHeader>
					{selectedLink ? (
						<div className="p-4 pt-0">
							<RelationEditor
								relation={selectedLink.relation}
								isUpdating={isUpdatingLink}
								onSelect={handleUpdateRelation}
								onDelete={handleDeleteSelectedLink}
							/>
						</div>
					) : null}
				</DrawerContent>
			</Drawer>
		</div>
	);
}
