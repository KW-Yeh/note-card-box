'use client';

import { useSync } from '@/contexts';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SyncIndicator() {
  const { status, isOnline, isAuthenticated, sync } = useSync();

  // Don't show anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <CloudOff className="h-4 w-4 text-muted-foreground" />,
        text: '離線中',
        description: '變更會在上線後同步',
      };
    }

    if (status.isSyncing) {
      return {
        icon: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
        text: '同步中...',
        description: '正在同步您的資料',
      };
    }

    if (status.pendingCount > 0) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
        text: `${status.pendingCount} 項待同步`,
        description: '點擊立即同步',
      };
    }

    return {
      icon: <Check className="h-4 w-4 text-green-500" />,
      text: '已同步',
      description: status.lastSyncAt
        ? `上次同步: ${new Date(status.lastSyncAt).toLocaleTimeString()}`
        : '所有變更已同步至雲端',
    };
  };

  const { icon, text, description } = getStatusInfo();

  const handleClick = () => {
    if (isOnline && !status.isSyncing) {
      // Force full pull when manually clicking to get latest data from other devices
      sync(true);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={!isOnline || status.isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors disabled:cursor-not-allowed"
          >
            {isOnline ? (
              <Cloud className="h-4 w-4 text-muted-foreground" />
            ) : (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            )}
            {icon}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {text}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
