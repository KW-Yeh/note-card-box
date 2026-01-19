'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { Tag } from '@/types/card';

export interface HashtagSuggestionRef {
  onKeyDown: (event: { event: KeyboardEvent }) => boolean;
}

interface HashtagSuggestionProps {
  items: Tag[];
  query: string;
  command: (item: { id: string; label: string }) => void;
}

export const HashtagSuggestionList = forwardRef<HashtagSuggestionRef, HashtagSuggestionProps>(
  ({ items, query, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Include "create new" option if query doesn't match any existing tag
    const showCreateOption =
      query.length > 0 && !items.some((item) => item.name.toLowerCase() === query.toLowerCase());

    const totalItems = items.length + (showCreateOption ? 1 : 0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items, query]);

    const selectItem = (index: number) => {
      if (index < items.length) {
        const item = items[index];
        command({ id: item.id, label: item.name });
      } else if (showCreateOption) {
        // Create new tag
        command({ id: `new:${query}`, label: query.toLowerCase() });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + totalItems - 1) % totalItems);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          return true;
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (totalItems === 0) {
      return null;
    }

    return (
      <div className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => selectItem(index)}
          >
            <span
              className="mr-2 h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color || '#6b7280' }}
            />
            #{item.name}
          </button>
        ))}
        {showCreateOption && (
          <button
            className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
              selectedIndex === items.length
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => selectItem(items.length)}
          >
            <span className="mr-2 text-muted-foreground">+</span>
            建立 #{query.toLowerCase()}
          </button>
        )}
      </div>
    );
  }
);

HashtagSuggestionList.displayName = 'HashtagSuggestionList';
