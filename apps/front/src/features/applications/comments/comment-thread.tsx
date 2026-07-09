import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Flex, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import type { AccountUserLookup } from "@/features/accounts/use-account-user-map";
import { CommentAvatar } from "@/features/applications/comments/comment-avatar";
import { CommentDate } from "@/features/applications/comments/comment-date";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import {
  asRichText,
  EMPTY_RICH_TEXT,
  isRichTextEmpty,
} from "@/lib/rich-text/rich-text";
import { RichTextEditor } from "@/lib/rich-text/rich-text-editor";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Comment = components["schemas"]["CommentItem"];

interface CommentThreadProps {
  accountId: string;
  comment: Comment;
  users: AccountUserLookup;
  onChanged: () => void;
  /** Replies cannot themselves be replied to. */
  isReply?: boolean;
}

export function CommentThread({
  accountId,
  comment,
  users,
  onChanged,
  isReply = false,
}: CommentThreadProps) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RichTextDocument>(
    asRichText(comment.value)
  );
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] =
    useState<RichTextDocument>(EMPTY_RICH_TEXT);
  // The editor is uncontrolled once mounted — remount it to clear the draft.
  const [replyEditorKey, setReplyEditorKey] = useState(0);

  const repliesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/comments/{comment_id}/replies",
    { params: { path: { account_id: accountId, comment_id: comment.id } } },
    { enabled: !isReply }
  );
  const replyMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/comments/{comment_id}/replies",
    { meta: { successMessage: t`Réponse publiée` } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/comments/{comment_id}",
    { meta: { successMessage: t`Commentaire modifié` } }
  );
  const removeMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/comments/{comment_id}/remove",
    { meta: { successMessage: t`Commentaire retiré` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/comments/{comment_id}",
    { meta: { successMessage: t`Commentaire supprimé` } }
  );

  const replies = repliesQuery.data?.items ?? [];
  const isRemoved = comment.status === "removed";
  const author = users.user(comment.ownerId);

  function invalidateReplies() {
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/comments/{comment_id}/replies",
      ],
    });
  }

  async function submitReply() {
    await replyMutation.mutateAsync({
      params: { path: { account_id: accountId, comment_id: comment.id } },
      body: { value: replyDraft },
    });
    setReplyDraft(EMPTY_RICH_TEXT);
    setReplyEditorKey((key) => key + 1);
    setReplying(false);
    invalidateReplies();
  }

  async function submitEdit() {
    await updateMutation.mutateAsync({
      params: { path: { account_id: accountId, comment_id: comment.id } },
      body: { value: draft },
    });
    setEditing(false);
    onChanged();
    invalidateReplies();
  }

  async function remove() {
    await removeMutation.mutateAsync({
      params: { path: { account_id: accountId, comment_id: comment.id } },
    });
    onChanged();
    invalidateReplies();
  }

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ce commentaire ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, comment_id: comment.id } },
        });
        onChanged();
        invalidateReplies();
      },
    });
  }

  return (
    <Flex gap={12}>
      <CommentAvatar size={isReply ? 28 : 36} user={author} />

      <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
        <Flex align="baseline" gap={8} wrap>
          <Typography.Text strong>
            {users.name(comment.ownerId)}
          </Typography.Text>
          <CommentDate date={comment.date} />
          {isRemoved ? <Tag>{t`Retiré`}</Tag> : null}
        </Flex>

        {editing ? (
          <Flex gap={8} vertical>
            <RichTextEditor onChange={setDraft} value={draft} />
            <Space>
              <Button
                disabled={isRichTextEmpty(draft)}
                loading={updateMutation.isPending}
                onClick={submitEdit}
                size="small"
                type="primary"
              >
                {t`Enregistrer`}
              </Button>
              <Button onClick={() => setEditing(false)} size="small">
                {t`Annuler`}
              </Button>
            </Space>
          </Flex>
        ) : (
          <div
            style={{
              background: "var(--ant-color-fill-quaternary)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            {isRemoved ? (
              <Typography.Text italic type="secondary">
                {t`Ce commentaire a été retiré.`}
              </Typography.Text>
            ) : (
              <RichTextView value={comment.value} />
            )}
          </div>
        )}

        {isRemoved || editing ? null : (
          <Flex gap={4}>
            {isReply ? null : (
              <Button
                onClick={() => setReplying(!replying)}
                size="small"
                type="text"
              >
                {t`Répondre`}
              </Button>
            )}
            <Button onClick={() => setEditing(true)} size="small" type="text">
              {t`Modifier`}
            </Button>
            <Button onClick={remove} size="small" type="text">
              {t`Retirer`}
            </Button>
            <Button danger onClick={confirmDelete} size="small" type="text">
              {t`Supprimer`}
            </Button>
          </Flex>
        )}

        {replying ? (
          <Flex gap={8} vertical>
            <RichTextEditor
              key={replyEditorKey}
              onChange={setReplyDraft}
              placeholder={t`Votre réponse`}
              value={replyDraft}
            />
            <Space>
              <Button
                disabled={isRichTextEmpty(replyDraft)}
                loading={replyMutation.isPending}
                onClick={submitReply}
                size="small"
                type="primary"
              >
                {t`Publier`}
              </Button>
              <Button onClick={() => setReplying(false)} size="small">
                {t`Annuler`}
              </Button>
            </Space>
          </Flex>
        ) : null}

        {replies.length > 0 ? (
          <Flex
            gap={20}
            style={{
              borderInlineStart: "2px solid var(--ant-color-border-secondary)",
              marginTop: 4,
              paddingInlineStart: 16,
            }}
            vertical
          >
            {replies.map((reply) => (
              <CommentThread
                accountId={accountId}
                comment={reply}
                isReply
                key={reply.id}
                onChanged={invalidateReplies}
                users={users}
              />
            ))}
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  );
}
