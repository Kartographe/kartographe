import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppShellState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

/** Sidebar collapsed state, persisted so it survives reloads. */
export const useAppShellStore = create<AppShellState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: "kartographe-app-shell" }
  )
);
