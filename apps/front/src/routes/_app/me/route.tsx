import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MeSideNav } from "@/features/account/components/me-side-nav";

export const Route = createFileRoute("/_app/me")({
  component: MeLayout,
});

function MeLayout() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)"
      style={{ minHeight: "72dvh" }}
    >
      <div className="grid h-full grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <MeSideNav />
        </aside>
        <main className="min-w-0 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
