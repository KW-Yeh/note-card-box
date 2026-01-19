'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Mention from '@tiptap/extension-mention';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { cn } from '@/lib/utils';
import { WORD_LIMIT } from '@/lib/constants';
import { HashtagSuggestionList, type HashtagSuggestionRef } from './hashtag-suggestion';
import type { Tag } from '@/types/card';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onHashtagsChange?: (hashtags: string[]) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  tags?: Tag[];
  onSearchTags?: (query: string) => Promise<Tag[]>;
}

export function TiptapEditor({
  content,
  onChange,
  onHashtagsChange,
  placeholder = '開始撰寫你的想法...',
  className,
  editable = true,
  tags = [],
  onSearchTags,
}: TiptapEditorProps) {
  const tagsRef = useRef(tags);
  const onSearchTagsRef = useRef(onSearchTags);

  // Keep refs updated
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    onSearchTagsRef.current = onSearchTags;
  }, [onSearchTags]);

  // Extract hashtags from HTML content
  const extractHashtags = useCallback((html: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const mentions = doc.querySelectorAll('span[data-type="mention"]');
    const hashtags: string[] = [];

    mentions.forEach((mention) => {
      const id = mention.getAttribute('data-id');
      if (id) {
        hashtags.push(id);
      }
    });

    return [...new Set(hashtags)];
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: WORD_LIMIT.HARD,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'hashtag text-primary font-medium',
        },
        suggestion: {
          char: '#',
          items: async ({ query }) => {
            if (onSearchTagsRef.current) {
              return await onSearchTagsRef.current(query);
            }
            // Fallback to filtering provided tags
            return tagsRef.current
              .filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            let component: ReactRenderer<HashtagSuggestionRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(HashtagSuggestionList, {
                  props: {
                    ...props,
                    items: props.items,
                    query: props.query,
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },

              onUpdate(props) {
                component?.updateProps({
                  ...props,
                  items: props.items,
                  query: props.query,
                });

                if (!props.clientRect) {
                  return;
                }

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },

              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Extract and report hashtags
      if (onHashtagsChange) {
        const hashtags = extractHashtags(html);
        onHashtagsChange(hashtags);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none',
          'prose-headings:font-semibold prose-p:my-2',
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  const characterCount = editor.storage.characterCount.characters();
  const isOverSoftLimit = characterCount > WORD_LIMIT.SOFT;
  const isOverHardLimit = characterCount > WORD_LIMIT.HARD;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-background">
        <EditorContent editor={editor} className="p-4" />
      </div>

      {/* Character Count */}
      <div className="flex justify-end">
        <span
          className={cn(
            'text-xs',
            isOverHardLimit
              ? 'text-destructive'
              : isOverSoftLimit
                ? 'text-amber-500'
                : 'text-muted-foreground'
          )}
        >
          {characterCount} / {WORD_LIMIT.HARD} 字
          {isOverSoftLimit && !isOverHardLimit && ' (建議精簡)'}
          {isOverHardLimit && ' (已達上限)'}
        </span>
      </div>
    </div>
  );
}
