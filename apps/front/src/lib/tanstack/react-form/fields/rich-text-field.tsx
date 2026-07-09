import { Form } from "antd";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { RichTextEditor } from "@/lib/rich-text/rich-text-editor";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface RichTextFieldProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextField({
  label,
  placeholder,
  disabled,
}: RichTextFieldProps) {
  const field = useFieldContext<RichTextDocument>();
  const error = firstFieldError(field.state.meta.errors);
  const showError = field.state.meta.isTouched && !!error;

  return (
    <Form.Item
      help={showError ? error : undefined}
      htmlFor={field.name}
      label={label}
      validateStatus={showError ? "error" : undefined}
    >
      <RichTextEditor
        disabled={disabled}
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(value) => field.handleChange(value)}
        placeholder={placeholder}
        value={field.state.value}
      />
    </Form.Item>
  );
}
