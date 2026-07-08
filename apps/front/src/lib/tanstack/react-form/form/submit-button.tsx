import { Button } from "antd";
import type { ReactNode } from "react";
import { useFormContext } from "@/lib/tanstack/react-form/form-contexts";

interface SubmitButtonProps {
  children: ReactNode;
  block?: boolean;
  disabled?: boolean;
}

export function SubmitButton({ children, block, disabled }: SubmitButtonProps) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          block={block}
          disabled={disabled || !canSubmit}
          htmlType="submit"
          loading={isSubmitting}
          type="primary"
        >
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
