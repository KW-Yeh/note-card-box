'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Network,
  Tags,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { LoginButton } from '@/components/auth/login-button';

const navItems = [
  { href: '/', label: '儀表板', icon: LayoutDashboard },
  { href: '/cards', label: '所有卡片', icon: FileText },
  { href: '/graph', label: '知識圖譜', icon: Network },
  { href: '/tags', label: '標籤瀏覽', icon: Tags },
];

interface MobileNavProps {
  onClose?: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* New Card Button */}
      <div className="p-4">
        <SheetClose asChild>
          <Button asChild className="w-full justify-start gap-2">
            <Link href="/cards/new">
              <Plus className="h-4 w-4" />
              新增卡片
            </Link>
          </Button>
        </SheetClose>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            </SheetClose>
          );
        })}
      </nav>

      {/* User Auth Section */}
      <div className="mt-auto">
        <Separator />
        <div className="p-4">
          <LoginButton variant="full" onAction={onClose} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">Zettelkasten 知識管理</p>
      </div>
    </div>
  );
}
