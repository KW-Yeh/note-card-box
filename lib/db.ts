import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Card, Link, Tag, CardType, CardStatus } from '@/types/card';

export interface NoteCardBoxDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: {
      'by-type': CardType;
      'by-status': CardStatus;
      'by-shareId': string;
      'by-createdAt': number;
    };
  };
  links: {
    key: string;
    value: Link;
    indexes: {
      'by-sourceId': string;
      'by-targetId': string;
    };
  };
  tags: {
    key: string;
    value: Tag;
    indexes: {
      'by-name': string;
    };
  };
}

const DB_NAME = 'note-card-box';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase<NoteCardBoxDB>> {
  return openDB<NoteCardBoxDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cards store
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('by-type', 'type');
        cardStore.createIndex('by-status', 'status');
        cardStore.createIndex('by-shareId', 'shareId', { unique: true });
        cardStore.createIndex('by-createdAt', 'createdAt');
      }

      // Links store
      if (!db.objectStoreNames.contains('links')) {
        const linkStore = db.createObjectStore('links', { keyPath: 'id' });
        linkStore.createIndex('by-sourceId', 'sourceId');
        linkStore.createIndex('by-targetId', 'targetId');
      }

      // Tags store
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('by-name', 'name', { unique: true });
      }
    },
  });
}

export type { IDBPDatabase };
