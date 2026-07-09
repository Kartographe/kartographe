/**
 * Rich-text fields (descriptions, comments) travel over the API as free-form
 * document objects. The front stores Tiptap/ProseMirror JSON in them.
 */
export interface RichTextDocument {
  [key: string]: unknown;
}

interface ProseMirrorNode {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
}

export const EMPTY_RICH_TEXT: RichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function asRichText(
  value: RichTextDocument | null | undefined
): RichTextDocument {
  return value && Object.keys(value).length > 0 ? value : EMPTY_RICH_TEXT;
}

function collectText(node: ProseMirrorNode): string {
  if (typeof node.text === "string") {
    return node.text;
  }
  if (!Array.isArray(node.content)) {
    return "";
  }
  const parts = node.content.map(collectText).filter(Boolean);
  return node.type === "paragraph" ? parts.join("") : parts.join(" ");
}

/** Flattens a document to plain text — for table cells, tooltips, previews. */
export function richTextToPlainText(
  document: RichTextDocument | null | undefined
): string {
  if (!document) {
    return "";
  }
  return collectText(document as ProseMirrorNode).trim();
}

export function isRichTextEmpty(
  document: RichTextDocument | null | undefined
): boolean {
  return richTextToPlainText(document).length === 0;
}
