import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import { CommentsFeed } from "@/features/comments/comments-feed";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/comments",
];

export function CommentsScreen({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = { account_id: accountId, application_id: applicationId };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/comments",
    { params: { path } }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/comments",
    { meta: { successMessage: t`Commentaire publié` } }
  );

  const comments = commentsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Flex gap={20} vertical>
      <Flex align="center" gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Commentaires`}
        </Typography.Title>
        {comments.length > 0 ? (
          <Badge
            color="var(--ant-color-fill-secondary)"
            count={comments.length}
            style={{ color: "var(--ant-color-text)" }}
          />
        ) : null}
      </Flex>

      <CommentsFeed
        accountId={accountId}
        comments={comments}
        isLoading={commentsQuery.isLoading}
        isPublishing={createMutation.isPending}
        onChanged={invalidate}
        onPublish={publish}
      />
    </Flex>
  );
}
