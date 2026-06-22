import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";

const { Paragraph, Title } = Typography;

function safeDestination(value, fallback) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  )
    ? value
    : fallback;
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const destination = safeDestination(
    location.state?.from,
    "/datasets",
  );

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      await signIn(values);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Не удалось войти"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>
        Вход
      </Title>
      <Paragraph type="secondary">
        Войдите, чтобы импортировать датасеты и открыть личную библиотеку.
      </Paragraph>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 20 }} />}

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="username"
          label="Логин или email"
          rules={[{ required: true, message: "Укажите логин или email" }]}
        >
          <Input
            prefix={<UserOutlined />}
            autoComplete="username"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, message: "Укажите пароль" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            autoComplete="current-password"
            size="large"
          />
        </Form.Item>

        <Form.Item name="remember_me" valuePropName="checked" initialValue={false}>
          <Checkbox>Запомнить меня</Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Войти
        </Button>
      </Form>

      <Space style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <span>Нет аккаунта?</span>
        <Link to="/register" state={location.state}>Зарегистрироваться</Link>
      </Space>
    </>
  );
}
