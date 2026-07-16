// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Form } from "antd";
import type { ReactNode } from "react";
import { useFormContext } from "@/lib/tanstack/react-form/form-contexts";

interface FormRootProps {
  children: ReactNode;
}

/**
 * Wraps the fields in a real `<form>` (so Enter submits and password managers
 * work) plus AntD's `Form` in `component={false}` mode — TanStack Form owns the
 * state, AntD only provides `Form.Item` layout context.
 */
export function FormRoot({ children }: FormRootProps) {
  const form = useFormContext();
  return (
    <Form colon={false} component={false} layout="vertical">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        {children}
      </form>
    </Form>
  );
}
