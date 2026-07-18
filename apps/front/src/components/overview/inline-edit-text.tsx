// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex, Input, Typography } from "antd";
import { useState } from "react";
import { InlineEditLabel } from "@/components/overview/inline-edit-label";
import { OverviewFieldShell } from "@/components/overview/overview-fields";

/**
 * An overview field whose single-line value flips to an inline text input. The
 * edit pencil sits to the left of the label; it saves on Enter or the check,
 * reverts on Escape or the cross. `onSave` should persist the value (and
 * invalidate the entity) — the field stays in edit mode until it resolves.
 */
export function InlineEditText({
  label,
  value,
  onSave,
  disabled,
  full,
}: {
  label: string;
  value: string;
  onSave: (next: string) => Promise<void>;
  disabled?: boolean;
  full?: boolean;
}) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function start() {
    setDraft(value);
    setEditing(true);
  }

  async function save() {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
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
        <Flex gap={4}>
          <Input
            autoFocus
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setEditing(false);
              }
            }}
            onPressEnter={save}
            value={draft}
          />
          <Button
            aria-label={t`Enregistrer`}
            icon={<CheckOutlined />}
            loading={saving}
            onClick={save}
            type="primary"
          />
          <Button
            aria-label={t`Annuler`}
            disabled={saving}
            icon={<CloseOutlined />}
            onClick={() => setEditing(false)}
          />
        </Flex>
      ) : (
        <Typography.Text>{value || "—"}</Typography.Text>
      )}
    </OverviewFieldShell>
  );
}
