import {
  Button,
  Card,
  Checkbox,
  Space,
  Typography,
} from "antd";


const { Text } = Typography;

const SOURCE_OPTIONS = [
  {
    label: "Kaggle",
    value: "kaggle",
  },
];

const DEFAULT_SOURCES = SOURCE_OPTIONS.map(
  (source) => source.value,
);

export default function FiltersPanel({
  sources,
  setSources,
}) {
  const resetSources = () => {
    setSources([...DEFAULT_SOURCES]);
  };

  return (
    <Card
      title="Источники"
      extra={
        <Button
          type="link"
          size="small"
          onClick={resetSources}
        >
          Сбросить
        </Button>
      }
      styles={{
        body: {
          padding: 16,
        },
      }}
    >
      <Space direction="vertical" size={12}>
        <Text type="secondary">
          Поиск выполняется параллельно по выбранным каталогам.
        </Text>

        <Checkbox.Group
          options={SOURCE_OPTIONS}
          value={sources}
          onChange={setSources}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        />
      </Space>
    </Card>
  );
}
