// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { Form, Input } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface OtpFieldProps {
  label?: string;
  length?: number;
  disabled?: boolean;
}

export function OtpField({ label, length = 6, disabled }: OtpFieldProps) {
  const field = useFieldContext<string>();
  const error = firstFieldError(field.state.meta.errors);
  const showError = field.state.meta.isTouched && !!error;

  return (
    <Form.Item
      help={showError ? error : undefined}
      htmlFor={field.name}
      label={label}
      validateStatus={showError ? "error" : undefined}
    >
      <Input.OTP
        disabled={disabled}
        length={length}
        onChange={(value) => field.handleChange(value)}
        value={field.state.value ?? ""}
      />
    </Form.Item>
  );
}
