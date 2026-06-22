import { Card, Layout, Typography } from "antd";
import { Link, Outlet } from "react-router-dom";

const { Content } = Layout;
const { Paragraph, Title } = Typography;

export default function AuthLayout() {
  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Content
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 460, width: "100%" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <Link to="/search">
              <Title level={2} style={{ color: "#1677ff", marginBottom: 4 }}>
                Medagg
              </Title>
            </Link>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Поиск, импорт и подготовка медицинских датасетов
            </Paragraph>
          </div>
          <Card bordered={false} style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}>
            <Outlet />
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
