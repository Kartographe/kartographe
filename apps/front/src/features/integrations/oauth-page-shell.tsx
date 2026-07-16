// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Card } from "antd";
import type { ReactNode } from "react";
import { LogoHorizontal } from "@/components/logo-horizontal";

/** Centered card shell for the standalone OAuth pages (consent, device code). */
export function OAuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-y-auto"
      style={{ background: "var(--ant-color-bg-layout)" }}
    >
      <div className="mx-auto my-auto w-full max-w-md p-4">
        <div className="mb-6 flex justify-center">
          <LogoHorizontal height={32} />
        </div>
        <Card
          style={{ boxShadow: "0 10px 30px rgba(16,24,40,.10)" }}
          styles={{ body: { padding: 28 } }}
          variant="borderless"
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
