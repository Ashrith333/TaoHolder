"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Last wallet + account address only (PRD 9.1). Never keys.
export type Account = { address: string; name?: string };
type State = {
  walletId: string | null;
  address: string | null;
  accounts: Account[];
  demo: boolean;
  connect: (walletId: string, account: Account, demo?: boolean) => void;
  setAccounts: (a: Account[]) => void;
  disconnect: () => void;
};

export const useWallet = create<State>()(
  persist(
    (set) => ({
      walletId: null,
      address: null,
      accounts: [],
      demo: false,
      connect: (walletId, account, demo = false) => set({ walletId, address: account.address, demo }),
      setAccounts: (accounts) => set({ accounts }),
      disconnect: () => set({ walletId: null, address: null, accounts: [], demo: false }),
    }),
    { name: "th.wallet", partialize: (s) => ({ walletId: s.walletId, address: s.address, demo: s.demo }) },
  ),
);
