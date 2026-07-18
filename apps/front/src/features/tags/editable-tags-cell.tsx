// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Divider, Empty, Flex, Input, Popover, Tag } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  DEFAULT_TAG_BACKGROUND,
  DEFAULT_TAG_TEXT,
} from "@/features/tags/labels";

type TagItem = components["schemas"]["TagItem"];
type TagEntityType = components["schemas"]["TagEntityType"];

interface EditableTagsCellProps {
  accountId: string;
  /** Only tags of this type are offered, and created ones inherit it. */
  entityType: TagEntityType;
  /** The row's current tag ids. */
  value: string[];
  /** The row's resolved tags (for coloured display). */
  tags: TagItem[] | undefined;
  /** Persist the new set of tag ids (the caller PATCHes the row). */
  onChange: (tagIds: string[]) => void;
  /** A change is being persisted — interactions are frozen until it lands. */
  loading?: boolean;
  /** Display-only: show the chips without detach/attach affordances (locked). */
  readOnly?: boolean;
}

/**
 * Inline tag editor for a listing row: coloured, closable chips to detach a
 * tag, and a `+` chip opening a picker to attach an existing tag or create one
 * on the spot. The `+` popover reuses the same create flow as `TagsField`.
 */
export function EditableTagsCell({
  accountId,
  entityType,
  value,
  tags,
  onChange,
  loading = false,
  readOnly = false,
}: EditableTagsCellProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const tagsQuery = $api.useQuery("get", "/v1/accounts/{account_id}/tags", {
    params: { path: { account_id: accountId }, query: { type: entityType } },
  });
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/tags",
    { meta: { successMessage: t`Tag créé`, noErrorToast: true } }
  );

  const allTags = tagsQuery.data?.items ?? [];
  const trimmed = search.trim();
  const lower = trimmed.toLowerCase();
  const filtered = allTags.filter((tag) =>
    tag.label.toLowerCase().includes(lower)
  );
  const exists = allTags.some((tag) => tag.label.toLowerCase() === lower);
  const canCreate = trimmed.length > 0 && !exists;

  function detach(tagId: string) {
    onChange(value.filter((id) => id !== tagId));
  }

  function toggle(tagId: string) {
    onChange(
      value.includes(tagId)
        ? value.filter((id) => id !== tagId)
        : [...value, tagId]
    );
  }

  async function create() {
    const created = await createMutation.mutateAsync({
      params: { path: { account_id: accountId } },
      body: {
        entityType,
        label: trimmed,
        backgroundColor: DEFAULT_TAG_BACKGROUND,
        textColor: DEFAULT_TAG_TEXT,
      },
    });
    await queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/tags"],
    });
    setSearch("");
    onChange([...value, created.item.id]);
  }

  const picker = (
    <Flex gap={4} style={{ width: 240 }} vertical>
      <Input
        allowClear
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t`Rechercher…`}
        value={search}
      />
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {filtered.map((tag) => {
          const active = value.includes(tag.id);
          return (
            <Button
              block
              disabled={loading}
              icon={active ? <CheckOutlined /> : null}
              key={tag.id}
              onClick={() => toggle(tag.id)}
              style={{ justifyContent: "flex-start" }}
              type="text"
            >
              {tag.label}
            </Button>
          );
        })}
        {filtered.length === 0 && !canCreate ? (
          <Empty
            description={t`Aucun tag`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : null}
      </div>
      {canCreate ? (
        <>
          <Divider style={{ margin: "4px 0" }} />
          <Button
            block
            icon={<PlusOutlined />}
            loading={createMutation.isPending}
            onClick={create}
            style={{ justifyContent: "flex-start" }}
            type="text"
          >
            {t`Créer « ${trimmed} »`}
          </Button>
        </>
      ) : null}
    </Flex>
  );

  return (
    <Flex align="center" gap={4} wrap>
      {(tags ?? []).map((tag) => (
        <Tag
          closable={!(loading || readOnly)}
          key={tag.id}
          onClose={(event) => {
            event.preventDefault();
            detach(tag.id);
          }}
          style={{
            background: tag.backgroundColor,
            borderColor: tag.backgroundColor,
            color: tag.textColor,
            marginInlineEnd: 0,
          }}
        >
          {tag.label}
        </Tag>
      ))}
      {readOnly ? null : (
        <Popover
          content={picker}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setSearch("");
            }
          }}
          open={open}
          placement="bottomLeft"
          trigger="click"
        >
          <Tag
            style={{
              borderStyle: "dashed",
              cursor: loading ? "not-allowed" : "pointer",
              marginInlineEnd: 0,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <PlusOutlined />
          </Tag>
        </Popover>
      )}
    </Flex>
  );
}
