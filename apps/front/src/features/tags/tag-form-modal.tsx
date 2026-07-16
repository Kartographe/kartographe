// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Flex, Modal, Tag, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  DEFAULT_TAG_BACKGROUND,
  DEFAULT_TAG_TEXT,
  TAG_ENTITY_TYPE_LABELS,
} from "@/features/tags/labels";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type TagItem = components["schemas"]["TagItem"];
type TagEntityType = components["schemas"]["TagEntityType"];

interface TagFormModalProps {
  accountId: string;
  /** The type a new tag gets; ignored when editing, where it cannot change. */
  entityType: TagEntityType;
  tag?: TagItem;
  open: boolean;
  onClose: () => void;
}

export function TagFormModal({
  accountId,
  entityType,
  tag,
  open,
  onClose,
}: TagFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!tag;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/tags",
    { meta: { successMessage: t`Tag créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/tags/{tag_id}",
    { meta: { successMessage: t`Tag mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      label: tag?.label ?? "",
      backgroundColor: tag?.backgroundColor ?? DEFAULT_TAG_BACKGROUND,
      textColor: tag?.textColor ?? DEFAULT_TAG_TEXT,
    },
    validators: {
      onSubmit: z.object({
        label: z.string().min(1, t`Le libellé est requis`),
        backgroundColor: z.string().min(1, t`La couleur de fond est requise`),
        textColor: z.string().min(1, t`La couleur du texte est requise`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (tag) {
          // `entityType` is absent from the patch form: a tag cannot change
          // what it attaches to.
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, tag_id: tag.id } },
            body: value,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body: { ...value, entityType },
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/tags"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const preview = useStore(form.store, (state) => state.values);

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le tag` : t`Créer un tag`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="label">
            {(field) => (
              <field.TextField label={t`Libellé`} placeholder={t`Critique`} />
            )}
          </form.AppField>
          <form.AppField name="backgroundColor">
            {(field) => <field.ColorField label={t`Couleur de fond`} />}
          </form.AppField>
          <form.AppField name="textColor">
            {(field) => <field.ColorField label={t`Couleur du texte`} />}
          </form.AppField>

          <Flex align="center" gap={12} style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">{t`Aperçu`}</Typography.Text>
            <Tag
              style={{
                background: preview.backgroundColor,
                borderColor: preview.backgroundColor,
                color: preview.textColor,
              }}
            >
              {preview.label || t(TAG_ENTITY_TYPE_LABELS[entityType])}
            </Tag>
          </Flex>

          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le tag`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
