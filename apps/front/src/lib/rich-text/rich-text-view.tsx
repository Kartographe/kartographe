// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";

/** Read-only rendering of a rich-text document. */
export function RichTextView({
  value,
  fallback = "—",
}: {
  value: RichTextDocument | null | undefined;
  fallback?: string;
}) {
  const editor = useEditor({
    content: asRichText(value),
    editable: false,
    extensions: [StarterKit],
    editorProps: { attributes: { class: "km-rich-text km-rich-text-view" } },
  });

  if (isRichTextEmpty(value)) {
    return <>{fallback}</>;
  }

  return <EditorContent editor={editor} />;
}
