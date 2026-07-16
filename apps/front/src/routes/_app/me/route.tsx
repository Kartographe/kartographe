// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MeSideNav } from "@/features/account/components/me-side-nav";

export const Route = createFileRoute("/_app/me")({
  component: MeLayout,
});

function MeLayout() {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <MeSideNav />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
