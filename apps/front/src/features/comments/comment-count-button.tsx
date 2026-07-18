// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CommentOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Tooltip } from "antd";
import type { MouseEventHandler } from "react";

interface CommentCountButtonProps {
  count: number;
  /** When set, the button opens a drawer; otherwise wrap it in a `<Link>`. */
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
}

/**
 * Small comment shortcut for a listing row: a comment icon showing the count
 * when there is at least one, icon-only otherwise. Either wrapped in a `<Link>`
 * to the entity's comments tab, or given an `onClick` to open a comments drawer.
 */
export function CommentCountButton({
  count,
  onClick,
  disabled,
}: CommentCountButtonProps) {
  const { t } = useLingui();
  return (
    <Tooltip title={t`Commentaires`}>
      <Button
        aria-label={t`Commentaires`}
        disabled={disabled}
        icon={<CommentOutlined />}
        onClick={onClick}
        size="small"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {count > 0 ? count : null}
      </Button>
    </Tooltip>
  );
}
