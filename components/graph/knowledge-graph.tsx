'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphNode, type CardNode, type CardNodeData } from './graph-node';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Card, Link, RelationType, CardType } from '@/types/card';

interface KnowledgeGraphProps {
  cards: Card[];
  links: Link[];
  onNodeClick?: (card: Card) => void;
  onNodeDoubleClick?: (card: Card) => void;
}

const nodeTypes = {
  card: GraphNode,
};

const edgeStyles: Record<RelationType, Partial<Edge>> = {
  EXTENSION: {
    style: { stroke: '#6b7280', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    animated: false,
  },
  OPPOSITION: {
    style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    animated: true,
  },
};

const cardTypeFilters: { type: CardType | 'ALL'; label: string; color: string }[] = [
  { type: 'ALL', label: '全部', color: 'bg-gray-500' },
  { type: 'PERMANENT', label: '永久', color: 'bg-violet-500' },
  { type: 'INNOVATION', label: '創新', color: 'bg-amber-500' },
  { type: 'LITERATURE', label: '文獻', color: 'bg-blue-500' },
  { type: 'PROJECT', label: '專案', color: 'bg-emerald-500' },
];

export function KnowledgeGraph({
  cards,
  links,
  onNodeClick,
  onNodeDoubleClick,
}: KnowledgeGraphProps) {
  const [activeFilter, setActiveFilter] = useState<CardType | 'ALL'>('ALL');

  // Filter cards based on active filter
  const filteredCards = useMemo(() => {
    if (activeFilter === 'ALL') return cards;
    return cards.filter((card) => card.type === activeFilter);
  }, [cards, activeFilter]);

  const filteredCardIds = useMemo(
    () => new Set(filteredCards.map((c) => c.id)),
    [filteredCards]
  );

  // Create nodes from cards
  const initialNodes: CardNode[] = useMemo(() => {
    // Simple grid layout
    const cols = Math.ceil(Math.sqrt(filteredCards.length));
    const spacing = { x: 250, y: 150 };

    return filteredCards.map((card, index) => ({
      id: card.id,
      type: 'card',
      position: {
        x: (index % cols) * spacing.x,
        y: Math.floor(index / cols) * spacing.y,
      },
      data: {
        label: card.title,
        cardType: card.type,
        wordCount: card.wordCount,
      } satisfies CardNodeData,
    }));
  }, [filteredCards]);

  // Create edges from links (only for visible cards)
  const initialEdges: Edge[] = useMemo(() => {
    return links
      .filter(
        (link) =>
          filteredCardIds.has(link.sourceId) && filteredCardIds.has(link.targetId)
      )
      .map((link) => ({
        id: link.id,
        source: link.sourceId,
        target: link.targetId,
        ...edgeStyles[link.relation],
        label: link.relation === 'OPPOSITION' ? '對立' : undefined,
        labelStyle: { fill: '#6b7280', fontSize: 10 },
        labelBgStyle: { fill: 'transparent' },
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
      if (onNodeClick) {
        const card = cards.find((c) => c.id === node.id);
        if (card) onNodeClick(card);
      }
    },
    [cards, onNodeClick]
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: CardNode) => {
      if (onNodeDoubleClick) {
        const card = cards.find((c) => c.id === node.id);
        if (card) onNodeDoubleClick(card);
      }
    },
    [cards, onNodeDoubleClick]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange as OnNodesChange<CardNode>}
        onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background />
        <Controls />

        {/* Filter Panel */}
        <Panel position="top-left" className="space-y-2">
          <div className="flex flex-wrap gap-2 rounded-lg bg-background/80 p-2 backdrop-blur-sm">
            {cardTypeFilters.map((filter) => (
              <Button
                key={filter.type}
                variant={activeFilter === filter.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.type)}
                className="gap-2"
              >
                <span className={`h-2 w-2 rounded-full ${filter.color}`} />
                {filter.label}
              </Button>
            ))}
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right">
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

        {/* Legend */}
        <Panel position="bottom-left">
          <div className="rounded-lg bg-background/80 p-3 backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">連結類型</p>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-gray-500" />
                <span>延伸</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-red-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444 0, #ef4444 5px, transparent 5px, transparent 10px)' }} />
                <span>對立</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
