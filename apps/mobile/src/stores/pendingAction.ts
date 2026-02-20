import { create } from 'zustand';

export interface PendingAction {
  type: 'navigate_tab' | 'action';
  tab?: string;
  action?: string;
}

interface PendingActionState {
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  clearPendingAction: () => void;
}

export const usePendingActionStore = create<PendingActionState>((set) => ({
  pendingAction: null,

  setPendingAction: (action) => {
    set({ pendingAction: action });
  },

  clearPendingAction: () => {
    set({ pendingAction: null });
  },
}));
