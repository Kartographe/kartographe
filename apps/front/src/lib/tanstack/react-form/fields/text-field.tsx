// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { InputProps } from "antd";
import { Form, Input } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface TextFieldProps {
  label?: string;
  placeholder?: string;
  autoComplete?: string;
  type?: InputProps["type"];
  disabled?: boolean;
  prefix?: InputProps["prefix"];
  addonBefore?: InputProps["addonBefore"];
}

export function TextField({
  label,
  placeholder,
  autoComplete,
  type,
  disabled,
  prefix,
  addonBefore,
}: TextFieldProps) {
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
      <Input
        addonBefore={addonBefore}
        autoComplete={autoComplete}
        disabled={disabled}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        prefix={prefix}
        type={type}
        value={field.state.value ?? ""}
      />
    </Form.Item>
  );
}
