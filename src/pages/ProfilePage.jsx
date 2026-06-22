import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Statistic,
  Typography,
} from "antd";
import {
  DatabaseOutlined,
  DownloadOutlined,
  LockOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";

import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

function formatBytes(value) {
  const bytes = Number(value ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[index]}`;
}

function initials(user) {
  const first = user?.first_name?.trim()?.[0] ?? "";
  const last = user?.last_name?.trim()?.[0] ?? "";
  return (first + last || user?.username?.[0] || "U").toUpperCase();
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    profileForm.setFieldsValue({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
      organization: user?.profile?.organization ?? "",
      job_title: user?.profile?.job_title ?? "",
      location: user?.profile?.location ?? "",
      website: user?.profile?.website ?? "",
      bio: user?.profile?.bio ?? "",
    });
  }, [profileForm, user]);

  const saveProfile = async (values) => {
    setProfileLoading(true);
    setNotice(null);

    try {
      await updateProfile({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        profile: {
          organization: values.organization,
          job_title: values.job_title,
          location: values.location,
          website: values.website,
          bio: values.bio,
        },
      });
      setNotice({ type: "success", message: "Профиль обновлён" });
    } catch (error) {
      setNotice({
        type: "error",
        message: apiErrorMessage(error, "Не удалось обновить профиль"),
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const savePassword = async (values) => {
    setPasswordLoading(true);
    setNotice(null);

    try {
      await changePassword(values);
      passwordForm.resetFields();
      setNotice({ type: "success", message: "Пароль изменён" });
    } catch (error) {
      setNotice({
        type: "error",
        message: apiErrorMessage(error, "Не удалось изменить пароль"),
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Card bordered={false}>
        <Row gutter={[24, 24]} align="middle">
          <Col>
            <Avatar size={88} icon={<UserOutlined />}>
              {initials(user)}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ marginBottom: 4 }}>
              {user.display_name}
            </Title>
            <Text type="secondary">@{user.username}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
              {user.profile?.job_title || "Пользователь Medagg"}
              {user.profile?.organization
                ? ` · ${user.profile.organization}`
                : ""}
            </Paragraph>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Датасетов в библиотеке"
              value={user.stats?.dataset_count ?? 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Запросов на импорт"
              value={user.stats?.import_request_count ?? 0}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Объём библиотеки"
              value={formatBytes(user.stats?.total_dataset_bytes)}
            />
          </Card>
        </Col>
      </Row>

      {notice && <Alert showIcon type={notice.type} message={notice.message} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={15}>
          <Card bordered={false} title="Основная информация">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={saveProfile}
              requiredMark={false}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="first_name" label="Имя">
                    <Input autoComplete="given-name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="last_name" label="Фамилия">
                    <Input autoComplete="family-name" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: "email", message: "Некорректный email" }]}
              >
                <Input autoComplete="email" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="organization" label="Организация">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="job_title" label="Должность">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="location" label="Город / страна">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="website"
                    label="Сайт"
                    rules={[{ type: "url", message: "Укажите полный URL" }]}
                  >
                    <Input placeholder="https://" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="bio" label="О себе">
                <TextArea rows={4} maxLength={1000} showCount />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={profileLoading}
              >
                Сохранить
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card bordered={false} title="Безопасность">
            <Paragraph type="secondary">
              Используйте уникальный пароль, который не применяется в других сервисах.
            </Paragraph>
            <Divider />
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={savePassword}
              requiredMark={false}
            >
              <Form.Item
                name="current_password"
                label="Текущий пароль"
                rules={[{ required: true, message: "Укажите текущий пароль" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item
                name="new_password"
                label="Новый пароль"
                rules={[{ required: true, message: "Укажите новый пароль" }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="new_password_confirm"
                label="Повторите новый пароль"
                dependencies={["new_password"]}
                rules={[
                  { required: true, message: "Повторите новый пароль" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("new_password") === value) {
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
                />
              </Form.Item>

              <Button htmlType="submit" loading={passwordLoading}>
                Изменить пароль
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
