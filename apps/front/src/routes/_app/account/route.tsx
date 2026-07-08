import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AccountSideNav } from "@/features/account/components/account-side-nav";

export const Route = createFileRoute("/_app/account")({
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <div className="overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <AccountSideNav />
        </aside>
        <main className="min-w-0 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
