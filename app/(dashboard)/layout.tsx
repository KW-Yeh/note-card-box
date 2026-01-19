'use client';

import { useEffect, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useUI } from '@/contexts';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen, setIsMobile, setSidebarOpen } = useUI();
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsMobile(isMobile);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setIsMobile, setSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          !isMobile && (sidebarOpen ? 'ml-64' : 'ml-16')
        )}
      >
        {children}
      </main>
    </div>
  );
}
