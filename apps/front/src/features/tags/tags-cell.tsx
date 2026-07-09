import { Flex, Tag } from "antd";
import type { components } from "@/api/generated/schema";

type TagItem = components["schemas"]["TagItem"];

/**
 * Renders the tags carried by a row, in their own colours.
 *
 * The API resolves `tags` alongside `tagIds`, so nothing is fetched here — a
 * row whose tags were all deleted simply renders the em dash.
 */
export function TagsCell({ tags }: { tags: TagItem[] | undefined }) {
  if (!tags?.length) {
    return <span>—</span>;
  }

  return (
    <Flex gap={4} wrap>
      {tags.map((tag) => (
        <Tag
          key={tag.id}
          style={{
            background: tag.backgroundColor,
            borderColor: tag.backgroundColor,
            color: tag.textColor,
            marginInlineEnd: 0,
          }}
        >
          {tag.label}
        </Tag>
      ))}
    </Flex>
  );
}
