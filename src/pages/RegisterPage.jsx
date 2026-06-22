import { Alert, Button, Col, Form, Input, Row, Space, Typography } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
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

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const destination = safeDestination(
    location.state?.from,
    "/profile",
  );

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      await signUp(values);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Не удалось создать аккаунт"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>
        Регистрация
      </Title>
      <Paragraph type="secondary">
        Создайте аккаунт для импорта и хранения личной коллекции датасетов.
      </Paragraph>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 20 }} />}

      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="username"
          label="Логин"
          rules={[
            { required: true, message: "Укажите логин" },
            { min: 3, message: "Минимум 3 символа" },
          ]}
        >
          <Input prefix={<UserOutlined />} autoComplete="username" size="large" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Укажите email" },
            { type: "email", message: "Некорректный email" },
          ]}
        >
          <Input prefix={<MailOutlined />} autoComplete="email" size="large" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="first_name" label="Имя">
              <Input autoComplete="given-name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="last_name" label="Фамилия">
              <Input autoComplete="family-name" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, message: "Укажите пароль" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            autoComplete="new-password"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password_confirm"
          label="Повторите пароль"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Повторите пароль" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Пароли не совпадают"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            autoComplete="new-password"
            size="large"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Создать аккаунт
        </Button>
      </Form>

      <Space style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <span>Уже есть аккаунт?</span>
        <Link to="/login" state={location.state}>Войти</Link>
      </Space>
    </>
  );
}
