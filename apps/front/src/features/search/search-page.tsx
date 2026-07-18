// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { RightOutlined, SearchOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  Empty,
  Flex,
  Input,
  Pagination,
  Result,
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
  SEARCH_ENTITY_TYPE_ORDER,
} from "@/features/search/search-labels";

type SearchResult = components["schemas"]["SearchResultItem"];
type SearchEntityType = components["schemas"]["SearchEntityType"];

const LIMIT = 25;
const DEBOUNCE_MS = 300;

interface SearchPageProps {
  accountId: string;
  query: string;
  onQueryChange: (query: string) => void;
}

export function SearchPage({
  accountId,
  query,
  onQueryChange,
}: SearchPageProps) {
  const { t } = useLingui();

  const [input, setInput] = useState(query);
  const [types, setTypes] = useState<SearchEntityType[]>([]);
  const [page, setPage] = useState(1);

  // Debounce the text field into the URL query (the single source of truth).
  useEffect(() => {
    const id = setTimeout(() => {
      if (input.trim() !== query) {
        onQueryChange(input.trim());
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input, query, onQueryChange]);

  // Any new query or facet selection restarts pagination.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page when query/types change
  useEffect(() => setPage(1), [query, types]);

  const enabled = query.trim().length > 0;

  const searchQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/search",
    {
      params: {
        path: { account_id: accountId },
        query: {
          q: query,
          page,
          limit: LIMIT,
          ...(types.length ? { entityType: types } : {}),
        },
      },
    },
    { enabled }
  );

  const countsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/search/counts",
    { params: { path: { account_id: accountId }, query: { q: query } } },
    { enabled }
  );

  const counts = countsQuery.data?.item.counts;
  const total = countsQuery.data?.item.total ?? 0;
  const results = searchQuery.data?.items ?? [];
  const count = searchQuery.data?.count ?? 0;

  function toggleType(type: SearchEntityType) {
    setTypes((current) =>
      current.includes(type)
        ? current.filter((value) => value !== type)
        : [...current, type]
    );
  }

  return (
    <Flex
      gap={20}
      style={{ margin: "0 auto", maxWidth: 820, width: "100%" }}
      vertical
    >
      <div>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          {t`Recherche`}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t`Retrouvez fonctionnalités, parcours, bases de données, services, commentaires…`}
        </Typography.Text>
      </div>

      <Input
        allowClear
        autoFocus
        onChange={(event) => setInput(event.target.value)}
        placeholder={t`Rechercher dans le compte…`}
        prefix={<SearchOutlined />}
        size="large"
        value={input}
      />

      {enabled ? (
        <SearchFacets
          activeTypes={types}
          allLabel={t`Tout (${total})`}
          counts={counts}
          onClear={() => setTypes([])}
          onToggle={toggleType}
        />
      ) : null}

      {enabled ? (
        <SearchResults
          accountId={accountId}
          count={count}
          error={searchQuery.isError}
          limit={LIMIT}
          loading={searchQuery.isLoading}
          onPageChange={setPage}
          page={page}
          results={results}
        />
      ) : (
        <Empty
          description={t`Saisissez un terme pour lancer la recherche.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: "48px 0" }}
        />
      )}
    </Flex>
  );
}

function SearchFacets({
  activeTypes,
  allLabel,
  counts,
  onClear,
  onToggle,
}: {
  activeTypes: SearchEntityType[];
  allLabel: string;
  counts: Record<string, number> | undefined;
  onClear: () => void;
  onToggle: (type: SearchEntityType) => void;
}) {
  const { t } = useLingui();
  if (!counts) {
    return null;
  }
  const available = SEARCH_ENTITY_TYPE_ORDER.filter(
    (type) => (counts[type] ?? 0) > 0
  );
  if (available.length === 0) {
    return null;
  }
  return (
    <Flex gap={8} wrap>
      <Tag.CheckableTag
        checked={activeTypes.length === 0}
        onChange={onClear}
        style={{ borderRadius: 999, padding: "2px 12px" }}
      >
        {allLabel}
      </Tag.CheckableTag>
      {available.map((type) => (
        <Tag.CheckableTag
          checked={activeTypes.includes(type)}
          key={type}
          onChange={() => onToggle(type)}
          style={{ borderRadius: 999, padding: "2px 12px" }}
        >
          {t(SEARCH_ENTITY_TYPE_LABELS[type])} · {counts[type]}
        </Tag.CheckableTag>
      ))}
    </Flex>
  );
}

function SearchResults({
  accountId,
  count,
  error,
  limit,
  loading,
  onPageChange,
  page,
  results,
}: {
  accountId: string;
  count: number;
  error: boolean;
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  results: SearchResult[];
}) {
  const { t } = useLingui();

  if (error) {
    return (
      <Result
        status="error"
        subTitle={t`La recherche a échoué. Réessayez.`}
        title={t`Erreur`}
      />
    );
  }
  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} title={false} />;
  }
  if (results.length === 0) {
    return (
      <Empty
        description={t`Aucun résultat pour cette recherche.`}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: "48px 0" }}
      />
    );
  }

  return (
    <Flex gap={10} vertical>
      {results.map((result) => (
        <SearchResultRow
          accountId={accountId}
          key={result.id}
          result={result}
        />
      ))}
      {count > limit ? (
        <Flex justify="center" style={{ paddingTop: 8 }}>
          <Pagination
            current={page}
            onChange={onPageChange}
            pageSize={limit}
            showSizeChanger={false}
            total={count}
          />
        </Flex>
      ) : (
        <Typography.Text
          style={{ paddingTop: 4, textAlign: "center" }}
          type="secondary"
        >
          {t`${count} résultat(s)`}
        </Typography.Text>
      )}
    </Flex>
  );
}

/** The "where" line: the commented entity + its ancestors for a comment hit,
 *  just the ancestors otherwise (the entity's own label is the row title). */
function resultContext(result: SearchResult): string[] {
  const resource = result.resource;
  if (!resource) {
    return [];
  }
  const ancestors = resource.parents.map((parent) => parent.label);
  return result.entityType === "comment"
    ? [...ancestors, resource.label]
    : ancestors;
}

function SearchResultRow({
  accountId,
  result,
}: {
  accountId: string;
  result: SearchResult;
}) {
  const { t } = useLingui();
  const resource = result.resource;
  const link = resource ? resolveEntityLink(accountId, resource) : null;
  const context = resultContext(result);

  const body = (
    <Flex
      align="center"
      className="transition-colors hover:border-(--ant-color-primary) hover:bg-(--ant-color-fill-quaternary)"
      gap={14}
      style={{
        border: "1px solid var(--ant-color-border-secondary)",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <Flex
        align="center"
        justify="center"
        style={{
          background: "var(--ant-color-fill-tertiary)",
          borderRadius: 8,
          color: "var(--ant-color-text-secondary)",
          flex: "none",
          fontSize: 16,
          height: 36,
          width: 36,
        }}
      >
        {SEARCH_ENTITY_TYPE_ICONS[result.entityType]}
      </Flex>

      <Flex style={{ flex: 1, minWidth: 0 }} vertical>
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <Typography.Text ellipsis strong style={{ flex: 1, minWidth: 0 }}>
            {result.label}
          </Typography.Text>
          <Tag
            color={SEARCH_ENTITY_TYPE_COLORS[result.entityType]}
            style={{ flex: "none", marginInlineEnd: 0 }}
          >
            {t(SEARCH_ENTITY_TYPE_LABELS[result.entityType])}
          </Tag>
        </Flex>
        {context.length > 0 ? (
          <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
            {context.join(" › ")}
          </Typography.Text>
        ) : null}
      </Flex>

      <RightOutlined
        style={{ color: "var(--ant-color-text-quaternary)", flex: "none" }}
      />
    </Flex>
  );

  if (!link) {
    return <div style={{ opacity: 0.6 }}>{body}</div>;
  }

  return (
    <Link
      params={link.params}
      style={{ color: "inherit", display: "block" }}
      to={link.to}
    >
      {body}
    </Link>
  );
}
