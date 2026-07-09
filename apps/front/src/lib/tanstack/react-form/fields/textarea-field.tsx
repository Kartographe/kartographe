import { Form, Input } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface TextAreaFieldProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export function TextAreaField({
  label,
  placeholder,
  disabled,
  rows = 4,
}: TextAreaFieldProps) {
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
      <Input.TextArea
        disabled={disabled}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={field.state.value ?? ""}
      />
    </Form.Item>
  );
}
