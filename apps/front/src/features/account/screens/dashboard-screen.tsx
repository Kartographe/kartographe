// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Alert, Card, Flex, Skeleton, Typography } from "antd";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";

export function DashboardScreen() {
  const { t } = useLingui();
  const meQuery = useCurrentUser();

  if (meQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }
  if (meQuery.isError || !meQuery.data) {
    return (
      <Alert
        message={t`Impossible de charger votre profil.`}
        showIcon
        type="error"
      />
    );
  }

  const me = meQuery.data.item;

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {me.firstName ? t`Bonjour ${me.firstName} 👋` : t`Bonjour 👋`}
      </Typography.Title>
      <Card>
        <Typography.Paragraph>
          {t`Bienvenue sur votre espace Kartographe.`}
        </Typography.Paragraph>
        <Flex gap={16}>
          <Link to="/me">{t`Mon profil`}</Link>
          <Link to="/me/security">{t`Sécurité du compte`}</Link>
        </Flex>
      </Card>
    </Flex>
  );
}
