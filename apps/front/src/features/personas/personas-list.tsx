import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RocketOutlined,
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
  PERSONA_STATUS_LABELS,
  PERSONA_TYPE_LABELS,
} from "@/features/personas/labels";
import { PersonaCommentsDrawer } from "@/features/personas/persona-comments-drawer";
import { PersonaFormModal } from "@/features/personas/persona-form-modal";
import {
  PersonaStatusTag,
  PersonaTypeTag,
} from "@/features/personas/persona-tags";
import { TagsCell } from "@/features/tags/tags-cell";
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

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas/{persona_id}/activate",
    { meta: { successMessage: t`Persona activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas/{persona_id}/archive",
    { meta: { successMessage: t`Persona archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Persona supprimé` } }
  );

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

  async function toggleStatus(persona: Persona) {
    const params = { path: { account_id: accountId, persona_id: persona.id } };
    if (persona.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
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
        columns={[
          {
            title: t`Titre`,
            key: "title",
            dataIndex: "title",
            sorter: true,
            sortOrder: antdOrder("title"),
            render: (title: string) => (
              <Typography.Text strong>{title}</Typography.Text>
            ),
          },
          {
            title: t`Type`,
            key: "type",
            dataIndex: "type",
            sorter: true,
            sortOrder: antdOrder("type"),
            filters: dtoEnums.PersonaType.map((value) => ({
              text: t(PERSONA_TYPE_LABELS[value]),
              value,
            })),
            filteredValue: types.length ? types : null,
            render: (type: Type) => <PersonaTypeTag type={type} />,
          },
          {
            title: t`Statut`,
            key: "status",
            dataIndex: "status",
            sorter: true,
            sortOrder: antdOrder("status"),
            filters: dtoEnums.PersonaStatus.map((value) => ({
              text: t(PERSONA_STATUS_LABELS[value]),
              value,
            })),
            filteredValue: statuses.length ? statuses : null,
            render: (status: Status) => <PersonaStatusTag status={status} />,
          },
          {
            title: t`Tags`,
            key: "tags",
            dataIndex: "tags",
            filters: tagFilters,
            filteredValue: tagIds.length ? tagIds : null,
            render: (tags: Persona["tags"]) => <TagsCell tags={tags} />,
          },
          {
            title: t`Créé le`,
            key: "date",
            dataIndex: "date",
            sorter: true,
            sortOrder: antdOrder("date"),
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "—",
          },
          {
            title: "",
            key: "actions",
            align: "right",
            render: (_, persona) => (
              <Space>
                <Tooltip title={t`Commentaires`}>
                  <Button
                    icon={<CommentOutlined />}
                    onClick={() => setCommented(persona)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEdit(persona)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip
                  title={
                    persona.status === "archived" ? t`Activer` : t`Archiver`
                  }
                >
                  <Button
                    icon={
                      persona.status === "archived" ? (
                        <RocketOutlined />
                      ) : (
                        <InboxOutlined />
                      )
                    }
                    onClick={() => toggleStatus(persona)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(persona)}
                    size="small"
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]}
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
