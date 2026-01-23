'use client';

import { useState } from 'react';
import { useSync } from '@/contexts';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Trash2, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function SyncIndicator() {
  const { status, isOnline, isAuthenticated, sync, clearAndResync, forceOverwriteCloud } = useSync();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);

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

  const handleSync = async () => {
    if (isOnline && !status.isSyncing) {
      try {
        await sync(true);
        toast.success('同步完成');
      } catch {
        toast.error('同步失敗');
      }
    }
  };

  const handleClearAndResync = async () => {
    setShowClearDialog(false);
    if (isOnline && !status.isSyncing) {
      try {
        await clearAndResync();
        toast.success('已清除本機資料並重新同步');
      } catch {
        toast.error('重新同步失敗');
      }
    }
  };

  const handleOverwriteCloud = async () => {
    setShowOverwriteDialog(false);
    if (isOnline && !status.isSyncing) {
      try {
        await forceOverwriteCloud();
        toast.success('已將本機資料覆蓋至雲端');
      } catch {
        toast.error('覆蓋雲端資料失敗');
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!isOnline || status.isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors disabled:cursor-not-allowed"
            title={description}
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSync} disabled={!isOnline || status.isSyncing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            立即同步
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowClearDialog(true)}
            disabled={!isOnline || status.isSyncing}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            清除本機資料並重新同步
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowOverwriteDialog(true)}
            disabled={!isOnline || status.isSyncing}
            className="text-destructive focus:text-destructive"
          >
            <Upload className="mr-2 h-4 w-4" />
            以本機資料覆蓋雲端
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要清除本機資料嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作會清除所有本機資料（包含尚未同步的變更），並從雲端重新下載所有資料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAndResync}>
              確定清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要以本機資料覆蓋雲端嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作會刪除雲端所有資料，並以本機資料取代。其他裝置的未同步變更將會遺失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteCloud}>
              確定覆蓋
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
