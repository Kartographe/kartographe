// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Flex, Tooltip } from "antd";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText } from "@/lib/rich-text/rich-text";

interface RichTextEditorProps {
  value: RichTextDocument | null | undefined;
  onChange: (value: RichTextDocument) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  id,
}: RichTextEditorProps) {
  const { t } = useLingui();

  const editor = useEditor({
    content: asRichText(value),
    editable: !disabled,
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: "km-rich-text",
        ...(id ? { id } : {}),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onBlur: () => onBlur?.(),
    onUpdate: ({ editor: instance }) =>
      onChange(instance.getJSON() as RichTextDocument),
  });

  if (!editor) {
    return null;
  }

  const actions = [
    {
      key: "bold",
      title: t`Gras`,
      icon: <BoldOutlined />,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      title: t`Italique`,
      icon: <ItalicOutlined />,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "strike",
      title: t`Barré`,
      icon: <StrikethroughOutlined />,
      active: editor.isActive("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      key: "bulletList",
      title: t`Liste à puces`,
      icon: <UnorderedListOutlined />,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      title: t`Liste numérotée`,
      icon: <OrderedListOutlined />,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--ant-color-border)",
        borderRadius: "var(--ant-border-radius)",
        overflow: "hidden",
      }}
    >
      <Flex
        gap={2}
        style={{
          borderBottom: "1px solid var(--ant-color-border-secondary)",
          padding: 4,
        }}
        wrap
      >
        {actions.map((action) => (
          <Tooltip key={action.key} title={action.title}>
            <Button
              aria-label={action.title}
              disabled={disabled}
              icon={action.icon}
              onClick={action.run}
              size="small"
              type={action.active ? "primary" : "text"}
            />
          </Tooltip>
        ))}
      </Flex>
      <EditorContent editor={editor} />
    </div>
  );
}
