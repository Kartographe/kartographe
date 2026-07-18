// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
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

  // `useEditor` seeds its content once; without this the view keeps showing the
  // old document after `value` changes (e.g. an inline edit saved & refetched).
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(asRichText(value));
    }
  }, [editor, value]);

  if (isRichTextEmpty(value)) {
    return <>{fallback}</>;
  }

  return <EditorContent editor={editor} />;
}
