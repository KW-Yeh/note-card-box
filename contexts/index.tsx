'use client';

import { type ReactNode } from 'react';
import { DBProvider } from './db-context';
import { CardsProvider } from './cards-context';
import { TagsProvider } from './tags-context';
import { LinksProvider } from './links-context';
import { UIProvider } from './ui-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DBProvider>
      <UIProvider>
        <TagsProvider>
          <CardsProvider>
            <LinksProvider>{children}</LinksProvider>
          </CardsProvider>
        </TagsProvider>
      </UIProvider>
    </DBProvider>
  );
}

export { useDB } from './db-context';
export { useCards } from './cards-context';
export { useTags } from './tags-context';
export { useLinks } from './links-context';
export { useUI } from './ui-context';
