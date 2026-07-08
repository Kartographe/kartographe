import { Card, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Card
      style={{ boxShadow: "0 10px 30px rgba(16,24,40,.10)" }}
      styles={{ body: { padding: 32 } }}
      variant="borderless"
    >
      <div className="mb-6 text-center">
        <Flex justify="center" style={{ marginBottom: 16 }}>
          <Logo size={44} />
        </Flex>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6 text-center">{footer}</div> : null}
    </Card>
  );
}
