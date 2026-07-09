import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Empty,
  Flex,
  Segmented,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { TAG_ENTITY_TYPE_LABELS } from "@/features/accounts/administration/tags/labels";
import { TagFormModal } from "@/features/accounts/administration/tags/tag-form-modal";

type TagItem = components["schemas"]["TagItem"];
type TagEntityType = components["schemas"]["TagEntityType"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/tags"];

export function TagsScreen({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [entityType, setEntityType] = useState<TagEntityType>("application");
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<TagItem | undefined | null>(null);

  const tagsQuery = $api.useQuery("get", "/v1/accounts/{account_id}/tags", {
    params: {
      path: { account_id: accountId },
      query: { type: entityType },
    },
  });
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/tags/{tag_id}",
    { meta: { successMessage: t`Tag supprimé` } }
  );

  const tags = tagsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function confirmDelete(tag: TagItem) {
    modal.confirm({
      title: t`Supprimer le tag ${tag.label} ?`,
      content: t`Il sera retiré de toutes les entités qui le portent. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, tag_id: tag.id } },
        });
        invalidate();
      },
    });
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Tags`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setForm(undefined)}
          type="primary"
        >
          {t`Créer un tag`}
        </Button>
      </Flex>

      {/* Eleven entity types never fit a narrow panel — let the strip scroll. */}
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <Segmented
          onChange={(value) => setEntityType(value as TagEntityType)}
          options={dtoEnums.TagEntityType.map((value) => ({
            value,
            label: t(TAG_ENTITY_TYPE_LABELS[value]),
          }))}
          value={entityType}
        />
      </div>

      {tagsQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {!tagsQuery.isLoading && tags.length === 0 ? (
        <Empty description={t`Aucun tag pour ce type`} />
      ) : null}

      {tags.map((tag) => (
        <Flex align="center" gap={12} key={tag.id}>
          <Tag
            style={{
              background: tag.backgroundColor,
              borderColor: tag.backgroundColor,
              color: tag.textColor,
            }}
          >
            {tag.label}
          </Tag>
          <div style={{ flex: 1 }} />
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => setForm(tag)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(tag)}
              size="small"
            />
          </Tooltip>
        </Flex>
      ))}

      {form === null ? null : (
        <TagFormModal
          accountId={accountId}
          entityType={entityType}
          key={form?.id ?? `create:${entityType}`}
          onClose={() => setForm(null)}
          open
          tag={form}
        />
      )}
    </Flex>
  );
}
