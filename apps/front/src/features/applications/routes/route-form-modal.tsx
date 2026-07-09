import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type ApplicationRoute = components["schemas"]["ApplicationRouteItem"];
type Method = components["schemas"]["ApplicationRouteMethod"];

interface RouteFormModalProps {
  accountId: string;
  applicationId: string;
  route?: ApplicationRoute;
  open: boolean;
  onClose: () => void;
}

export function RouteFormModal({
  accountId,
  applicationId,
  route,
  open,
  onClose,
}: RouteFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!route;
  const path = { account_id: accountId, application_id: applicationId };

  const guardsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/guards",
    { params: { path } }
  );
  const rolesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/roles",
    { params: { path } }
  );

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/routes",
    { meta: { successMessage: t`Route créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}",
    { meta: { successMessage: t`Route mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      method: (route?.method ?? "GET") as Method,
      path: route?.path ?? "",
      title: route?.title ?? "",
      description: asRichText(route?.description),
      applicationGuardIds: route?.applicationGuardIds ?? [],
      applicationRoleIds: route?.applicationRoleIds ?? [],
    },
    validators: {
      onSubmit: z.object({
        method: z.enum(dtoEnums.ApplicationRouteMethod),
        path: z.string().min(1, t`Le chemin est requis`),
        title: z.string(),
        description: z.record(z.string(), z.unknown()),
        applicationGuardIds: z.array(z.string()),
        applicationRoleIds: z.array(z.string()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        method: value.method,
        path: value.path,
        title: value.title || null,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
        applicationGuardIds: value.applicationGuardIds,
        applicationRoleIds: value.applicationRoleIds,
      };
      try {
        if (route) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, route_id: route.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/applications/{application_id}/routes",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const methodOptions = dtoEnums.ApplicationRouteMethod.map((value) => ({
    value,
    label: value,
  }));
  const guardOptions = (guardsQuery.data?.items ?? []).map((guard) => ({
    value: guard.id,
    label: guard.title,
  }));
  const roleOptions = (rolesQuery.data?.items ?? []).map((role) => ({
    value: role.id,
    label: role.title,
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la route` : t`Créer une route`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="method">
            {(field) => (
              <field.SelectField label={t`Méthode`} options={methodOptions} />
            )}
          </form.AppField>
          <form.AppField name="path">
            {(field) => (
              <field.RoutePathField
                label={t`Chemin`}
                placeholder="/v1/users/{id}"
              />
            )}
          </form.AppField>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Récupérer un utilisateur`}
              />
            )}
          </form.AppField>
          <form.AppField name="applicationGuardIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Guards`}
                loading={guardsQuery.isLoading}
                options={guardOptions}
                placeholder={t`Aucun guard`}
              />
            )}
          </form.AppField>
          <form.AppField name="applicationRoleIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Rôles`}
                loading={rolesQuery.isLoading}
                options={roleOptions}
                placeholder={t`Aucun rôle`}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que fait cette route ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la route`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
