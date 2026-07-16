// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Empty, Flex, Typography } from "antd";

/**
 * A section that exists in the navigation but has no content yet. Says so
 * plainly rather than showing an empty list the user might mistake for their
 * own doing.
 */
export function ComingSoon({ title }: { title: string }) {
  const { t } = useLingui();
  return (
    <Flex gap={24} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      <Empty description={t`Cette section arrive bientôt`} />
    </Flex>
  );
}
