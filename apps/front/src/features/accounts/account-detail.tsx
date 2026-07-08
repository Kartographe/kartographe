import { ArrowLeftOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  App,
  Button,
  Divider,
  Flex,
  Result,
  Space,
  Spin,
  Typography,
} from "antd";
import { $api } from "@/api/$api";
import { AccountInvitations } from "@/features/accounts/account-invitations";
import { AccountMembers } from "@/features/accounts/account-members";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import { AccountStatusTag } from "@/features/accounts/status-tags";

export function AccountDetail({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });

  const leaveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/leave",
    {
      meta: { successMessage: t`Vous avez quitté le compte` },
    }
  );
  const deactivateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/deactivate",
    { meta: { successMessage: t`Compte désactivé` } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/activate",
    { meta: { successMessage: t`Compte réactivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}",
    {
      meta: { successMessage: t`Compte supprimé` },
    }
  );

  if (accountQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (accountQuery.isError || !accountQuery.data) {
    return (
      <Result
        extra={
          <Link to="/me/accounts">
            <Button type="primary">{t`Retour aux comptes`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Ce compte est introuvable ou vous n'y avez pas accès.`}
        title={t`Compte introuvable`}
      />
    );
  }

  const account = accountQuery.data.item;
  const membership = account.membership;
  const myRole = membership?.role;
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "owner" || myRole === "administrator";

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}"],
    });
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
  }

  function confirmLeave() {
    modal.confirm({
      title: t`Quitter ce compte ?`,
      content: t`Vous perdrez l'accès à ${account.name}.`,
      okText: t`Quitter`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await leaveMutation.mutateAsync({
          params: { path: { account_id: accountId } },
        });
        queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
        navigate({ to: "/me/accounts" });
      },
    });
  }

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ce compte ?`,
      content: t`Cette action est définitive. Le compte doit être désactivé au préalable.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId } },
        });
        queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
        navigate({ to: "/me/accounts" });
      },
    });
  }

  async function toggleStatus() {
    if (account.status === "active") {
      await deactivateMutation.mutateAsync({
        params: { path: { account_id: accountId } },
      });
    } else {
      await activateMutation.mutateAsync({
        params: { path: { account_id: accountId } },
      });
    }
    invalidate();
  }

  return (
    <Flex gap={20} vertical>
      <div>
        <Link to="/me/accounts">
          <Button icon={<ArrowLeftOutlined />} size="small" type="text">
            {t`Comptes`}
          </Button>
        </Link>
      </div>

      <Flex align="center" gap={12} justify="space-between" wrap>
        <Flex align="center" gap={12} wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {account.name}
          </Typography.Title>
          <AccountStatusTag status={account.status} />
          {myRole ? <AccountRoleTag role={myRole} /> : null}
        </Flex>
        <Space>
          {isOwner ? (
            <Button
              loading={
                activateMutation.isPending || deactivateMutation.isPending
              }
              onClick={toggleStatus}
            >
              {account.status === "active" ? t`Désactiver` : t`Réactiver`}
            </Button>
          ) : null}
          {isOwner && account.status === "disabled" ? (
            <Button danger onClick={confirmDelete}>
              {t`Supprimer`}
            </Button>
          ) : null}
          <Button danger onClick={confirmLeave} type="text">
            {t`Quitter`}
          </Button>
        </Space>
      </Flex>

      {account.status === "disabled" ? (
        <Alert message={t`Ce compte est désactivé.`} showIcon type="warning" />
      ) : null}

      <div>
        <Typography.Title level={4}>{t`Membres`}</Typography.Title>
        {membership ? (
          <AccountMembers
            accountId={accountId}
            myMembershipId={membership.id}
            myRole={membership.role}
          />
        ) : null}
      </div>

      {isAdmin ? (
        <>
          <Divider style={{ margin: 0 }} />
          <AccountInvitations accountId={accountId} canGrantOwner={isOwner} />
        </>
      ) : null}
    </Flex>
  );
}
