import { Card, Tag, Typography, Space, Button, Tooltip } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

const licenseMap = {
  "CC BY 4.0": { code: "CC", color: "green", label: "Creative Commons BY 4.0" },
  "Open Access": { code: "OA", color: "blue", label: "Open Access" },
  "Non-Commercial": { code: "NC", color: "orange", label: "Non-Commercial" },
};

function safeYear(date) {
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function relationName(value) {
  if (typeof value === "string") {
    return value;
  }
  return value?.name ?? "";
}

export default function DatasetCard({ data }) {
  const navigate = useNavigate();

  const {
    id,
    title,
    description,
    record_count,
    size,
    license,
    anatomical_area_name,
    tags,
    created_at,
  } = data;

  const year = safeYear(created_at);

  const lic = licenseMap[license] || {
    code: "?",
    color: "default",
    label: license || "Unknown license",
  };

  const meta = [
    anatomical_area_name && anatomical_area_name,
    record_count !== null && `${record_count} записей`,
    size !== null && `${size} MB`,
    year && year,
  ].filter(Boolean);

  return (
    <Card
      hoverable
      style={{
        borderRadius: 14,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      }}
    >
      <Title level={4} style={{ marginBottom: 6 }}>
        {title}
      </Title>

      {meta.length > 0 && (
        <Text type="secondary" style={{ fontSize: "0.9rem" }}>
          {meta.join(" • ")}
        </Text>
      )}

      {description && (
        <p style={{ color: "#555", marginTop: 12 }}>
          {description.length > 180
            ? description.slice(0, 180) + "…"
            : description}
        </p>
      )}

      <Space wrap style={{ marginTop: 12 }}>
        {Array.isArray(tags) &&
          tags.slice(0, 4).map((tag, index) => {
            const name = relationName(tag);

            if (!name) {
              return null;
            }

            return (
              <Tag
                key={
                  typeof tag === "object"
                    ? tag.id
                    : `${name}-${index}`
                }
              >
                {name}
              </Tag>
            );
          })}
        <Tooltip title={lic.label}>
          <Tag color={lic.color}>{lic.code}</Tag>
        </Tooltip>
      </Space>

      <div style={{ marginTop: 16 }}>
        <Button
          type="primary"
          shape="round"
          icon={<RightOutlined />}
          onClick={() => navigate(`/datasets/${id}`)}
        >
          Подробнее
        </Button>
      </div>
    </Card>
  );
}
