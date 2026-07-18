// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex } from "antd";
import { useState } from "react";
import { InlineEditLabel } from "@/components/overview/inline-edit-label";
import { OverviewFieldShell } from "@/components/overview/overview-fields";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { RichTextEditor } from "@/lib/rich-text/rich-text-editor";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

/**
 * An overview field whose rich-text value flips to an inline Tiptap editor. Same
 * pencil-left-of-label affordance as {@link InlineEditText}, with the editor and
 * save/cancel controls appearing in place. `onSave` persists and invalidates.
 */
export function InlineEditRichText({
  label,
  value,
  onSave,
  disabled,
  full,
}: {
  label: string;
  value: RichTextDocument | null | undefined;
  onSave: (next: RichTextDocument) => Promise<void>;
  disabled?: boolean;
  full?: boolean;
}) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RichTextDocument | null | undefined>(
    value
  );
  const [saving, setSaving] = useState(false);

  function start() {
    setDraft(value);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(draft ?? {});
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <OverviewFieldShell
      full={full}
      label={
        <InlineEditLabel
          disabled={disabled}
          editing={editing}
          label={label}
          onEdit={start}
        />
      }
    >
      {editing ? (
        <Flex gap={8} vertical>
          <RichTextEditor onChange={setDraft} value={draft} />
          <Flex gap={4} justify="flex-end">
            <Button
              disabled={saving}
              icon={<CloseOutlined />}
              onClick={() => setEditing(false)}
            >
              {t`Annuler`}
            </Button>
            <Button
              icon={<CheckOutlined />}
              loading={saving}
              onClick={save}
              type="primary"
            >
              {t`Enregistrer`}
            </Button>
          </Flex>
        </Flex>
      ) : (
        <RichTextView value={value} />
      )}
    </OverviewFieldShell>
  );
}
