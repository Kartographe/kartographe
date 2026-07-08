import { Checkbox, Form } from "antd";
import type { ReactNode } from "react";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface CheckboxFieldProps {
  children: ReactNode;
  disabled?: boolean;
}

export function CheckboxField({ children, disabled }: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();
  const error = firstFieldError(field.state.meta.errors);
  const showError = field.state.meta.isTouched && !!error;

  return (
    <Form.Item
      help={showError ? error : undefined}
      validateStatus={showError ? "error" : undefined}
    >
      <Checkbox
        checked={!!field.state.value}
        disabled={disabled}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.checked)}
      >
        {children}
      </Checkbox>
    </Form.Item>
  );
}
