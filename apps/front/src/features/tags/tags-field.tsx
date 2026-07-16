// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Divider, Flex, Form, Select, Tag } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  DEFAULT_TAG_BACKGROUND,
  DEFAULT_TAG_TEXT,
} from "@/features/tags/labels";

type TagEntityType = components["schemas"]["TagEntityType"];

interface TagsFieldProps {
  accountId: string;
  /** Only tags of this type are offered, and created ones inherit it. */
  entityType: TagEntityType;
  value: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
}

/**
 * Picks the tags of an entity, and creates the missing one on the spot.
 *
 * A tag belongs to exactly one `entityType`, so a label typed here can only
 * ever create a tag of *this* form's type — never reuse one attached to
 * something else that happens to share the wording. The new tag takes the
 * default colours; the administration screen is where they get refined.
 */
export function TagsField({
  accountId,
  entityType,
  value,
  onChange,
  label,
}: TagsFieldProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const tagsQuery = $api.useQuery("get", "/v1/accounts/{account_id}/tags", {
    params: { path: { account_id: accountId }, query: { type: entityType } },
  });
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/tags",
    { meta: { successMessage: t`Tag créé`, noErrorToast: true } }
  );

  const tags = tagsQuery.data?.items ?? [];
  const trimmed = search.trim();
  const exists = tags.some(
    (tag) => tag.label.toLowerCase() === trimmed.toLowerCase()
  );
  const canCreate = trimmed.length > 0 && !exists;

  async function createTag() {
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

  return (
    <Form.Item label={label ?? t`Tags`}>
      <Select
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        loading={tagsQuery.isLoading}
        mode="multiple"
        // `searchValue` is controlled, so antd will not clear it for us.
        onChange={(tagIds: string[]) => {
          onChange(tagIds);
          setSearch("");
        }}
        onSearch={setSearch}
        options={tags.map((tag) => ({ value: tag.id, label: tag.label }))}
        placeholder={t`Aucun tag`}
        popupRender={(menu) => (
          <>
            {menu}
            {canCreate ? (
              <>
                <Divider style={{ margin: "4px 0" }} />
                <Flex style={{ padding: 4 }}>
                  <Button
                    block
                    icon={<PlusOutlined />}
                    loading={createMutation.isPending}
                    onClick={createTag}
                    // The select closes on blur before a click lands otherwise.
                    onMouseDown={(event) => event.preventDefault()}
                    type="text"
                  >
                    {t`Créer le tag « ${trimmed} »`}
                  </Button>
                </Flex>
              </>
            ) : null}
          </>
        )}
        searchValue={search}
        tagRender={({ value: tagId, onClose }) => {
          const tag = tags.find((candidate) => candidate.id === tagId);
          if (!tag) {
            return <span />;
          }
          return (
            <Tag
              closable
              onClose={onClose}
              style={{
                background: tag.backgroundColor,
                borderColor: tag.backgroundColor,
                color: tag.textColor,
                marginInlineEnd: 4,
              }}
            >
              {tag.label}
            </Tag>
          );
        }}
        value={value}
      />
    </Form.Item>
  );
}
