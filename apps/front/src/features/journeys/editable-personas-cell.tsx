// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Empty, Flex, Input, Popover, Tag } from "antd";
import { useState } from "react";
import { usePersonas } from "@/features/journeys/use-personas";

interface EditablePersonasCellProps {
  accountId: string;
  /** The row's current persona ids. */
  value: string[];
  /** Persist the new set of persona ids (the caller PATCHes the row). */
  onChange: (personasIds: string[]) => void;
  /** A change is being persisted — interactions are frozen until it lands. */
  loading?: boolean;
  /**
   * Chips wrap onto several lines by default (roomy layouts like the overview).
   * Pass `false` in a table so the cell stays a single line and the table keeps
   * uniform rows — clipped chips are still reachable through the picker.
   */
  wrap?: boolean;
}

/**
 * Inline persona editor mirroring `EditableTagsCell`: closable chips to detach a
 * persona, and a `+` chip opening a picker to attach one. Personas are never
 * created here — only picked from those already defined on the account.
 */
export function EditablePersonasCell({
  accountId,
  value,
  onChange,
  loading = false,
  wrap = true,
}: EditablePersonasCellProps) {
  const { t } = useLingui();
  const personas = usePersonas(accountId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const lower = search.trim().toLowerCase();
  const filtered = personas.personas.filter((persona) =>
    persona.title.toLowerCase().includes(lower)
  );

  function detach(personaId: string) {
    onChange(value.filter((id) => id !== personaId));
  }

  function toggle(personaId: string) {
    onChange(
      value.includes(personaId)
        ? value.filter((id) => id !== personaId)
        : [...value, personaId]
    );
  }

  const picker = (
    <Flex gap={4} style={{ width: 240 }} vertical>
      <Input
        allowClear
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t`Rechercher…`}
        value={search}
      />
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {filtered.map((persona) => {
          const active = value.includes(persona.id);
          return (
            <Button
              block
              disabled={loading}
              icon={active ? <CheckOutlined /> : null}
              key={persona.id}
              onClick={() => toggle(persona.id)}
              style={{ justifyContent: "flex-start" }}
              type="text"
            >
              {persona.title}
            </Button>
          );
        })}
        {filtered.length === 0 ? (
          <Empty
            description={t`Aucun persona`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : null}
      </div>
    </Flex>
  );

  return (
    <Flex
      align="center"
      gap={4}
      style={wrap ? undefined : { flexWrap: "nowrap", overflow: "hidden" }}
      wrap={wrap}
    >
      {value.map((id) => (
        <Tag
          closable={!loading}
          key={id}
          onClose={(event) => {
            event.preventDefault();
            detach(id);
          }}
          style={{ marginInlineEnd: 0 }}
        >
          {/* Beyond the personas page, the id itself says nothing. */}
          {personas.title(id) ?? t`Persona inconnu`}
        </Tag>
      ))}
      <Popover
        content={picker}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch("");
          }
        }}
        open={open}
        placement="bottomLeft"
        trigger="click"
      >
        <Tag
          style={{
            borderStyle: "dashed",
            cursor: loading ? "not-allowed" : "pointer",
            flexShrink: 0,
            marginInlineEnd: 0,
            opacity: loading ? 0.5 : 1,
          }}
        >
          <PlusOutlined />
        </Tag>
      </Popover>
    </Flex>
  );
}
