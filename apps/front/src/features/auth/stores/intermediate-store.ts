import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { components } from "@/api/generated/schema";

type TwoFactorType = components["schemas"]["UserAuthenticationTwoFactorType"];

interface IntermediateState {
  /** Short-lived token returned by the password step when 2FA is required. */
  token: string | null;
  availableTypes: TwoFactorType[];
  setChallenge: (token: string, availableTypes: TwoFactorType[]) => void;
  clear: () => void;
}

/**
 * Holds the intermediate 2FA challenge between the password step and the
 * second-factor step. Persisted to sessionStorage so a page reload mid-flow
 * doesn't lose it (and is scoped to the tab).
 */
export const useIntermediateStore = create<IntermediateState>()(
  persist(
    (set) => ({
      token: null,
      availableTypes: [],
      setChallenge: (token, availableTypes) => set({ token, availableTypes }),
      clear: () => set({ token: null, availableTypes: [] }),
    }),
    {
      name: "kartographe-auth-intermediate",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
