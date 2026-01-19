'use client';

import Link from 'next/link';
import { FileText, Lightbulb, BookOpen, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type CardType, CARD_TYPE_LABELS, CARD_TYPE_COLORS } from '@/types/card';
import { cn } from '@/lib/utils';

const CARD_TYPE_ICONS: Record<CardType, typeof FileText> = {
  PERMANENT: FileText,
  INNOVATION: Lightbulb,
  LITERATURE: BookOpen,
  PROJECT: FolderKanban,
};

interface CardBoxTileProps {
  type: CardType;
  count: number;
  recentCount?: number;
  className?: string;
}

export function CardBoxTile({ type, count, recentCount = 0, className }: CardBoxTileProps) {
  const Icon = CARD_TYPE_ICONS[type];
  const color = CARD_TYPE_COLORS[type];
  const label = CARD_TYPE_LABELS[type];

  return (
    <Link href={`/cards?type=${type}`}>
      <Card
        className={cn(
          'group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
          className
        )}
        style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" style={{ color }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
          {recentCount > 0 && (
            <p className="text-xs text-muted-foreground">
              本週新增 {recentCount} 張
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
