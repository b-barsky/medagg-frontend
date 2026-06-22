import { useEffect, useState } from "react";
import {
  Alert,
  Col,
  Empty,
  Pagination,
  Row,
  Spin,
  Typography,
} from "antd";

import DatasetCard from "../components/DatasetCard";
import { getDatasets } from "../api/datasets";


const { Title } = Typography;
const PAGE_SIZE = 20;

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError("");

    getDatasets({
      page,
      signal: controller.signal,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setDatasets(
          Array.isArray(data?.results)
            ? data.results
            : [],
        );
        setCount(data?.count ?? 0);
      })
      .catch((requestError) => {
        if (
          active &&
          requestError.name !== "AbortError"
        ) {
          setError(
            requestError.message ||
            "Не удалось загрузить датасеты.",
          );
          setDatasets([]);
          setCount(0);
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
  }, [page]);

  return (
    <>
      <Title level={2}>Сохранённые датасеты</Title>

      {loading && (
        <Row justify="center" style={{ padding: 48 }}>
          <Spin size="large" />
        </Row>
      )}

      {!loading && error && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить датасеты"
          description={error}
        />
      )}

      {!loading && !error && datasets.length === 0 && (
        <Empty
          description={
            "Здесь появятся датасеты после успешного импорта."
          }
        />
      )}

      {!loading && !error && datasets.length > 0 && (
        <Row gutter={[16, 16]}>
          {datasets.map((dataset) => (
            <Col
              key={dataset.id}
              xs={24}
              md={12}
              xl={8}
            >
              <DatasetCard data={dataset} />
            </Col>
          ))}
        </Row>
      )}

      {!loading && !error && count > PAGE_SIZE && (
        <Row justify="center" style={{ marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={count}
            showSizeChanger={false}
            onChange={setPage}
          />
        </Row>
      )}
    </>
  );
}
