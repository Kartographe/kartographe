import { useLingui } from "@lingui/react/macro";
import { Button, Divider, Empty, Flex, Spin } from "antd";
import { useState } from "react";
import type { components } from "@/api/generated/schema";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import { CommentAvatar } from "@/features/comments/comment-avatar";
import { CommentThread } from "@/features/comments/comment-thread";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { EMPTY_RICH_TEXT, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { RichTextEditor } from "@/lib/rich-text/rich-text-editor";

type Comment = components["schemas"]["CommentItem"];

interface CommentsFeedProps {
  accountId: string;
  comments: Comment[];
  isLoading: boolean;
  isPublishing: boolean;
  /** Posts a new top-level comment; the caller owns the endpoint. */
  onPublish: (value: RichTextDocument) => Promise<void>;
  /** Called after a comment is edited, removed or deleted. */
  onChanged: () => void;
  /**
   * Claim the parent's full height, scroll the history on its own and pin the
   * composer to the bottom. For containers with a height to fill (the drawer);
   * a page-flow caller leaves this off and grows with its content.
   */
  fillHeight?: boolean;
}

/** Newest first: the latest comment is the one worth landing on. */
function newestFirst(comments: Comment[]): Comment[] {
  return [...comments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Thread list + composer, shared by every entity that carries comments
 * (application, route, …). The caller wires the entity's own endpoints.
 *
 * Comments run newest first, so the latest activity is what greets the reader.
 * The composer closes the list rather than heading it, and stays folded behind
 * a button until the user means to write, so the editor never competes with the
 * thread.
 */
export function CommentsFeed({
  accountId,
  comments,
  isLoading,
  isPublishing,
  onPublish,
  onChanged,
  fillHeight = false,
}: CommentsFeedProps) {
  const { t } = useLingui();
  const users = useAccountUserMap(accountId);
  const me = useCurrentUser().data?.item;
  const [isComposing, setIsComposing] = useState(false);
  const [draft, setDraft] = useState<RichTextDocument>(EMPTY_RICH_TEXT);
  // The editor is uncontrolled once mounted — remount it to clear the draft.
  const [editorKey, setEditorKey] = useState(0);

  function resetComposer() {
    setDraft(EMPTY_RICH_TEXT);
    setEditorKey((key) => key + 1);
    setIsComposing(false);
  }

  async function publish() {
    await onPublish(draft);
    resetComposer();
  }

  const history = (
    <>
      {isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 120 }}>
          <Spin />
        </Flex>
      ) : null}

      {!isLoading && comments.length === 0 ? (
        <Empty description={t`Aucun commentaire`} />
      ) : null}

      {comments.length > 0 ? (
        <Flex gap={28} vertical>
          {newestFirst(comments).map((comment) => (
            <CommentThread
              accountId={accountId}
              comment={comment}
              key={comment.id}
              onChanged={onChanged}
              users={users}
            />
          ))}
        </Flex>
      ) : null}
    </>
  );

  return (
    <Flex
      gap={20}
      style={fillHeight ? { height: "100%", minHeight: 0 } : undefined}
      vertical
    >
      {/* `minHeight: 0` lets this flex child shrink below its content and scroll. */}
      <div
        style={
          fillHeight ? { flex: 1, minHeight: 0, overflowY: "auto" } : undefined
        }
      >
        {history}
      </div>

      <Divider style={{ margin: 0 }} />

      <Flex gap={12} style={fillHeight ? { flexShrink: 0 } : undefined}>
        <CommentAvatar user={me ? { ...me } : undefined} />
        <Flex style={{ flex: 1, minWidth: 0 }}>
          {isComposing ? (
            <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
              <RichTextEditor
                key={editorKey}
                onChange={setDraft}
                placeholder={t`Écrire un commentaire`}
                value={draft}
              />
              <Flex gap={8} justify="flex-end">
                <Button disabled={isPublishing} onClick={resetComposer}>
                  {t`Annuler`}
                </Button>
                <Button
                  disabled={isRichTextEmpty(draft)}
                  loading={isPublishing}
                  onClick={publish}
                  type="primary"
                >
                  {t`Publier`}
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Button
              block
              onClick={() => setIsComposing(true)}
              style={{ justifyContent: "flex-start" }}
              type="dashed"
            >
              {t`Écrire un commentaire`}
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
