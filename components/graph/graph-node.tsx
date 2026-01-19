'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { CardType } from '@/types/card';

export interface CardNodeData extends Record<string, unknown> {
  label: string;
  cardType: CardType;
  wordCount: number;
}

export type CardNode = Node<CardNodeData, 'card'>;

const cardTypeColors: Record<CardType, string> = {
  PERMANENT: 'bg-violet-500 border-violet-600',
  INNOVATION: 'bg-amber-500 border-amber-600',
  LITERATURE: 'bg-blue-500 border-blue-600',
  PROJECT: 'bg-emerald-500 border-emerald-600',
};

const cardTypeLabels: Record<CardType, string> = {
  PERMANENT: '永久',
  INNOVATION: '創新',
  LITERATURE: '文獻',
  PROJECT: '專案',
};

function GraphNodeComponent({ data, selected }: NodeProps<CardNode>) {
  return (
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 shadow-md min-w-[120px] max-w-[200px]',
        'bg-card text-card-foreground',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-2 w-2 rounded-full',
              cardTypeColors[data.cardType]
            )}
          />
          <span className="text-[10px] text-muted-foreground">
            {cardTypeLabels[data.cardType]}
          </span>
        </div>
        <p className="text-sm font-medium truncate" title={data.label}>
          {data.label || '無標題'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {data.wordCount} 字
        </p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
