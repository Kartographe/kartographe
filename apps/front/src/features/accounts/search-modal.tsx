// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Empty,
  Flex,
  Input,
  List,
  Modal,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { resolveEntityLink } from "@/features/search/entity-link";
import {
  SEARCH_ENTITY_TYPE_COLORS,
  SEARCH_ENTITY_TYPE_ICONS,
  SEARCH_ENTITY_TYPE_LABELS,
} from "@/features/search/search-labels";

type SearchResult = components["schemas"]["SearchResultItem"];

const QUICK_LIMIT = 8;
const DEBOUNCE_MS = 250;

interface SearchModalProps {
  accountId: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Global quick-search palette (⌘K). Live results as you type; Enter or the
 * footer link opens the full search page. Inert without an active account.
 */
export function SearchModal({ accountId, open, onClose }: SearchModalProps) {
  const { t } = useLingui();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  // Reset on every open so the palette always starts blank.
  useEffect(() => {
    if (open) {
      setInput("");
      setDebounced("");
    }
  }, [open]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);

  const enabled = open && !!accountId && debounced.length > 0;

  const searchQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/search",
    {
      params: {
        path: { account_id: accountId ?? "" },
        query: { q: debounced, page: 1, limit: QUICK_LIMIT },
      },
    },
    { enabled }
  );

  const results = searchQuery.data?.items ?? [];
  const count = searchQuery.data?.count ?? 0;

  function openFullSearch() {
    if (!(accountId && debounced)) {
      return;
    }
    onClose();
    navigate({
      to: "/accounts/$accountId/search",
      params: { accountId },
      search: { q: debounced },
    });
  }

  return (
    <Modal
      closable={false}
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      styles={{ body: { paddingTop: 8 } }}
      title={null}
    >
      <Input
        autoFocus
        onChange={(event) => setInput(event.target.value)}
        onPressEnter={openFullSearch}
        placeholder={t`Rechercher dans le compte…`}
        prefix={<SearchOutlined />}
        size="large"
        value={input}
      />

      <div style={{ marginTop: 12 }}>
        {enabled ? (
          <QuickResults
            accountId={accountId ?? ""}
            count={count}
            loading={searchQuery.isLoading}
            onNavigate={onClose}
            onSeeAll={openFullSearch}
            results={results}
          />
        ) : (
          <Empty
            description={t`Tapez pour rechercher partout dans le compte.`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: "24px 0" }}
          />
        )}
      </div>
    </Modal>
  );
}

function QuickResults({
  accountId,
  count,
  loading,
  onNavigate,
  onSeeAll,
  results,
}: {
  accountId: string;
  count: number;
  loading: boolean;
  onNavigate: () => void;
  onSeeAll: () => void;
  results: SearchResult[];
}) {
  const { t } = useLingui();

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  }
  if (results.length === 0) {
    return (
      <Empty
        description={t`Aucun résultat.`}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: "24px 0" }}
      />
    );
  }

  return (
    <>
      <List
        dataSource={results}
        renderItem={(result) => (
          <QuickResultRow
            accountId={accountId}
            onNavigate={onNavigate}
            result={result}
          />
        )}
        size="small"
      />
      <Flex justify="center" style={{ paddingTop: 8 }}>
        <Typography.Link onClick={onSeeAll}>
          {t`Voir tous les résultats (${count})`} <ArrowRightOutlined />
        </Typography.Link>
      </Flex>
    </>
  );
}

function QuickResultRow({
  accountId,
  onNavigate,
  result,
}: {
  accountId: string;
  onNavigate: () => void;
  result: SearchResult;
}) {
  const { t } = useLingui();
  const resource = result.resource;
  if (!resource) {
    return null;
  }
  const link = resolveEntityLink(accountId, resource);
  const ancestors = resource.parents.map((parent) => parent.label);
  const context =
    result.entityType === "comment"
      ? [...ancestors, resource.label]
      : ancestors;

  return (
    <Link
      onClick={onNavigate}
      params={link.params}
      style={{ color: "inherit", display: "block" }}
      to={link.to}
    >
      <Flex
        align="center"
        className="transition-colors hover:bg-(--ant-color-fill-tertiary)"
        gap={10}
        style={{ borderRadius: 8, padding: "8px 10px" }}
      >
        <span
          style={{ color: "var(--ant-color-text-secondary)", flex: "none" }}
        >
          {SEARCH_ENTITY_TYPE_ICONS[result.entityType]}
        </span>
        <Flex style={{ flex: 1, minWidth: 0 }} vertical>
          <Typography.Text ellipsis>{result.label}</Typography.Text>
          {context.length > 0 ? (
            <Typography.Text ellipsis style={{ fontSize: 11 }} type="secondary">
              {context.join(" › ")}
            </Typography.Text>
          ) : null}
        </Flex>
        <Tag
          color={SEARCH_ENTITY_TYPE_COLORS[result.entityType]}
          style={{ flex: "none", marginInlineEnd: 0 }}
        >
          {t(SEARCH_ENTITY_TYPE_LABELS[result.entityType])}
        </Tag>
      </Flex>
    </Link>
  );
}
