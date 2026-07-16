// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ColorPicker, Form } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface ColorFieldProps {
  label?: string;
  disabled?: boolean;
}

/**
 * Holds a hex string (`"#1677ff"`), or `""` when no colour is set — the shape
 * the API spells as `null`. Clearing the picker empties the field rather than
 * falling back to a default, so "no colour" stays expressible.
 */
export function ColorField({ label, disabled }: ColorFieldProps) {
  const field = useFieldContext<string>();
  const error = firstFieldError(field.state.meta.errors);
  const showError = field.state.meta.isTouched && !!error;

  return (
    // No `htmlFor`: antd's ColorPicker renders no labellable control to point at.
    <Form.Item
      help={showError ? error : undefined}
      label={label}
      validateStatus={showError ? "error" : undefined}
    >
      <ColorPicker
        allowClear
        disabled={disabled}
        format="hex"
        onChange={(color) => field.handleChange(color.toHexString())}
        onClear={() => field.handleChange("")}
        showText
        value={field.state.value || null}
      />
    </Form.Item>
  );
}
