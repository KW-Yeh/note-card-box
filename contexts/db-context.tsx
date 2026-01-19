'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { initDB, type IDBPDatabase, type NoteCardBoxDB } from '@/lib/db';

interface DBContextValue {
  db: IDBPDatabase<NoteCardBoxDB> | null;
  isReady: boolean;
  error: Error | null;
}

const DBContext = createContext<DBContextValue>({
  db: null,
  isReady: false,
  error: null,
});

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<IDBPDatabase<NoteCardBoxDB> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    initDB()
      .then((database) => {
        if (mounted) {
          setDb(database);
          setIsReady(true);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DBContext.Provider value={{ db, isReady, error }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (context === undefined) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
}
