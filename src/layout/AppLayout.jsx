import {
  Avatar,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
  message,
} from "antd";
import {
  DatabaseOutlined,
  LoginOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;

function initials(user) {
  const first = user?.first_name?.trim()?.[0] ?? "";
  const last = user?.last_name?.trim()?.[0] ?? "";
  return (first + last || user?.username?.[0] || "U").toUpperCase();
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const selectedKey = location.pathname.startsWith("/datasets")
    ? "datasets"
    : location.pathname.startsWith("/profile")
      ? "profile"
      : "search";

  const menuItems = [
    {
      key: "search",
      icon: <SearchOutlined />,
      label: <Link to="/search">Поиск</Link>,
    },
    ...(isAuthenticated
      ? [
          {
            key: "datasets",
            icon: <DatabaseOutlined />,
            label: <Link to="/datasets">Мои датасеты</Link>,
          },
        ]
      : []),
  ];

  const userMenu = {
    items: [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "Профиль",
        onClick: () => navigate("/profile"),
      },
      { type: "divider" },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Выйти",
        danger: true,
        onClick: async () => {
          try {
            await signOut();
            navigate("/search", { replace: true });
          } catch (error) {
            messageApi.error(error?.message ?? "Не удалось выйти");
          }
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      {contextHolder}
      <Header
        style={{
          alignItems: "center",
          background: "#ffffff",
          borderBottom: "1px solid #edf0f5",
          display: "flex",
          gap: 24,
          height: 72,
          paddingInline: 32,
        }}
      >
        <Link
          to="/search"
          style={{ alignItems: "center", display: "flex", minWidth: 170 }}
        >
          <Title level={3} style={{ color: "#1677ff", margin: 0 }}>
            Medagg
          </Title>
        </Link>

        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderBottom: 0, flex: 1, minWidth: 0 }}
        />

        {isAuthenticated ? (
          <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
            <Button type="text" style={{ height: 48, paddingInline: 8 }}>
              <Space>
                <Avatar>{initials(user)}</Avatar>
                <span style={{ textAlign: "left" }}>
                  <Text strong style={{ display: "block" }}>
                    {user.display_name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    @{user.username}
                  </Text>
                </span>
              </Space>
            </Button>
          </Dropdown>
        ) : (
          <Space>
            <Button icon={<LoginOutlined />} onClick={() => navigate("/login")}>
              Войти
            </Button>
            <Button type="primary" onClick={() => navigate("/register")}>
              Регистрация
            </Button>
          </Space>
        )}
      </Header>

      <Content
        style={{
          margin: "0 auto",
          maxWidth: 1440,
          padding: "32px 24px 48px",
          width: "100%",
        }}
      >
        <Outlet />
      </Content>

      <Footer style={{ background: "transparent", textAlign: "center" }}>
        <Text type="secondary">Medagg · 2026</Text>
      </Footer>
    </Layout>
  );
}
