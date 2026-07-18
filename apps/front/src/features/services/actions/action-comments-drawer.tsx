// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { MethodTag } from "@/components/method-tag";
import { RoutePath } from "@/components/route-path";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { invalidateEntityQueries } from "@/features/entities/invalidate-entity";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type ServiceAction = components["schemas"]["ServiceActionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}/comments",
];

interface ActionCommentsDrawerProps {
  accountId: string;
  serviceId: string;
  /** The drawer is open exactly when an action is passed. */
  action: ServiceAction | undefined;
  onClose: () => void;
}

/** An event or a job carries neither method nor path — fall back to its title. */
function ActionHeading({ action }: { action: ServiceAction }) {
  return (
    <Flex align="center" gap={12} style={{ minWidth: 0 }}>
      {action.method ? <MethodTag method={action.method} /> : null}
      {action.path ? (
        <RoutePath path={action.path} size={13} />
      ) : (
        <Typography.Text ellipsis>{action.title}</Typography.Text>
      )}
    </Flex>
  );
}

export function ActionCommentsDrawer({
  accountId,
  serviceId,
  action,
  onClose,
}: ActionCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    service_id: serviceId,
    action_id: action?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}/comments",
    { params: { path } },
    { enabled: !!action }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}/comments",
    { meta: { successMessage: t`Commentaire publié` } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    invalidateEntityQueries(queryClient, "service_action");
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={!!action}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={action ? <ActionHeading action={action} /> : t`Commentaires`}
      width={520}
    >
      <CommentsFeed
        accountId={accountId}
        comments={commentsQuery.data?.items ?? []}
        fillHeight
        isLoading={commentsQuery.isLoading}
        isPublishing={createMutation.isPending}
        onChanged={invalidate}
        onPublish={publish}
      />
    </Drawer>
  );
}
