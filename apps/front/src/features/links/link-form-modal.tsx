// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { LINK_TYPE_LABELS, LINK_TYPE_ORDER } from "@/features/links/labels";
import { LinkPreview } from "@/features/links/link-preview";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type S = components["schemas"];
type Link = S["LinkItem"];
type LinkMeta = S["LinkMeta"];
type EntityType = S["EntityType"];

const URL_MAX_LENGTH = 2048;
const TITLE_MAX_LENGTH = 500;
/** Long enough that a typed URL settles before we ask the server about it. */
const PREFILL_DEBOUNCE_MS = 600;

const LIST_KEY = ["get", "/v1/accounts/{account_id}/links"];

/** Worth asking the server about — the full check lives in the API. */
const LOOKS_LIKE_URL = /^https?:\/\/\S+$/i;
const HTTP_SCHEME = /^https?:\/\//i;

function isProbablyUrl(value: string): boolean {
  return LOOKS_LIKE_URL.test(value.trim());
}

interface LinkFormModalProps {
  accountId: string;
  entityType: EntityType;
  entityId: string;
  /** Editing when given, creating otherwise. */
  link?: Link;
  open: boolean;
  onClose: () => void;
}

/**
 * Create or edit a reference.
 *
 * The URL leads: as it settles, the server is asked what it points at
 * (`/links/prefill`) and answers with the page's title and — for a URL back
 * into Kartographe — the resolved entity. The proposal fills the title only
 * while the user has not written one themselves, so a deliberate label is never
 * overwritten by a later paste.
 */
export function LinkFormModal({
  accountId,
  entityType,
  entityId,
  link,
  open,
  onClose,
}: LinkFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!link;

  const [meta, setMeta] = useState<LinkMeta | undefined>(link?.meta);
  // The last title the server proposed. A title equal to it (or empty) is still
  // the machine's; anything else the user wrote, and prefill leaves it alone.
  const proposedTitle = useRef<string | null>(null);
  // The last URL we asked about, so a re-render never re-asks the same thing.
  const prefilledUrl = useRef<string | null>(null);

  const prefillMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/links/prefill",
    { meta: { noErrorToast: true } }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/links",
    { meta: { successMessage: t`Référence ajoutée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/links/{link_id}",
    { meta: { successMessage: t`Référence mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      url: link?.url ?? "",
      type: (link?.type ?? "other") as S["LinkType"],
      title: link?.title ?? "",
      description: asRichText(link?.description),
    },
    validators: {
      onSubmit: z.object({
        url: z
          .string()
          .min(1, t`L'URL est requise`)
          .max(URL_MAX_LENGTH, t`L'URL est trop longue`)
          .regex(HTTP_SCHEME, t`L'URL doit commencer par http:// ou https://`),
        type: z.enum(dtoEnums.LinkType),
        title: z.string().max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        url: value.url.trim(),
        type: value.type,
        title: value.title.trim() || null,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (link) {
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, link_id: link.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body: { ...body, entityType, entityId },
          });
        }
        queryClient.invalidateQueries({ queryKey: LIST_KEY });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const url = useStore(form.store, (state) => state.values.url);

  // `prefillMutation` and `form` are stable for the modal's lifetime; re-running
  // this on their identity would re-ask the server on every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = url.trim();
    if (!isProbablyUrl(trimmed) || trimmed === prefilledUrl.current) {
      return;
    }
    const timer = setTimeout(async () => {
      prefilledUrl.current = trimmed;
      try {
        const response = await prefillMutation.mutateAsync({
          params: { path: { account_id: accountId } },
          body: { url: trimmed },
        });
        const item = response.item;
        setMeta(item.meta);
        const current = form.getFieldValue("title").trim();
        const stillOurs = current === "" || current === proposedTitle.current;
        if (item.title && stillOurs) {
          form.setFieldValue("title", item.title);
          proposedTitle.current = item.title;
        }
        // The kind is a suggestion, and only a confident one: an internal URL
        // *is* a Kartographe reference. Anything else keeps the user's choice.
        if (item.type === "kartographe") {
          form.setFieldValue("type", "kartographe");
        }
      } catch {
        // Prefilling is a convenience — a URL we cannot read is still savable.
        setMeta(undefined);
      }
    }, PREFILL_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [accountId, open, url]);

  const typeOptions = LINK_TYPE_ORDER.map((value) => ({
    value,
    label: t(LINK_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la référence` : t`Ajouter une référence`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="url">
            {(field) => (
              <field.TextField
                label={t`URL`}
                placeholder={t`https://linear.app/equipe/issue/ABC-123`}
              />
            )}
          </form.AppField>

          <LinkPreview
            accountId={accountId}
            isLoading={prefillMutation.isPending}
            meta={meta}
            url={url}
          />

          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Rempli automatiquement depuis la page`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Note`}
                placeholder={t`Pourquoi cette référence est-elle utile ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Ajouter la référence`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
