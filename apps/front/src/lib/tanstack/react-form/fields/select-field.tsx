import { Form, Select } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  /** For options fetched asynchronously. */
  loading?: boolean;
}

export function SelectField({
  label,
  placeholder,
  options,
  disabled,
  loading,
}: SelectFieldProps) {
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
      <Select
        disabled={disabled}
        id={field.name}
        loading={loading}
        onBlur={field.handleBlur}
        onChange={(value) => field.handleChange(value)}
        options={options}
        placeholder={placeholder}
        value={field.state.value || undefined}
      />
    </Form.Item>
  );
}
