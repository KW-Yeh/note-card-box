export type CardType = 'PERMANENT' | 'INNOVATION' | 'LITERATURE' | 'PROJECT';
export type RelationType = 'EXTENSION' | 'OPPOSITION';
export type CardStatus = 'DRAFT' | 'PENDING' | 'ARCHIVED';

export interface Card {
  id: string;
  shareId: string;
  title: string;
  content: string;
  type: CardType;
  status: CardStatus;
  isPublic: boolean;
  wordCount: number;
  tagIds: string[];
  createdAt: number;
  updatedAt: number;
  promotedAt?: number;
}

export interface Link {
  id: string;
  sourceId: string;
  targetId: string;
  relation: RelationType;
  description?: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  PERMANENT: '永久卡片',
  INNOVATION: '創新卡片',
  LITERATURE: '文獻卡片',
  PROJECT: '專案卡片',
};

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  PERMANENT: '#8B5CF6',
  INNOVATION: '#F59E0B',
  LITERATURE: '#3B82F6',
  PROJECT: '#10B981',
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  EXTENSION: '延伸',
  OPPOSITION: '對立',
};
