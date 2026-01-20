'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Plus, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUI } from '@/contexts';
import { MobileNav } from './mobile-nav';
import { OnboardingDialog, ONBOARDING_KEY } from '@/components/onboarding/onboarding-dialog';
import { LoginButton } from '@/components/auth/login-button';
import { SyncIndicator } from '@/components/sync/sync-indicator';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { isMobile } = useUI();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleShowGuide = () => {
    // Temporarily remove the completion flag to show the dialog
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        {/* Mobile Menu */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle>Note Card Box</SheetTitle>
              </SheetHeader>
              <MobileNav />
            </SheetContent>
          </Sheet>
        )}

        {/* Title */}
        {title && <h1 className="text-lg font-semibold md:text-xl">{title}</h1>}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search (hidden on mobile) */}
        <div className="hidden w-64 md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜尋卡片..."
              className="pl-8"
            />
          </div>
        </div>

        {/* Help Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleShowGuide}>
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only">使用說明</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>使用說明</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Sync Indicator */}
        <SyncIndicator />

        {/* Login Button */}
        <LoginButton />

        {/* New Card Button */}
        <Button asChild size="sm" className="gap-1">
          <Link href="/cards/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新增</span>
          </Link>
        </Button>
      </header>

      {/* Onboarding Dialog */}
      {showOnboarding && (
        <OnboardingDialog
          forceOpen={true}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
