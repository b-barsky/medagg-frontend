import {
  Button,
  Card,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  ExportOutlined,
  StarOutlined,
} from "@ant-design/icons";


const { Paragraph, Text, Title } = Typography;

const DETAIL_STATUS = {
  pending: "Метаданные ожидаются",
  complete: "Метаданные загружены",
  stale: "Метаданные устарели",
  failed: "Ошибка метаданных",
};

const ENRICHMENT_STATUS = {
  queued: {
    color: "default",
    label: "В очереди на обогащение",
  },
  running: {
    color: "processing",
    label: "Загрузка метаданных",
  },
  retrying: {
    color: "warning",
    label: "Повторная загрузка",
  },
  succeeded: {
    color: "success",
    label: "Подробные метаданные готовы",
  },
  failed: {
    color: "error",
    label: "Не удалось загрузить метаданные",
  },
};

function formatBytes(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** unitIndex;

  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return new Intl.NumberFormat("ru-RU").format(number);
}

export default function SearchResultCard({ data }) {
  const size = formatBytes(data.total_bytes);
  const downloads = formatNumber(data.download_count);
  const rating = (
    data.usability_rating === null ||
    data.usability_rating === undefined
  )
    ? null
    : Number(data.usability_rating).toFixed(2);
  const description = data.description || data.subtitle;
  const licenses = Array.isArray(data.license_names)
    && data.license_names.length > 0
    ? data.license_names
    : data.license_name
      ? [data.license_name]
      : [];
  const enrichment = ENRICHMENT_STATUS[
    data.enrichment_status
  ];
  const enrichmentTag = enrichment ? (
    <Tag color={enrichment.color}>
      {enrichment.label}
    </Tag>
  ) : null;

  return (
    <Card
      hoverable
      style={{ height: "100%" }}
      actions={[
        <Button
          key="open"
          type="link"
          href={data.source_url}
          target="_blank"
          rel="noopener noreferrer"
          icon={<ExportOutlined />}
        >
          Открыть источник
        </Button>,
      ]}
    >
      <Space
        direction="vertical"
        size={12}
        style={{ width: "100%" }}
      >
        <Space wrap>
          <Tag>{data.source?.name ?? "Неизвестный источник"}</Tag>

          {enrichmentTag && data.enrichment_error?.message ? (
            <Tooltip title={data.enrichment_error.message}>
              {enrichmentTag}
            </Tooltip>
          ) : enrichmentTag}

          {!enrichment && data.detail_status && (
            <Tag>
              {DETAIL_STATUS[data.detail_status]
                ?? data.detail_status}
            </Tag>
          )}
        </Space>

        <Title level={4} style={{ margin: 0 }}>
          {data.title}
        </Title>

        {data.owner_name && (
          <Text type="secondary">
            {data.owner_name}
          </Text>
        )}

        {description && (
          <Paragraph
            ellipsis={{ rows: 3 }}
            style={{ marginBottom: 0 }}
          >
            {description}
          </Paragraph>
        )}

        <Space wrap size={[12, 8]}>
          {size && (
            <Text type="secondary">
              {size}
            </Text>
          )}

          {downloads && (
            <Tooltip title="Загрузки">
              <Text type="secondary">
                <DownloadOutlined /> {downloads}
              </Text>
            </Tooltip>
          )}

          {rating && (
            <Tooltip title="Оценка удобства">
              <Text type="secondary">
                <StarOutlined /> {rating}
              </Text>
            </Tooltip>
          )}
        </Space>

        {licenses.length > 0 && (
          <Space wrap size={[4, 4]}>
            {licenses.slice(0, 3).map((license) => (
              <Tag key={license}>{license}</Tag>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  );
}
