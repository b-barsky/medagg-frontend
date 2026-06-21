import {
  Button,
  Card,
  Checkbox,
  Collapse,
} from "antd";

const FILTER_OPTIONS = {
  modalities_list: [
    {
      label: "MRI",
      value: "MRI",
    },
    {
      label: "CT",
      value: "CT",
    },
  ],
  tags_list: [
    {
      label: "Онкология",
      value: "cancer",
    },
    {
      label: "Нейро",
      value: "neuro",
    },
    {
      label: "Кардиология",
      value: "cardio",
    },
    {
      label: "COVID-19",
      value: "covid",
    },
  ],
};

const EMPTY_FILTERS = {
  modalities_list: [],
  tags_list: [],
};

export default function FiltersPanel({
  filters,
  setFilters,
}) {
  const updateFilter = (name, values) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: values,
    }));
  };

  const clearFilters = () => {
    setFilters({
      ...EMPTY_FILTERS,
    });
  };

  const collapseItems = [
    {
      key: "modalities",
      label: "Модальности",
      children: (
        <Checkbox.Group
          options={FILTER_OPTIONS.modalities_list}
          value={filters.modalities_list}
          onChange={(values) =>
            updateFilter("modalities_list", values)
          }
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        />
      ),
    },
    {
      key: "tags",
      label: "Патология",
      children: (
        <Checkbox.Group
          options={FILTER_OPTIONS.tags_list}
          value={filters.tags_list}
          onChange={(values) =>
            updateFilter("tags_list", values)
          }
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        />
      ),
    },
  ];

  return (
    <Card
      title="Фильтры"
      extra={
        <Button
          type="link"
          size="small"
          onClick={clearFilters}
        >
          Очистить
        </Button>
      }
      styles={{
        body: {
          maxHeight: 400,
          overflowY: "auto",
          padding: 12,
        },
      }}
    >
      <Collapse
        ghost
        items={collapseItems}
      />
    </Card>
  );
}