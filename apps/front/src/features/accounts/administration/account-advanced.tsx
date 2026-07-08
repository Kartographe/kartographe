import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { App, Button, Card, Flex, Spin, Typography } from "antd";
import { $api } from "@/api/$api";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";

export function AccountAdvanced({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const account = accountQuery.data?.item;

  const deactivateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/deactivate",
    {
      meta: { successMessage: t`Compte désactivé` },
    }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/activate",
    {
      meta: { successMessage: t`Compte réactivé` },
    }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}",
    {
      meta: { successMessage: t`Compte supprimé` },
    }
  );
  const leaveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/leave",
    {
      meta: { successMessage: t`Vous avez quitté le compte` },
    }
  );

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}"],
    });
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
  }

  function leaveWorkspace() {
    setActiveId(null);
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
    navigate({ to: "/me/accounts" });
  }

  async function toggleStatus() {
    if (account?.status === "active") {
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

  function confirmDelete() {
    modal.confirm({
      title: t`Supprimer ce compte ?`,
      content: t`Cette action est définitive.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId } },
        });
        leaveWorkspace();
      },
    });
  }

  function confirmLeave() {
    modal.confirm({
      title: t`Quitter ce compte ?`,
      content: t`Vous perdrez l'accès à ce compte.`,
      okText: t`Quitter`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await leaveMutation.mutateAsync({
          params: { path: { account_id: accountId } },
        });
        leaveWorkspace();
      },
    });
  }

  if (accountQuery.isLoading || !account) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Spin />
      </Flex>
    );
  }

  const isOwner = account.membership?.role === "owner";

  return (
    <Flex gap={24} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Avancé`}
      </Typography.Title>

      {isOwner ? (
        <Card
          styles={{ header: { borderColor: "var(--ant-color-error-border)" } }}
          title={
            <Typography.Text strong type="danger">
              {t`Zone sensible`}
            </Typography.Text>
          }
        >
          <Flex gap={16} vertical>
            <Flex align="center" justify="space-between" wrap>
              <Flex vertical>
                <Typography.Text strong>
                  {account.status === "active"
                    ? t`Désactiver le compte`
                    : t`Réactiver le compte`}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t`Un compte doit être désactivé avant de pouvoir être supprimé.`}
                </Typography.Text>
              </Flex>
              <Button
                loading={
                  activateMutation.isPending || deactivateMutation.isPending
                }
                onClick={toggleStatus}
              >
                {account.status === "active" ? t`Désactiver` : t`Réactiver`}
              </Button>
            </Flex>

            <Flex align="center" justify="space-between" wrap>
              <Flex vertical>
                <Typography.Text
                  strong
                >{t`Supprimer le compte`}</Typography.Text>
                <Typography.Text type="secondary">
                  {t`Action définitive. Le compte doit d'abord être désactivé.`}
                </Typography.Text>
              </Flex>
              <Button
                danger
                disabled={account.status !== "disabled"}
                onClick={confirmDelete}
                type="primary"
              >
                {t`Supprimer`}
              </Button>
            </Flex>
          </Flex>
        </Card>
      ) : null}

      <Card
        title={<Typography.Text strong>{t`Quitter le compte`}</Typography.Text>}
      >
        <Flex align="center" justify="space-between" wrap>
          <Typography.Text type="secondary">
            {t`Vous ne ferez plus partie de ce compte. Le dernier propriétaire ne peut pas partir.`}
          </Typography.Text>
          <Button danger onClick={confirmLeave}>
            {t`Quitter`}
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
