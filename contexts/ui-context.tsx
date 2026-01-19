'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type DialogType = 'link-picker' | 'promote' | 'delete-confirm' | null;

interface UIContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  previewCardId: string | null;
  openPreview: (cardId: string) => void;
  closePreview: () => void;

  activeDialog: DialogType;
  dialogData: Record<string, unknown>;
  openDialog: (dialog: DialogType, data?: Record<string, unknown>) => void;
  closeDialog: () => void;

  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [dialogData, setDialogData] = useState<Record<string, unknown>>({});
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const openPreview = useCallback((cardId: string) => {
    setPreviewCardId(cardId);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewCardId(null);
  }, []);

  const openDialog = useCallback((dialog: DialogType, data?: Record<string, unknown>) => {
    setActiveDialog(dialog);
    setDialogData(data || {});
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setDialogData({});
  }, []);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        previewCardId,
        openPreview,
        closePreview,
        activeDialog,
        dialogData,
        openDialog,
        closeDialog,
        isMobile,
        setIsMobile,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
