// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import type { ButtonProps } from "antd";
import { Button, Tooltip } from "antd";

/**
 * Lock/unlock toggle — an icon button for owners/administrators. No confirm: the
 * action is reversible. The caller owns the mutation and passes `onToggle`.
 */
export function LockToggleButton({
  locked,
  onToggle,
  pending = false,
  size = "small",
}: {
  locked: boolean;
  onToggle: () => void;
  pending?: boolean;
  size?: ButtonProps["size"];
}) {
  const { t } = useLingui();
  return (
    <Tooltip title={locked ? t`Déverrouiller` : t`Verrouiller`}>
      <Button
        icon={locked ? <UnlockOutlined /> : <LockOutlined />}
        loading={pending}
        onClick={onToggle}
        size={size}
      />
    </Tooltip>
  );
}
