// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Alert, Flex, Skeleton, Typography } from "antd";
import { $api } from "@/api/$api";
import { OtpCard } from "@/features/account/components/security/otp-card";
import { PasswordCard } from "@/features/account/components/security/password-card";
import { SecurityKeysCard } from "@/features/account/components/security/security-keys-card";

export function SecurityScreen() {
  const { t } = useLingui();
  const overviewQuery = $api.useQuery("get", "/me/security");

  if (overviewQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <Alert
        message={t`Impossible de charger les paramètres de sécurité.`}
        showIcon
        type="error"
      />
    );
  }

  const overview = overviewQuery.data.item;

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Sécurité`}
      </Typography.Title>
      <PasswordCard hasPassword={overview.hasPassword} />
      <OtpCard otpEnabled={overview.otpEnabled} />
      <SecurityKeysCard />
    </Flex>
  );
}
