// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Button } from "antd";
import type { ReactNode } from "react";
import { useFormContext } from "@/lib/tanstack/react-form/form-contexts";

interface SubmitButtonProps {
  children: ReactNode;
  block?: boolean;
  disabled?: boolean;
}

export function SubmitButton({ children, block, disabled }: SubmitButtonProps) {
  const form = useFormContext();
  // Only block while submitting (or when the caller explicitly disables it):
  // validation runs on submit and surfaces field errors, so the button stays
  // clickable rather than mysteriously greyed out.
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          block={block}
          disabled={disabled}
          htmlType="submit"
          loading={isSubmitting}
          type="primary"
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
