import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { PersonaTypeTag } from "@/features/personas/persona-tags";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type Persona = components["schemas"]["PersonaItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/personas/{persona_id}/comments",
];

interface PersonaCommentsDrawerProps {
  accountId: string;
  /** The drawer is open exactly when a persona is passed. */
  persona: Persona | undefined;
  onClose: () => void;
}

export function PersonaCommentsDrawer({
  accountId,
  persona,
  onClose,
}: PersonaCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = { account_id: accountId, persona_id: persona?.id ?? "" };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/personas/{persona_id}/comments",
    { params: { path } },
    { enabled: !!persona }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas/{persona_id}/comments",
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
      open={!!persona}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        persona ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Typography.Text ellipsis strong>
              {persona.title}
            </Typography.Text>
            <PersonaTypeTag type={persona.type} />
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
