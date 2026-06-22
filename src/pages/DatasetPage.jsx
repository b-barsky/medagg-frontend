import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  ExportOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getArtifactDownload,
  getDatasetById,
} from "../api/datasets";


const { Paragraph, Text, Title } = Typography;

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

function relationName(value) {
  if (typeof value === "string") {
    return value;
  }

  return value?.name ?? "";
}

export default function DatasetPage() {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError("");

    getDatasetById(id, { signal: controller.signal })
      .then((data) => {
        if (active) {
          setDataset(data);
        }
      })
      .catch((requestError) => {
        if (
          active &&
          requestError.name !== "AbortError"
        ) {
          setDataset(null);
          setError(
            requestError.status === 404
              ? "Датасет не найден."
              : requestError.message ||
                "Не удалось загрузить датасет.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const downloadArtifact = async (artifact) => {
    setDownloadingId(artifact.id);
    setDownloadError("");

    try {
      const response = await getArtifactDownload(artifact.id);
      globalThis.location.assign(response.url);
    } catch (requestError) {
      setDownloadError(
        requestError.message ||
        "Не удалось подготовить ссылку для скачивания.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <Row justify="center" style={{ padding: 64 }}>
        <Spin size="large" />
      </Row>
    );
  }

  if (error || !dataset) {
    return (
      <Alert
        type="error"
        showIcon
        message="Не удалось открыть датасет"
        description={error || "Датасет не найден."}
      />
    );
  }

  const licenses = Array.isArray(dataset.license_names)
    && dataset.license_names.length > 0
    ? dataset.license_names
    : dataset.license
      ? [dataset.license]
      : [];
  const versions = Array.isArray(dataset.versions)
    ? dataset.versions
    : [];

  return (
    <Space
      direction="vertical"
      size={20}
      style={{ width: "100%" }}
    >
      <Card>
        <Space
          direction="vertical"
          size={16}
          style={{ width: "100%" }}
        >
          <Space wrap>
            <Tag>{dataset.origin}</Tag>
            <Tag>{dataset.visibility}</Tag>
            {dataset.source?.name && (
              <Tag>{dataset.source.name}</Tag>
            )}
          </Space>

          <Title level={2} style={{ margin: 0 }}>
            {dataset.title}
          </Title>

          {dataset.description && (
            <Paragraph>{dataset.description}</Paragraph>
          )}

          <Space wrap>
            {dataset.source_url && (
              <Button
                href={dataset.source_url}
                target="_blank"
                rel="noopener noreferrer"
                icon={<ExportOutlined />}
              >
                Открыть источник
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Размер"
              value={formatBytes(dataset.size_bytes)}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Записи"
              value={dataset.record_count ?? "Неизвестно"}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Версии"
              value={versions.length}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Метаданные">
        <Descriptions column={{ xs: 1, md: 2 }} bordered>
          <Descriptions.Item label="Анатомическая область">
            {relationName(dataset.anatomical_area) || "Не указана"}
          </Descriptions.Item>
          <Descriptions.Item label="Источник">
            {dataset.source?.external_id || "Локальный"}
          </Descriptions.Item>
          <Descriptions.Item label="Лицензии" span={2}>
            <Space wrap>
              {licenses.length > 0
                ? licenses.map((license) => (
                    <Tag
                      key={license}
                      color="green"
                      icon={<SafetyCertificateOutlined />}
                    >
                      {license}
                    </Tag>
                  ))
                : "Не указаны"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Модальности" span={2}>
            <Space wrap>
              {(dataset.modalities ?? []).length > 0
                ? dataset.modalities.map((item, index) => (
                    <Tag key={item?.id ?? index}>
                      {relationName(item)}
                    </Tag>
                  ))
                : "Не указаны"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="ML-задачи" span={2}>
            <Space wrap>
              {(dataset.ml_tasks ?? []).length > 0
                ? dataset.ml_tasks.map((item, index) => (
                    <Tag key={item?.id ?? index}>
                      {relationName(item)}
                    </Tag>
                  ))
                : "Не указаны"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Теги" span={2}>
            <Space wrap>
              {(dataset.tags ?? []).length > 0
                ? dataset.tags.map((item, index) => (
                    <Tag key={item?.id ?? index}>
                      {relationName(item)}
                    </Tag>
                  ))
                : "Не указаны"}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Версии и артефакты">
        {downloadError && (
          <Alert
            type="error"
            showIcon
            closable
            message={downloadError}
            onClose={() => setDownloadError("")}
            style={{ marginBottom: 16 }}
          />
        )}

        {versions.length === 0 ? (
          <Empty description="Нет доступных версий" />
        ) : versions.map((version, index) => (
          <div key={version.id}>
            {index > 0 && <Divider />}

            <Space
              direction="vertical"
              size={12}
              style={{ width: "100%" }}
            >
              <Space wrap>
                <Title level={4} style={{ margin: 0 }}>
                  Версия {version.number}
                </Title>
                <Tag color="success">{version.status}</Tag>
                {version.source_version && (
                  <Tag>Источник v{version.source_version}</Tag>
                )}
              </Space>

              <Text type="secondary">
                SHA-256: {version.checksum_sha256 || "Не указан"}
              </Text>

              {(version.artifacts ?? []).map((artifact) => (
                <Card
                  key={artifact.id}
                  size="small"
                  type="inner"
                  title={artifact.filename}
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={downloadingId === artifact.id}
                      onClick={() => downloadArtifact(artifact)}
                    >
                      Скачать
                    </Button>
                  }
                >
                  <Space
                    direction="vertical"
                    size={4}
                  >
                    <Text>Размер: {formatBytes(artifact.size_bytes)}</Text>
                    <Text copyable>
                      SHA-256: {artifact.checksum_sha256}
                    </Text>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        ))}
      </Card>
    </Space>
  );
}
