import { create } from 'zustand';

export type AuthPopoverStep = 'closed' | 'choose' | 'email' | 'verify' | 'wallet' | 'connected';

export interface AnchorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AuthPopoverState {
  step: AuthPopoverStep;
  email: string;
  verificationId: string;
  anchor: AnchorPosition | null;
  open: (anchor?: AnchorPosition) => void;
  close: () => void;
  setStep: (step: AuthPopoverStep) => void;
  setEmail: (email: string) => void;
  setVerificationId: (id: string) => void;
}

export const useAuthPopoverStore = create<AuthPopoverState>((set) => ({
  step: 'closed',
  email: '',
  verificationId: '',
  anchor: null,

  open: (anchor) => set({ step: 'choose', email: '', verificationId: '', anchor: anchor ?? null }),

  close: () => set({ step: 'closed', email: '', verificationId: '', anchor: null }),

  setStep: (step) => set({ step }),

  setEmail: (email) => set({ email }),

  setVerificationId: (id) => set({ verificationId: id }),
}));
