import {
  Button,
  Card,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DatabaseOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";


const { Paragraph, Text, Title } = Typography;

function formatBytes(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
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

export default function DatasetCard({ data }) {
  const navigate = useNavigate();
  const size = formatBytes(data.size_bytes);
  const area = relationName(data.anatomical_area);
  const latestVersion = Array.isArray(data.versions)
    ? data.versions[0]
    : null;
  const meta = [
    area,
    data.record_count !== null && data.record_count !== undefined
      ? `${data.record_count} записей`
      : null,
    size,
    latestVersion ? `Версия ${latestVersion.number}` : null,
  ].filter(Boolean);
  const licenses = Array.isArray(data.license_names)
    && data.license_names.length > 0
    ? data.license_names
    : data.license
      ? [data.license]
      : [];

  return (
    <Card
      hoverable
      style={{ height: "100%" }}
      actions={[
        <Button
          key="details"
          type="link"
          icon={<RightOutlined />}
          onClick={() => navigate(`/datasets/${data.id}`)}
        >
          Подробнее
        </Button>,
      ]}
    >
      <Space
        direction="vertical"
        size={12}
        style={{ width: "100%" }}
      >
        <Space wrap>
          <Tag icon={<DatabaseOutlined />}>
            {data.origin ?? "dataset"}
          </Tag>
          <Tag>{data.visibility ?? "internal"}</Tag>
          {data.source?.name && (
            <Tag>{data.source.name}</Tag>
          )}
        </Space>

        <Title level={4} style={{ margin: 0 }}>
          {data.title}
        </Title>

        {meta.length > 0 && (
          <Text type="secondary">
            {meta.join(" • ")}
          </Text>
        )}

        {data.description && (
          <Paragraph
            ellipsis={{ rows: 3 }}
            style={{ marginBottom: 0 }}
          >
            {data.description}
          </Paragraph>
        )}

        <Space wrap size={[4, 4]}>
          {(data.tags ?? []).slice(0, 4).map((tag, index) => {
            const name = relationName(tag);

            return name ? (
              <Tag key={tag?.id ?? `${name}-${index}`}>
                {name}
              </Tag>
            ) : null;
          })}

          {licenses.slice(0, 2).map((license) => (
            <Tooltip key={license} title="Лицензия">
              <Tag color="green">{license}</Tag>
            </Tooltip>
          ))}
        </Space>
      </Space>
    </Card>
  );
}
