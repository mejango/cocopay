import { create } from 'zustand';
import type { AnchorPosition } from './authPopover';

export interface CashOutParams {
  storeName: string;
  balance: string;
  tokenSymbol: string;
  chainId: string;
  projectId: string;
  rawBalance: string;
  cashOutValueUsd: string;
}

interface CashOutPopoverState {
  isOpen: boolean;
  anchor: AnchorPosition | null;
  params: CashOutParams | null;
  open: (anchor: AnchorPosition, params: CashOutParams) => void;
  close: () => void;
}

export const useCashOutPopoverStore = create<CashOutPopoverState>((set) => ({
  isOpen: false,
  anchor: null,
  params: null,

  open: (anchor, params) => set({ isOpen: true, anchor, params }),

  close: () => set({ isOpen: false, anchor: null, params: null }),
}));
