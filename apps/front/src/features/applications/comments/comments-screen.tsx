import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Divider, Empty, Flex, Spin, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import { CommentAvatar } from "@/features/applications/comments/comment-avatar";
import { CommentThread } from "@/features/applications/comments/comment-thread";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { EMPTY_RICH_TEXT, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { RichTextEditor } from "@/lib/rich-text/rich-text-editor";

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
  const users = useAccountUserMap(accountId);
  const me = useCurrentUser().data?.item;
  const [draft, setDraft] = useState<RichTextDocument>(EMPTY_RICH_TEXT);
  // The editor is uncontrolled once mounted — remount it to clear the draft.
  const [editorKey, setEditorKey] = useState(0);

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

  async function publish() {
    await createMutation.mutateAsync({
      params: { path },
      body: { value: draft },
    });
    setDraft(EMPTY_RICH_TEXT);
    setEditorKey((key) => key + 1);
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

      <Flex gap={12}>
        <CommentAvatar user={me ? { ...me } : undefined} />
        <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
          <RichTextEditor
            key={editorKey}
            onChange={setDraft}
            placeholder={t`Écrire un commentaire`}
            value={draft}
          />
          <Button
            disabled={isRichTextEmpty(draft)}
            loading={createMutation.isPending}
            onClick={publish}
            style={{ alignSelf: "flex-end" }}
            type="primary"
          >
            {t`Publier`}
          </Button>
        </Flex>
      </Flex>

      <Divider style={{ margin: 0 }} />

      {commentsQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 120 }}>
          <Spin />
        </Flex>
      ) : null}

      {!commentsQuery.isLoading && comments.length === 0 ? (
        <Empty description={t`Aucun commentaire`} />
      ) : null}

      <Flex gap={28} vertical>
        {comments.map((comment) => (
          <CommentThread
            accountId={accountId}
            comment={comment}
            key={comment.id}
            onChanged={invalidate}
            users={users}
          />
        ))}
      </Flex>
    </Flex>
  );
}
