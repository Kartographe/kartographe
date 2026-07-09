import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { RoutePath } from "@/components/route-path";
import { RouteMethodTag } from "@/features/applications/application-tags";
import { CommentsFeed } from "@/features/applications/comments/comments-feed";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type ApplicationRoute = components["schemas"]["ApplicationRouteItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}/comments",
];

interface RouteCommentsDrawerProps {
  accountId: string;
  applicationId: string;
  /** The drawer is open exactly when a route is passed. */
  route: ApplicationRoute | undefined;
  onClose: () => void;
}

export function RouteCommentsDrawer({
  accountId,
  applicationId,
  route,
  onClose,
}: RouteCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    application_id: applicationId,
    route_id: route?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}/comments",
    { params: { path } },
    { enabled: !!route }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}/comments",
    { meta: { successMessage: t`Commentaire publié` } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={!!route}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        route ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <RouteMethodTag method={route.method} />
            <RoutePath path={route.path} size={13} />
          </Flex>
        ) : (
          t`Commentaires`
        )
      }
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
