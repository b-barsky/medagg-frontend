import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Modal,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  LoadingOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { apiErrorMessage } from "../api/client";
import {
  createDatasetImport,
  getDatasetImport,
} from "../api/datasets";
import { useAuth } from "../auth/useAuth";

const { Paragraph, Text } = Typography;
const DEFAULT_POLL_INTERVAL_MS = 1500;
const MAX_POLL_INTERVAL_MS = 15000;

const IMPORT_STATUS = {
  queued: { color: "default", label: "В очереди", percent: 15 },
  running: {
    color: "processing",
    label: "Загрузка и сохранение",
    percent: 55,
  },
  retrying: {
    color: "warning",
    label: "Повторная попытка",
    percent: 55,
  },
  succeeded: {
    color: "success",
    label: "Добавлено в вашу библиотеку",
    percent: 100,
  },
  failed: {
    color: "error",
    label: "Импорт завершился ошибкой",
    percent: 100,
  },
  rejected: {
    color: "error",
    label: "Импорт отклонён",
    percent: 100,
  },
};

function formatBytes(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) return "Неизвестно";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[index]}`;
}

export default function DatasetImportButton({ dataset }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importRun, setImportRun] = useState(null);
  const [error, setError] = useState("");
  const [pollFailureCount, setPollFailureCount] = useState(0);
  const refreshedImportId = useRef(null);

  const policy = dataset?.import_policy;
  const policyEligible = policy?.eligible === true;
  const isTerminal = importRun?.is_terminal === true;
  const succeeded = importRun?.status === "succeeded";
  const statusInfo = IMPORT_STATUS[importRun?.status];
  const licenses = Array.isArray(policy?.license_names)
    ? policy.license_names
    : [];

  const signInDestination = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  useEffect(() => {
    if (!importRun?.id || importRun.is_terminal) return undefined;

    const controller = new AbortController();
    const delay = Math.min(
      importRun.poll_after_ms ??
        DEFAULT_POLL_INTERVAL_MS * 2 ** Math.min(pollFailureCount, 4),
      MAX_POLL_INTERVAL_MS,
    );

    const timer = window.setTimeout(async () => {
      try {
        const response = await getDatasetImport(importRun.id, {
          signal: controller.signal,
        });
        setImportRun(response);
        setPollFailureCount(0);
        setError("");
      } catch (requestError) {
        if (requestError?.name === "AbortError") return;
        setPollFailureCount((value) => value + 1);
        setError(
          apiErrorMessage(
            requestError,
            "Не удалось обновить статус импорта. Повторяем запрос.",
          ),
        );
      }
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [importRun, pollFailureCount]);

  useEffect(() => {
    if (
      importRun?.status === "succeeded" &&
      refreshedImportId.current !== importRun.id
    ) {
      refreshedImportId.current = importRun.id;
      refreshUser().catch(() => undefined);
    }
  }, [importRun, refreshUser]);

  const closeModal = () => {
    setOpen(false);
    setAccepted(false);
    setSubmitting(false);
    setImportRun(null);
    setError("");
    setPollFailureCount(0);
  };

  const handlePrimaryClick = () => {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: signInDestination },
      });
      return;
    }

    setAccepted(false);
    setImportRun(null);
    setError("");
    setPollFailureCount(0);
    setOpen(true);
  };

  const startImport = async () => {
    if (!accepted || !policy?.license_fingerprint) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await createDatasetImport(
        dataset.id,
        policy.license_fingerprint,
      );
      setImportRun(response);

      if (response.status === "succeeded") {
        await refreshUser().catch(() => undefined);
      }
    } catch (requestError) {
      if ([401, 403].includes(requestError?.status)) {
        closeModal();
        navigate("/login", {
          state: { from: signInDestination },
        });
        return;
      }

      setError(
        apiErrorMessage(requestError, "Не удалось запустить импорт"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const button = (
    <Button
      type="primary"
      icon={isAuthenticated ? <CloudDownloadOutlined /> : <LoginOutlined />}
      disabled={!policyEligible}
      onClick={handlePrimaryClick}
    >
      {isAuthenticated ? "Импортировать" : "Требуется вход"}
    </Button>
  );

  return (
    <>
      {policyEligible ? (
        button
      ) : (
        <Tooltip title={policy?.request_message ?? policy?.message}>
          <span>{button}</span>
        </Tooltip>
      )}

      <Modal
        open={open}
        title="Импорт датасета"
        onCancel={closeModal}
        destroyOnHidden
        footer={
          succeeded
            ? [
                <Button key="close" onClick={closeModal}>
                  Закрыть
                </Button>,
                <Button
                  key="open"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    const datasetId = importRun?.dataset_id;
                    closeModal();
                    navigate(`/datasets/${datasetId}`);
                  }}
                >
                  Открыть датасет
                </Button>,
              ]
            : [
                <Button key="close" onClick={closeModal}>
                  Закрыть
                </Button>,
                <Button
                  key="start"
                  type="primary"
                  icon={
                    submitting || (importRun && !isTerminal)
                      ? <LoadingOutlined />
                      : <CloudDownloadOutlined />
                  }
                  loading={submitting}
                  disabled={!accepted || Boolean(importRun && !isTerminal)}
                  onClick={startImport}
                >
                  Начать импорт
                </Button>,
              ]
        }
      >
        <Space direction="vertical" size={18} style={{ display: "flex" }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Датасет">
              {dataset.title}
            </Descriptions.Item>
            <Descriptions.Item label="Источник">
              {dataset.source?.name ?? "Неизвестно"}
            </Descriptions.Item>
            <Descriptions.Item label="Размер">
              {formatBytes(dataset.total_bytes)}
            </Descriptions.Item>
            <Descriptions.Item label="Лицензия">
              {licenses.length > 0
                ? licenses.map((license) => (
                    <Tag key={license}>{license}</Tag>
                  ))
                : "Не указана"}
            </Descriptions.Item>
          </Descriptions>

          {!importRun && (
            <>
              <Alert
                type="info"
                showIcon
                message="Файл хранится один раз"
                description="Если этот датасет уже импортирован другим пользователем, он будет добавлен в вашу библиотеку без повторного скачивания и копирования."
              />
              <Checkbox
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              >
                Я ознакомился с лицензией источника и принимаю её условия.
              </Checkbox>
            </>
          )}

          {statusInfo && (
            <>
              <Space wrap>
                <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                {importRun.attempt_count > 0 && (
                  <Text type="secondary">
                    Попытка {importRun.attempt_count}
                  </Text>
                )}
              </Space>
              <Progress
                percent={statusInfo.percent}
                status={
                  ["failed", "rejected"].includes(importRun.status)
                    ? "exception"
                    : succeeded
                      ? "success"
                      : "active"
                }
              />
            </>
          )}

          {succeeded && (
            <Alert
              type="success"
              showIcon
              message="Датасет доступен в вашей библиотеке"
              description={
                importRun.access_granted
                  ? "Можно открыть метаданные и скачать доступные артефакты."
                  : "Доступ подтверждается. Обновите статус через несколько секунд."
              }
            />
          )}

          {(error || importRun?.error?.message) && (
            <Alert
              type="error"
              showIcon
              message={error || importRun.error.message}
            />
          )}

          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Medagg проверяет лицензию и доступ перед загрузкой. Принятие условий не заменяет юридическую оценку допустимого использования данных.
          </Paragraph>
        </Space>
      </Modal>
    </>
  );
}
