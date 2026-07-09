import { Form, Input } from "antd";
import { useRef } from "react";
import { splitRoutePath } from "@/lib/route-path/route-path";
import { firstFieldError } from "@/lib/tanstack/react-form/field-error";
import { useFieldContext } from "@/lib/tanstack/react-form/form-contexts";

interface RoutePathFieldProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Path input that highlights `{variable}` segments. The highlight is a mirror
 * layer drawn behind a transparent-text input, so both must share the exact
 * same typography and box metrics — no padding on the highlighted spans, or
 * the mirror drifts away from the caret.
 */
const FONT = {
  fontFamily: "monospace",
  fontSize: 14,
  letterSpacing: "normal",
  lineHeight: "22px",
} as const;

export function RoutePathField({
  label,
  placeholder,
  disabled,
}: RoutePathFieldProps) {
  const field = useFieldContext<string>();
  const mirrorRef = useRef<HTMLDivElement>(null);
  const error = firstFieldError(field.state.meta.errors);
  const showError = field.state.meta.isTouched && !!error;
  const value = field.state.value ?? "";

  return (
    <Form.Item
      help={showError ? error : undefined}
      htmlFor={field.name}
      label={label}
      validateStatus={showError ? "error" : undefined}
    >
      <div style={{ position: "relative" }}>
        <div
          aria-hidden="true"
          ref={mirrorRef}
          style={{
            ...FONT,
            boxSizing: "border-box",
            inset: 0,
            overflow: "hidden",
            padding: "5px 12px",
            pointerEvents: "none",
            position: "absolute",
            whiteSpace: "pre",
            zIndex: 0,
          }}
        >
          {splitRoutePath(value).map((segment) => (
            <span
              key={segment.start}
              style={
                segment.isVariable
                  ? {
                      background: "var(--ant-color-primary-bg)",
                      color: "var(--ant-color-primary)",
                      fontWeight: 600,
                    }
                  : undefined
              }
            >
              {segment.text}
            </span>
          ))}
        </div>
        <Input
          disabled={disabled}
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          onScroll={(event) => {
            if (mirrorRef.current) {
              mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          placeholder={placeholder}
          style={{
            ...FONT,
            background: "transparent",
            caretColor: "var(--ant-color-text)",
            color: "transparent",
            position: "relative",
            zIndex: 1,
          }}
          value={value}
        />
      </div>
    </Form.Item>
  );
}
