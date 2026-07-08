import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveAccountState {
  accountId: string | null;
  setAccountId: (accountId: string | null) => void;
}

/** The account the user is currently working in, persisted across reloads. */
export const useActiveAccountStore = create<ActiveAccountState>()(
  persist(
    (set) => ({
      accountId: null,
      setAccountId: (accountId) => set({ accountId }),
    }),
    { name: "kartographe-active-account" }
  )
);
