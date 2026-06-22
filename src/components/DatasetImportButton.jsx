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
} from "@ant-design/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  createDatasetImport,
  getDatasetImport,
} from "../api/datasets";


const { Paragraph, Text } = Typography;
const DEFAULT_POLL_INTERVAL_MS = 1500;
const MAX_POLL_RETRY_MS = 15000;
const REQUEST_TIMEOUT_MS = 15000;

const IMPORT_STATUS = {
  queued: {
    color: "default",
    label: "В очереди",
    percent: 15,
  },
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
    label: "Импорт завершён",
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

  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Неизвестно";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** index;

  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[index]}`;
}

function errorMessage(error) {
  const policyMessage = error?.payload?.policy?.message;

  return (
    policyMessage ||
    error?.message ||
    "Не удалось импортировать датасет."
  );
}

function isPermanentPollError(error) {
  const status = Number(error?.status);

  return (
    Number.isInteger(status) &&
    status >= 400 &&
    status < 500 &&
    ![408, 429].includes(status)
  );
}

export default function DatasetImportButton({ dataset }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importRun, setImportRun] = useState(null);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollFunctionRef = useRef(null);
  const pollFailureCountRef = useRef(0);
  const sequenceRef = useRef(0);

  const policy = dataset?.import_policy;
  const eligible = (
    policy?.can_request_import ?? policy?.eligible
  ) === true;
  const statusInfo = IMPORT_STATUS[importRun?.status];
  const isTerminal = importRun?.is_terminal === true;
  const succeeded = importRun?.status === "succeeded";
  const licenses = Array.isArray(policy?.license_names)
    ? policy.license_names
    : [];

  const stopRequests = useCallback(() => {
    sequenceRef.current += 1;
    pollFailureCountRef.current = 0;
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback(
    (importId, sequence, delayMs) => {
      if (sequenceRef.current !== sequence) {
        return;
      }

      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }

      pollTimerRef.current = window.setTimeout(() => {
        pollTimerRef.current = null;
        pollFunctionRef.current?.(importId, sequence);
      }, delayMs);
    },
    [],
  );

  const pollImport = useCallback(
    async (importId, sequence) => {
      if (sequenceRef.current !== sequence) {
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await getDatasetImport(importId, {
          signal: controller.signal,
        });

        if (sequenceRef.current !== sequence) {
          return;
        }

        pollFailureCountRef.current = 0;
        setImportRun(response);
        setError("");

        if (!response.is_terminal) {
          schedulePoll(
            importId,
            sequence,
            response.poll_after_ms ?? DEFAULT_POLL_INTERVAL_MS,
          );
        }
      } catch (requestError) {
        if (sequenceRef.current !== sequence) {
          return;
        }

        setError(
          timedOut
            ? "Сервер долго не отвечает. Статус будет запрошен снова."
            : errorMessage(requestError),
        );

        if (!isPermanentPollError(requestError)) {
          pollFailureCountRef.current += 1;
          const retryDelay = Math.min(
            DEFAULT_POLL_INTERVAL_MS *
              2 ** Math.min(pollFailureCountRef.current, 4),
            MAX_POLL_RETRY_MS,
          );

          schedulePoll(importId, sequence, retryDelay);
        }
      } finally {
        window.clearTimeout(timeout);

        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [schedulePoll],
  );

  useEffect(() => {
    pollFunctionRef.current = pollImport;

    return () => {
      pollFunctionRef.current = null;
      stopRequests();
    };
  }, [pollImport, stopRequests]);

  const closeModal = () => {
    stopRequests();
    setOpen(false);
    setAccepted(false);
    setSubmitting(false);
    setImportRun(null);
    setError("");
  };

  const startImport = async () => {
    if (!accepted || !policy?.license_fingerprint) {
      return;
    }

    stopRequests();
    const sequence = sequenceRef.current;
    setSubmitting(true);
    setError("");

    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await createDatasetImport(
        dataset.id,
        policy.license_fingerprint,
        { signal: controller.signal },
      );

      if (sequenceRef.current !== sequence) {
        return;
      }

      setImportRun(response);

      if (!response.is_terminal) {
        schedulePoll(
          response.id,
          sequence,
          response.poll_after_ms ?? DEFAULT_POLL_INTERVAL_MS,
        );
      }
    } catch (requestError) {
      if (sequenceRef.current === sequence) {
        setError(
          timedOut
            ? "Сервер слишком долго не отвечает. Повторите запуск импорта."
            : errorMessage(requestError),
        );
      }
    } finally {
      window.clearTimeout(timeout);

      if (sequenceRef.current === sequence) {
        setSubmitting(false);
      }

      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  };

  const openModal = () => {
    stopRequests();
    setAccepted(false);
    setImportRun(null);
    setError("");
    setOpen(true);
  };

  const button = (
    <Button
      type="primary"
      icon={
        importRun && !isTerminal
          ? <LoadingOutlined />
          : <CloudDownloadOutlined />
      }
      disabled={!eligible}
      onClick={openModal}
    >
      Импортировать
    </Button>
  );

  return (
    <>
      {eligible ? button : (
        <Tooltip
          title={
            policy?.request_message ??
            policy?.message ??
            "Импорт пока недоступен для этого датасета."
          }
        >
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
                  key="dataset"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    closeModal();
                    navigate(`/datasets/${importRun.dataset_id}`);
                  }}
                >
                  Открыть датасет
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={closeModal}>
                  Закрыть
                </Button>,
                <Button
                  key="import"
                  type="primary"
                  icon={<CloudDownloadOutlined />}
                  loading={submitting}
                  disabled={
                    !accepted ||
                    Boolean(importRun && !isTerminal)
                  }
                  onClick={startImport}
                >
                  Начать импорт
                </Button>,
              ]
        }
      >
        <Space
          direction="vertical"
          size={16}
          style={{ width: "100%" }}
        >
          <Paragraph>
            <Text strong>{dataset.title}</Text>
          </Paragraph>

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Источник">
              {dataset.source?.name ?? "Неизвестно"}
            </Descriptions.Item>
            <Descriptions.Item label="Размер">
              {formatBytes(dataset.total_bytes)}
            </Descriptions.Item>
            <Descriptions.Item label="Лицензия">
              <Space wrap>
                {licenses.length > 0
                  ? licenses.map((license) => (
                      <Tag key={license}>{license}</Tag>
                    ))
                  : "Не указана"}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type="info"
            showIcon
            message="Проверка лицензии"
            description={
              "Medagg сохраняет снимок лицензии и версии источника. " +
              "Импорт будет остановлен, если эти сведения изменятся " +
              "до завершения загрузки."
            }
          />

          {!importRun && (
            <Checkbox
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
              }}
            >
              Я ознакомился с лицензией источника и принимаю её условия.
            </Checkbox>
          )}

          {statusInfo && (
            <Space
              direction="vertical"
              size={8}
              style={{ width: "100%" }}
            >
              <Space wrap>
                <Tag color={statusInfo.color}>
                  {statusInfo.label}
                </Tag>
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
                showInfo={false}
              />
            </Space>
          )}

          {(error || importRun?.error?.message) && (
            <Alert
              type="error"
              showIcon
              message="Ошибка импорта"
              description={
                error || importRun?.error?.message
              }
            />
          )}
        </Space>
      </Modal>
    </>
  );
}
