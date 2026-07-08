import { createFormHook } from "@tanstack/react-form";
import { CheckboxField } from "@/lib/tanstack/react-form/fields/checkbox-field";
import { OtpField } from "@/lib/tanstack/react-form/fields/otp-field";
import { PasswordField } from "@/lib/tanstack/react-form/fields/password-field";
import { SelectField } from "@/lib/tanstack/react-form/fields/select-field";
import { TextField } from "@/lib/tanstack/react-form/fields/text-field";
import { FormRoot } from "@/lib/tanstack/react-form/form/form-root";
import { SubmitButton } from "@/lib/tanstack/react-form/form/submit-button";
import {
  fieldContext,
  formContext,
} from "@/lib/tanstack/react-form/form-contexts";

/**
 * The app form hook. Fields are bound via `form.AppField` + `field.TextField`
 * etc.; form-level pieces via `form.AppForm` + `form.FormRoot` /
 * `form.SubmitButton`. Register new field components here.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    OtpField,
    SelectField,
    CheckboxField,
  },
  formComponents: {
    FormRoot,
    SubmitButton,
  },
});
