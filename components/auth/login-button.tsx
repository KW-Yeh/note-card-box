'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LoginButtonProps {
  variant?: 'compact' | 'full';
  onAction?: () => void;
}

export function LoginButton({ variant = 'compact', onAction }: LoginButtonProps) {
  const { data: session, status } = useSession();

  const handleSignIn = () => {
    onAction?.();
    signIn('google');
  };

  const handleSignOut = () => {
    onAction?.();
    signOut();
  };

  if (status === 'loading') {
    if (variant === 'full') {
      return (
        <Button variant="outline" size="sm" disabled className="w-full">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          載入中...
        </Button>
      );
    }
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (session) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-3 w-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
            <AvatarFallback>
              {session.user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            登出
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
          <AvatarFallback>
            {session.user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">登出</span>
        </Button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <Button onClick={handleSignIn} className="w-full">
        <LogIn className="h-4 w-4 mr-2" />
        使用 Google 登入
      </Button>
    );
  }

  return (
    <Button onClick={handleSignIn} size="sm">
      <LogIn className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">使用 Google 登入</span>
    </Button>
  );
}
