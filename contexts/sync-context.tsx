'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { useDB } from './db-context';
import { syncService, type SyncStatus } from '@/lib/sync/sync-service';
import type { Card, Tag, Link } from '@/types/card';

interface SyncContextValue {
  status: SyncStatus;
  isOnline: boolean;
  isAuthenticated: boolean;
  sync: () => Promise<void>;
  pushAll: () => Promise<void>;
  queueCardSync: (action: 'create' | 'update' | 'delete', card: Card) => void;
  queueTagSync: (action: 'create' | 'update' | 'delete', tag: Tag) => void;
  queueLinkSync: (action: 'create' | 'delete', link: Link) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const SYNC_INTERVAL = 30000; // 30 seconds

export function SyncProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { db, isReady } = useDB();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });
  const [isOnline, setIsOnline] = useState(true);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!session?.user;

  // Initialize sync service with DB
  useEffect(() => {
    if (db && isReady) {
      syncService.setDB(db);
    }
  }, [db, isReady]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isAuthenticated && status.pendingCount > 0) {
      syncService.processQueue();
    }
  }, [isOnline, isAuthenticated, status.pendingCount]);

  // Periodic sync when authenticated and online
  useEffect(() => {
    if (isAuthenticated && isOnline && isReady) {
      // Initial sync
      syncService.fullSync().catch(console.error);

      // Set up interval
      syncIntervalRef.current = setInterval(() => {
        syncService.fullSync().catch(console.error);
      }, SYNC_INTERVAL);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated, isOnline, isReady]);

  // Manual sync trigger
  const sync = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    await syncService.fullSync();
  }, [isAuthenticated]);

  // Push all local data to cloud
  const pushAll = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    await syncService.pushAllToCloud();
  }, [isAuthenticated]);

  // Queue operations for sync
  const queueCardSync = useCallback(
    (action: 'create' | 'update' | 'delete', card: Card) => {
      if (isAuthenticated) {
        syncService.queueOperation('card', action, card.id, card);
        // Try to sync immediately if online
        if (isOnline) {
          syncService.processQueue();
        }
      }
    },
    [isAuthenticated, isOnline]
  );

  const queueTagSync = useCallback(
    (action: 'create' | 'update' | 'delete', tag: Tag) => {
      if (isAuthenticated) {
        syncService.queueOperation('tag', action, tag.id, tag);
        if (isOnline) {
          syncService.processQueue();
        }
      }
    },
    [isAuthenticated, isOnline]
  );

  const queueLinkSync = useCallback(
    (action: 'create' | 'delete', link: Link) => {
      if (isAuthenticated) {
        syncService.queueOperation('link', action, link.id, link);
        if (isOnline) {
          syncService.processQueue();
        }
      }
    },
    [isAuthenticated, isOnline]
  );

  return (
    <SyncContext.Provider
      value={{
        status,
        isOnline,
        isAuthenticated,
        sync,
        pushAll,
        queueCardSync,
        queueTagSync,
        queueLinkSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
