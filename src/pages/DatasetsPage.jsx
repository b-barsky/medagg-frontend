import {
  Alert,
  Button,
  Col,
  Empty,
  Pagination,
  Row,
  Skeleton,
  Space,
  Typography,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiErrorMessage } from "../api/client";
import { getDatasets } from "../api/datasets";
import DatasetCard from "../components/DatasetCard";

const { Paragraph, Title } = Typography;
const PAGE_SIZE = 20;

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");

    getDatasets({ page, signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setDatasets(Array.isArray(response?.results) ? response.results : []);
        setCount(response?.count ?? 0);
      })
      .catch((requestError) => {
        if (!active || requestError?.name === "AbortError") return;
        setDatasets([]);
        setCount(0);
        setError(apiErrorMessage(requestError, "Не удалось загрузить библиотеку"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, reloadKey]);

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={2} style={{ marginBottom: 4 }}>
            Мои датасеты
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Здесь отображаются только датасеты, импортированные вами или добавленные в вашу библиотеку.
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => navigate("/search")}
            >
              Найти датасет
            </Button>
          </Space>
        </Col>
      </Row>

      {error && <Alert type="error" showIcon message={error} />}

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col key={index} xs={24} md={12} xl={8}>
              <Skeleton active paragraph={{ rows: 5 }} />
            </Col>
          ))}
        </Row>
      ) : datasets.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: "64px 24px" }}>
          <Empty
            description="В вашей библиотеке пока нет датасетов"
          >
            <Button type="primary" onClick={() => navigate("/search")}>
              Перейти к поиску
            </Button>
          </Empty>
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {datasets.map((dataset) => (
              <Col key={dataset.id} xs={24} md={12} xl={8}>
                <DatasetCard data={dataset} />
              </Col>
            ))}
          </Row>

          {count > PAGE_SIZE && (
            <Row justify="center" style={{ marginTop: 8 }}>
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
      )}
    </Space>
  );
}
