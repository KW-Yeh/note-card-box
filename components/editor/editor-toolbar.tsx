'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  action: () => boolean;
  isActive: () => boolean;
  disabled?: () => boolean;
}

interface ToolGroup {
  group: string;
  items: ToolItem[];
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const tools: ToolGroup[] = [
    {
      group: 'text',
      items: [
        {
          icon: Bold,
          label: '粗體',
          shortcut: '⌘B',
          action: () => editor.chain().focus().toggleBold().run(),
          isActive: () => editor.isActive('bold'),
        },
        {
          icon: Italic,
          label: '斜體',
          shortcut: '⌘I',
          action: () => editor.chain().focus().toggleItalic().run(),
          isActive: () => editor.isActive('italic'),
        },
        {
          icon: Strikethrough,
          label: '刪除線',
          shortcut: '⌘⇧X',
          action: () => editor.chain().focus().toggleStrike().run(),
          isActive: () => editor.isActive('strike'),
        },
        {
          icon: Code,
          label: '行內程式碼',
          shortcut: '⌘E',
          action: () => editor.chain().focus().toggleCode().run(),
          isActive: () => editor.isActive('code'),
        },
      ],
    },
    {
      group: 'heading',
      items: [
        {
          icon: Heading1,
          label: '標題 1',
          shortcut: '⌘⌥1',
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          isActive: () => editor.isActive('heading', { level: 1 }),
        },
        {
          icon: Heading2,
          label: '標題 2',
          shortcut: '⌘⌥2',
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          isActive: () => editor.isActive('heading', { level: 2 }),
        },
        {
          icon: Heading3,
          label: '標題 3',
          shortcut: '⌘⌥3',
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          isActive: () => editor.isActive('heading', { level: 3 }),
        },
      ],
    },
    {
      group: 'list',
      items: [
        {
          icon: List,
          label: '項目清單',
          shortcut: '⌘⇧8',
          action: () => editor.chain().focus().toggleBulletList().run(),
          isActive: () => editor.isActive('bulletList'),
        },
        {
          icon: ListOrdered,
          label: '編號清單',
          shortcut: '⌘⇧7',
          action: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: () => editor.isActive('orderedList'),
        },
      ],
    },
    {
      group: 'block',
      items: [
        {
          icon: Quote,
          label: '引用',
          shortcut: '⌘⇧B',
          action: () => editor.chain().focus().toggleBlockquote().run(),
          isActive: () => editor.isActive('blockquote'),
        },
        {
          icon: Minus,
          label: '分隔線',
          action: () => editor.chain().focus().setHorizontalRule().run(),
          isActive: () => false,
        },
      ],
    },
    {
      group: 'history',
      items: [
        {
          icon: Undo,
          label: '復原',
          shortcut: '⌘Z',
          action: () => editor.chain().focus().undo().run(),
          isActive: () => false,
          disabled: () => !editor.can().undo(),
        },
        {
          icon: Redo,
          label: '重做',
          shortcut: '⌘⇧Z',
          action: () => editor.chain().focus().redo().run(),
          isActive: () => false,
          disabled: () => !editor.can().redo(),
        },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-1">
        {tools.map((group, groupIndex) => (
          <div key={group.group} className="flex items-center">
            {groupIndex > 0 && (
              <Separator orientation="vertical" className="mx-1 h-6" />
            )}
            {group.items.map((tool) => (
              <Tooltip key={tool.label}>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={tool.isActive()}
                    onPressedChange={tool.action}
                    disabled={tool.disabled?.()}
                    aria-label={tool.label}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="flex items-center gap-2">
                  <span>{tool.label}</span>
                  {tool.shortcut && (
                    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {tool.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
