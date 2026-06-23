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
  ExperimentOutlined,
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
    : location.pathname.startsWith("/builder")
      ? "builder"
      : location.pathname.startsWith("/profile")
        ? "profile"
        : "search";

  const menuItems = [
    { key: "search", icon: <SearchOutlined />, label: "Поиск" },
    ...(isAuthenticated
      ? [
          { key: "datasets", icon: <DatabaseOutlined />, label: "Мои датасеты" },
          { key: "builder", icon: <ExperimentOutlined />, label: "Конструктор" },
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
    <Layout style={{ minHeight: "100vh" }}>
      {contextHolder}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          paddingInline: 24,
          background: "#ffffff",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Link to="/search" style={{ whiteSpace: "nowrap" }}>
          <Title level={3} style={{ margin: 0 }}>
            Medagg
          </Title>
        </Link>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
          style={{ flex: 1, minWidth: 0, borderBottom: 0 }}
        />
        {isAuthenticated ? (
          <Dropdown menu={userMenu} trigger={["click"]}>
            <Button type="text" style={{ height: "auto" }}>
              <Space>
                <Avatar>{initials(user)}</Avatar>
                <Space direction="vertical" size={0} align="start">
                  <Text strong>{user.display_name}</Text>
                  <Text type="secondary">@{user.username}</Text>
                </Space>
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
      <Content style={{ width: "100%", maxWidth: 1440, margin: "0 auto", padding: 24 }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: "center" }}>Medagg · 2026</Footer>
    </Layout>
  );
}
