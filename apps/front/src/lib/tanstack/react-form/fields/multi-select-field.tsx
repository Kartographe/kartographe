import { Form, Select } from "antd";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface SelectOption {
  label: string;
  value: string;
}

interface MultiSelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  loading?: boolean;
}

export function MultiSelectField({
  label,
  placeholder,
  options,
  disabled,
  loading,
}: MultiSelectFieldProps) {
  const field = useFieldContext<string[]>();
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
        allowClear
        disabled={disabled}
        id={field.name}
        loading={loading}
        mode="multiple"
        onBlur={field.handleBlur}
        onChange={(value: string[]) => field.handleChange(value)}
        options={options}
        placeholder={placeholder}
        value={field.state.value ?? []}
      />
    </Form.Item>
  );
}
