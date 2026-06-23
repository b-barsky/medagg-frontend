import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "../api/client";
import {
  createBuildRequest,
  executeBuildRequest,
  getBuildDownload,
  getBuilderLibrary,
  listBuildRequests,
  retryBuilderAnalysis,
} from "../api/builder";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const POLL_INTERVAL_MS = 1500;

const STATUS_META = {
  pending: { color: "default", label: "Ожидает" },
  queued: { color: "default", label: "В очереди" },
  planning: { color: "processing", label: "Планирование" },
  ready: { color: "cyan", label: "План готов" },
  building: { color: "processing", label: "Сборка" },
  running: { color: "processing", label: "Выполняется" },
  retrying: { color: "warning", label: "Повторная попытка" },
  complete: { color: "success", label: "Проанализирован" },
  succeeded: { color: "success", label: "Готово" },
  unsupported: { color: "warning", label: "Формат не поддержан" },
  rejected: { color: "error", label: "Отклонено" },
  failed: { color: "error", label: "Ошибка" },
};

function statusMeta(status) {
  return STATUS_META[status] ?? { color: "default", label: status ?? "—" };
}

function buildItems(response) {
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response)) return response;
  return [];
}

function hasActiveWork(requests, library) {
  return (
    requests.some(
      (item) =>
        !["succeeded", "failed", "rejected"].includes(item.status) ||
        (item.latest_run && !item.latest_run.is_terminal),
    ) ||
    library.some((item) => !item.is_terminal && item.status !== "complete")
  );
}

function AnalysisSummary({ analysis, onRetry }) {
  const meta = statusMeta(analysis.status);
  const predictions = Array.isArray(analysis.tag_predictions)
    ? analysis.tag_predictions
    : [];
  return (
    <Card size="small" bordered={false} style={{ height: "100%" }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space wrap>
          <Text strong>{analysis.dataset?.title}</Text>
          <Tag color={meta.color}>{meta.label}</Tag>
        </Space>
        <Progress
          percent={Number(analysis.progress ?? 0)}
          size="small"
          status={analysis.status === "failed" ? "exception" : "normal"}
        />
        <Text type="secondary">
          {analysis.progress_message || "Ожидание анализа"}
        </Text>
        <Space wrap>
          {predictions.slice(0, 8).map((prediction) => (
            <Tag key={`${prediction.namespace}:${prediction.value}`}>
              {prediction.value}
            </Tag>
          ))}
        </Space>
        {analysis.summary && (
          <Text type="secondary">
            Таблиц: {analysis.summary.table_count ?? 0}; полей:{" "}
            {analysis.summary.field_count ?? 0}; ключей связи:{" "}
            {analysis.summary.join_candidate_count ?? 0}
          </Text>
        )}
        {["failed", "unsupported"].includes(analysis.status) && (
          <Button size="small" icon={<ReloadOutlined />} onClick={() => onRetry(analysis)}>
            Повторить анализ
          </Button>
        )}
      </Space>
    </Card>
  );
}

function RequestDetails({ request, onExecute, onDownload, executing, downloading }) {
  if (!request) {
    return <Empty description="Выберите запрос сборки" />;
  }
  const meta = statusMeta(request.status);
  const plan = request.active_plan;
  const privacy = plan?.privacy_assessment;
  const selected = (request.candidates ?? []).filter((candidate) => candidate.selected);
  const run = request.latest_run;
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap>
        <Tag color={meta.color}>{meta.label}</Tag>
        <Text type="secondary">{request.id}</Text>
      </Space>
      <Title level={4} style={{ margin: 0 }}>
        {request.prompt}
      </Title>
      <Paragraph type="secondary">{request.purpose}</Paragraph>
      <Progress
        percent={Number(run?.progress ?? request.progress ?? 0)}
        status={request.status === "failed" ? "exception" : "normal"}
      />
      <Text>{run?.progress_message || request.progress_message}</Text>
      {(request.error_message || run?.error_message) && (
        <Alert
          type="error"
          showIcon
          message={request.error_message || run.error_message}
        />
      )}
      {plan && (
        <>
          <Divider orientation="left">План v{plan.version}</Divider>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Модель">{plan.model_version}</Descriptions.Item>
            <Descriptions.Item label="Тип объединения">
              Точное INNER JOIN по {plan.plan?.join?.semantic_type}
            </Descriptions.Item>
            <Descriptions.Item label="Контрольная сумма">
              <Text code copyable>{plan.plan_checksum}</Text>
            </Descriptions.Item>
          </Descriptions>
          <Title level={5}>Выбранные входы</Title>
          <List
            size="small"
            dataSource={selected}
            renderItem={(candidate) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Text strong>{candidate.dataset?.title}</Text>
                  <Text type="secondary">
                    Совпадения: {(candidate.matched_labels ?? []).join(", ") || "по схеме"}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}
      {privacy && (
        <Alert
          type={privacy.status === "approved" ? "success" : "error"}
          showIcon
          icon={<SafetyCertificateOutlined />}
          message={`Privacy gate: ${privacy.status}, риск ${privacy.risk_level}`}
          description={
            privacy.excluded_fields?.length
              ? `Исключено прямых идентификаторов: ${privacy.excluded_fields.length}`
              : "Прямые идентификаторы не будут включены в результат."
          }
        />
      )}
      {request.status === "ready" && (
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={executing}
          onClick={() => onExecute(request)}
        >
          Запустить сборку
        </Button>
      )}
      {run?.status === "succeeded" && (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="success"
            showIcon
            message="Производный датасет готов"
            description={`Строк: ${run.output_row_count ?? 0}`}
          />
          <Space wrap>
            {run.output_dataset?.id && (
              <Button icon={<FileSearchOutlined />}>
                <Link to={`/datasets/${run.output_dataset.id}`}>
                  Открыть в библиотеке
                </Link>
              </Button>
            )}
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              loading={downloading}
              onClick={() => onDownload(run)}
            >
              Скачать Parquet
            </Button>
          </Space>
        </Space>
      )}
    </Space>
  );
}

export default function BuilderPage() {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [library, setLibrary] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [libraryResponse, requestResponse] = await Promise.all([
        getBuilderLibrary(),
        listBuildRequests(),
      ]);
      if (!mountedRef.current) return;
      const nextLibrary = buildItems(libraryResponse);
      const nextRequests = buildItems(requestResponse);
      setLibrary(nextLibrary);
      setRequests(nextRequests);
      setSelectedId((current) => current ?? nextRequests[0]?.id ?? null);
      setError("");
    } catch (requestError) {
      if (!mountedRef.current) return;
      setError(apiErrorMessage(requestError, "Не удалось загрузить конструктор"));
    } finally {
      if (mountedRef.current && !quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!hasActiveWork(requests, library)) return undefined;

    let cancelled = false;
    let timerId;
    const poll = async () => {
      await refresh({ quiet: true });
      if (!cancelled) {
        timerId = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    timerId = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [library, refresh, requests]);

  const submit = async (values) => {
    setSubmitting(true);
    try {
      const created = await createBuildRequest({
        prompt: values.prompt,
        purpose: values.purpose,
        privacy_acknowledged: values.privacy_acknowledged,
        dataset_ids: values.dataset_ids ?? [],
      });
      form.resetFields();
      setRequests((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedId(created.id);
      messageApi.success("Планирование запущено");
    } catch (requestError) {
      messageApi.error(apiErrorMessage(requestError, "Не удалось создать запрос"));
    } finally {
      setSubmitting(false);
    }
  };

  const execute = async (request) => {
    setExecuting(true);
    try {
      const run = await executeBuildRequest(request.id);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: "building", latest_run: run }
            : item,
        ),
      );
      messageApi.success("Сборка запущена");
    } catch (requestError) {
      messageApi.error(apiErrorMessage(requestError, "Не удалось запустить сборку"));
    } finally {
      setExecuting(false);
    }
  };

  const download = async (run) => {
    setDownloading(true);
    try {
      const response = await getBuildDownload(run.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      messageApi.error(apiErrorMessage(requestError, "Не удалось подготовить скачивание"));
    } finally {
      setDownloading(false);
    }
  };

  const retryAnalysis = async (analysis) => {
    try {
      const updated = await retryBuilderAnalysis(analysis.id);
      setLibrary((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      messageApi.success("Повторный анализ поставлен в очередь");
    } catch (requestError) {
      messageApi.error(apiErrorMessage(requestError, "Не удалось повторить анализ"));
    }
  };

  const selectableDatasets = library
    .filter((item) => item.status === "complete")
    .map((item) => ({ label: item.dataset?.title, value: item.dataset?.id }));

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      {contextHolder}
      <Space direction="vertical" size={4}>
        <Title level={2} style={{ margin: 0 }}>
          Конструктор датасетов
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Модель анализирует только датасеты из вашей библиотеки, ищет совместимые
          псевдонимные ключи и формирует версионированный план с lineage.
        </Paragraph>
      </Space>

      <Alert
        type="warning"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message="Автоматическая связь ограничена"
        description="Используются только точные совпадения по высокоуверенным псевдонимным идентификаторам. Имя, возраст, пол, город и адрес никогда не применяются как автоматические ключи."
      />
      {error && <Alert type="error" showIcon message={error} />}

      <Card bordered={false} title={<Space><ExperimentOutlined />Новый запрос</Space>}>
        <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item
            name="prompt"
            label="Что нужно собрать"
            rules={[{ required: true, min: 5, message: "Опишите желаемый датасет" }]}
          >
            <TextArea
              rows={3}
              placeholder="Например: объединить клинические данные курящих пациентов с данными о раке лёгких"
            />
          </Form.Item>
          <Form.Item
            name="purpose"
            label="Цель обработки"
            rules={[{ required: true, min: 10, message: "Укажите цель обработки" }]}
          >
            <Input placeholder="Исследовательская цель и предполагаемое использование" />
          </Form.Item>
          <Form.Item name="dataset_ids" label="Входные датасеты (необязательно)">
            <Select
              mode="multiple"
              allowClear
              options={selectableDatasets}
              placeholder="Оставьте пустым, чтобы модель выбрала автоматически"
            />
          </Form.Item>
          <Form.Item
            name="privacy_acknowledged"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Подтвердите условия безопасной связи")),
              },
            ]}
          >
            <Checkbox>
              Я понимаю, что результат может содержать чувствительные медицинские поля,
              и подтверждаю заявленную цель обработки.
            </Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Создать план
          </Button>
        </Form>
      </Card>

      <Card
        bordered={false}
        title={<Space><ApartmentOutlined />Готовность библиотеки</Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => refresh()}>Обновить</Button>}
      >
        {loading ? (
          <Spin />
        ) : library.length === 0 ? (
          <Empty description="Сначала импортируйте хотя бы два датасета" />
        ) : (
          <Row gutter={[12, 12]}>
            {library.map((analysis) => (
              <Col xs={24} md={12} xl={8} key={analysis.id}>
                <AnalysisSummary analysis={analysis} onRetry={retryAnalysis} />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card bordered={false} title="История сборок">
            {requests.length === 0 ? (
              <Empty description="Запросов пока нет" />
            ) : (
              <List
                dataSource={requests}
                renderItem={(request) => {
                  const meta = statusMeta(request.status);
                  return (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedId(request.id)}
                    >
                      <List.Item.Meta
                        avatar={
                          request.status === "succeeded" ? (
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          ) : (
                            <ExperimentOutlined />
                          )
                        }
                        title={request.prompt}
                        description={
                          <Space wrap>
                            <Tag color={meta.color}>{meta.label}</Tag>
                            <Text type="secondary">
                              {new Date(request.created_at).toLocaleString()}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card bordered={false} title="План и результат">
            <RequestDetails
              request={selectedRequest}
              onExecute={execute}
              onDownload={download}
              executing={executing}
              downloading={downloading}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
