// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Divider, Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { ComplexityPanel } from "@/features/complexity/complexity-panel";
import { invalidateEntityQueries } from "@/features/entities/invalidate-entity";
import { VotesPanel } from "@/features/votes/votes-panel";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type BoundedContext = components["schemas"]["ApplicationBoundedContextItem"];

const COMMENTS_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}/comments";

interface BoundedContextActivityDrawerProps {
  accountId: string;
  applicationId: string;
  /** The drawer is open exactly when a bounded context is passed. */
  boundedContext: BoundedContext | undefined;
  onClose: () => void;
}

/**
 * Everything that happens *around* a bounded context — votes, complexity
 * estimates and the comment thread — in one drawer, since a context has no page
 * of its own.
 */
export function BoundedContextActivityDrawer({
  accountId,
  applicationId,
  boundedContext,
  onClose,
}: BoundedContextActivityDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    application_id: applicationId,
    bounded_context_id: boundedContext?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    COMMENTS_PATH,
    { params: { path } },
    { enabled: !!boundedContext }
  );
  const createMutation = $api.useMutation("post", COMMENTS_PATH, {
    meta: { successMessage: t`Commentaire publié` },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", COMMENTS_PATH] });
    invalidateEntityQueries(queryClient, "application_bounded_context");
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={!!boundedContext}
      title={boundedContext ? boundedContext.title : t`Contexte borné`}
      width={560}
    >
      {boundedContext ? (
        <Flex gap={16} vertical>
          <VotesPanel
            accountId={accountId}
            entityId={boundedContext.id}
            entityType="application_bounded_context"
          />
          <Divider style={{ margin: 0 }} />
          <ComplexityPanel
            accountId={accountId}
            entityId={boundedContext.id}
            entityType="application_bounded_context"
          />
          <Divider style={{ margin: 0 }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t`Commentaires`}
          </Typography.Title>
          <CommentsFeed
            accountId={accountId}
            comments={commentsQuery.data?.items ?? []}
            isLoading={commentsQuery.isLoading}
            isPublishing={createMutation.isPending}
            onChanged={invalidate}
            onPublish={publish}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
