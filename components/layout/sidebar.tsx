'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Network,
  Tags,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUI } from '@/contexts';

const navItems = [
  { href: '/', label: '儀表板', icon: LayoutDashboard },
  { href: '/cards', label: '所有卡片', icon: FileText },
  { href: '/graph', label: '知識圖譜', icon: Network },
  { href: '/tags', label: '標籤瀏覽', icon: Tags },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, isMobile } = useUI();

  if (isMobile) return null;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <Link href="/" className="text-lg font-semibold">
              Note Card Box
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
            <ChevronLeft
              className={cn('h-5 w-5 transition-transform', !sidebarOpen && 'rotate-180')}
            />
          </Button>
        </div>

        {/* New Card Button */}
        <div className="p-4">
          <Button asChild className="w-full justify-start gap-2">
            <Link href="/cards/new">
              <Plus className="h-4 w-4" />
              {sidebarOpen && '新增卡片'}
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          {sidebarOpen && (
            <p className="text-xs text-muted-foreground">
              Zettelkasten 知識管理
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
