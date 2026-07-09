import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LastAccountState {
  accountId: string | null;
  setAccountId: (accountId: string | null) => void;
}

/**
 * The last account the user visited, persisted across reloads.
 *
 * This is a *memory*, not the current selection: it exists so that signing in
 * again can resume where the user left off (see `resolveLoginAccount`). The
 * account actually being viewed is the `$accountId` route param — read it with
 * `useCurrentAccountId`. Conflating the two is what made the sidebar offer
 * "Applications" on `/`, where no account is selected.
 */
export const useActiveAccountStore = create<LastAccountState>()(
  persist(
    (set) => ({
      accountId: null,
      setAccountId: (accountId) => set({ accountId }),
    }),
    { name: "kartographe-active-account" }
  )
);
