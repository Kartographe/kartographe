// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import {
  actionsWidth,
  COL,
  EXPAND_COLUMN_WIDTH,
  scrollX,
} from "@/components/table/columns";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import {
  PERSONA_STATUS_LABELS,
  PERSONA_TYPE_LABELS,
} from "@/features/personas/labels";
import { PersonaCommentsDrawer } from "@/features/personas/persona-comments-drawer";
import { PersonaFormModal } from "@/features/personas/persona-form-modal";
import {
  PersonaStatusTag,
  PersonaTypeTag,
} from "@/features/personas/persona-tags";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Persona = components["schemas"]["PersonaItem"];
type Status = components["schemas"]["PersonaStatus"];
type Type = components["schemas"]["PersonaType"];
type SortField = components["schemas"]["PersonaSortField"];
type SortOrder = components["schemas"]["SortOrder"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/personas"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function PersonasList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Persona | undefined>(undefined);
  const [commented, setCommented] = useState<Persona | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tagFilters = useTagFilters(accountId, "persona");

  const personasQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/personas",
    {
      params: {
        path: { account_id: accountId },
        query: {
          page,
          limit,
          sortBy,
          sortOrder,
          ...(statuses.length ? { status: statuses } : {}),
          ...(types.length ? { type: types } : {}),
          ...(tagIds.length ? { tagIds } : {}),
        },
      },
    }
  );

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Persona supprimé` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas/{persona_id}/lock",
    { meta: { successMessage: t`Persona verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas/{persona_id}/unlock",
    { meta: { successMessage: t`Persona déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  const personas = personasQuery.data?.items ?? [];
  const total = personasQuery.data?.count ?? 0;
  const hasFilters =
    statuses.length > 0 || types.length > 0 || tagIds.length > 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(persona: Persona) {
    setEditing(persona);
    setFormOpen(true);
  }

  async function changeStatus(persona: Persona, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, persona_id: persona.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(persona: Persona, type: Type) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, persona_id: persona.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(persona: Persona, tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, persona_id: persona.id } },
      body: { tagIds },
    });
    invalidate();
  }

  async function toggleLock(persona: Persona) {
    const mutation = persona.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, persona_id: persona.id } },
    });
    invalidate();
  }

  function confirmDelete(persona: Persona) {
    modal.confirm({
      title: t`Supprimer ${persona.title} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, persona_id: persona.id } },
        });
        invalidate();
      },
    });
  }

  const antdOrder = (field: SortField): "ascend" | "descend" | null => {
    if (sortBy !== field) {
      return null;
    }
    return sortOrder === "asc" ? "ascend" : "descend";
  };

  const onChange: TableProps<Persona>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    setPage(pagination.current ?? 1);
    setLimit((pagination.pageSize as 10 | 25 | 50 | 100) ?? 25);
    setStatuses((filters.status as Status[] | null) ?? []);
    setTypes((filters.type as Type[] | null) ?? []);
    setTagIds((filters.tags as string[] | null) ?? []);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

  const formModal = (
    <PersonaFormModal
      accountId={accountId}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
      persona={editing}
    />
  );

  const columns: TableProps<Persona>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: antdOrder("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, persona) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={persona.locked}
            lockedBy={persona.lockedBy}
            lockedDate={persona.lockedDate}
          />
          <Typography.Text ellipsis>{title}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: antdOrder("type"),
      width: COL.type,
      filters: dtoEnums.PersonaType.map((value) => ({
        text: t(PERSONA_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type, persona) => (
        <PersonaTypeTag
          loading={typeMutation.isPending}
          onChange={
            persona.locked ? undefined : (next) => changeType(persona, next)
          }
          type={type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: antdOrder("status"),
      width: COL.status,
      filters: dtoEnums.PersonaStatus.map((value) => ({
        text: t(PERSONA_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status, persona) => (
        <PersonaStatusTag
          loading={statusMutation.isPending}
          onChange={
            persona.locked ? undefined : (next) => changeStatus(persona, next)
          }
          status={status}
        />
      ),
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: tagIds.length ? tagIds : null,
      render: (tags: Persona["tags"], persona) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="persona"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(persona, next)}
          readOnly={persona.locked}
          tags={tags}
          value={persona.tagIds}
        />
      ),
    },
    {
      title: t`Créé le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      sorter: true,
      sortOrder: antdOrder("date"),
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 4 : 3 }),
      render: (_, persona) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={persona.locked}
              onToggle={() => toggleLock(persona)}
              pending={lockPending}
            />
          ) : null}
          <Tooltip title={t`Commentaires`}>
            <Button
              icon={<CommentOutlined />}
              onClick={() => setCommented(persona)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={persona.locked ? t`Persona verrouillé` : t`Modifier`}>
            <Button
              disabled={persona.locked}
              icon={<EditOutlined />}
              onClick={() => openEdit(persona)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={persona.locked ? t`Persona verrouillé` : t`Supprimer`}
          >
            <Button
              danger
              disabled={persona.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(persona)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !hasFilters && !personasQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Personas`}
        </Typography.Title>
        <Empty
          description={t`Aucun persona sur ce compte. Décrivez les archétypes d'utilisateurs de votre produit.`}
        >
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer un persona`}
          </Button>
        </Empty>
        {formModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Personas`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un persona`}
        </Button>
      </Flex>

      <Table<Persona>
        columns={columns}
        dataSource={personas}
        // A persona has no page of its own — its description would be invisible
        // anywhere else.
        expandable={{
          expandedRowRender: (persona) => (
            <RichTextView value={persona.description} />
          ),
          rowExpandable: (persona) => !isRichTextEmpty(persona.description),
        }}
        loading={personasQuery.isLoading}
        onChange={onChange}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        rowKey="id"
        scroll={scrollX(columns, EXPAND_COLUMN_WIDTH)}
        size="small"
      />

      {formModal}
      <PersonaCommentsDrawer
        accountId={accountId}
        onClose={() => setCommented(undefined)}
        persona={commented}
      />
    </Flex>
  );
}
