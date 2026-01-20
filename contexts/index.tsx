'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { DBProvider } from './db-context';
import { CardsProvider } from './cards-context';
import { TagsProvider } from './tags-context';
import { LinksProvider } from './links-context';
import { UIProvider } from './ui-context';
import { SyncProvider } from './sync-context';

// Inner component that has access to session
function DataProviders({ children }: { readonly children: ReactNode }) {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);

  const isAuthenticated = !!session?.user;

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

  return (
    <SyncProvider>
      <UIProvider>
        <TagsProvider isAuthenticated={isAuthenticated} isOnline={isOnline}>
          <CardsProvider isAuthenticated={isAuthenticated} isOnline={isOnline}>
            <LinksProvider isAuthenticated={isAuthenticated} isOnline={isOnline}>
              {children}
            </LinksProvider>
          </CardsProvider>
        </TagsProvider>
      </UIProvider>
    </SyncProvider>
  );
}

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SessionProvider>
      <DBProvider>
        <DataProviders>{children}</DataProviders>
      </DBProvider>
    </SessionProvider>
  );
}

export { useDB } from './db-context';
export { useCards } from './cards-context';
export { useTags } from './tags-context';
export { useLinks } from './links-context';
export { useUI } from './ui-context';
export { useSync } from './sync-context';
export { useSession, signIn, signOut } from 'next-auth/react';
