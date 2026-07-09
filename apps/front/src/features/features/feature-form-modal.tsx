import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { FEATURE_TYPE_LABELS } from "@/features/features/labels";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Feature = components["schemas"]["FeatureItem"];
type FeatureType = components["schemas"]["FeatureType"];

const TITLE_MAX_LENGTH = 255;

interface FeatureFormModalProps {
  accountId: string;
  feature?: Feature;
  open: boolean;
  onClose: () => void;
}

export function FeatureFormModal({
  accountId,
  feature,
  open,
  onClose,
}: FeatureFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!feature;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features",
    { meta: { successMessage: t`Fonctionnalité créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    {
      meta: {
        successMessage: t`Fonctionnalité mise à jour`,
        noErrorToast: true,
      },
    }
  );

  const form = useAppForm({
    defaultValues: {
      title: feature?.title ?? "",
      type: (feature?.type ?? "product") as FeatureType,
      tagIds: feature?.tagIds ?? [],
      description: asRichText(feature?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        type: z.enum(dtoEnums.FeatureType),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (feature) {
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, feature_id: feature.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/features"],
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/features/{feature_id}"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.FeatureType.map((value) => ({
    value,
    label: t(FEATURE_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={
        isEdit ? t`Modifier la fonctionnalité` : t`Créer une fonctionnalité`
      }
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Export des factures en PDF`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="feature"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que doit permettre cette fonctionnalité ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la fonctionnalité`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
