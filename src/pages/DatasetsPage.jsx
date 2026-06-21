import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Spin,
  Typography,
  Pagination,
} from "antd";
import { FrownOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import DatasetCard from "../components/DatasetCard";
import { getDatasets } from "../api/datasets";

const { Title } = Typography;

export default function DatasetsPage() {
    const PAGE_SIZE = 20;

    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);

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
                setError(false);
            })
            .catch((requestError) => {
                if (
                    active &&
                    requestError.name !== "AbortError"
                ) {
                    setError(true);
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
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
            <Title level={1} style={{ marginBottom: 20 }}>
                Все датасеты
            </Title>

            {loading && (
                <div style={{ textAlign: "center", marginTop: 60 }}>
                    <Spin size="large" tip="Загружаем датасеты…" />
                </div>
            )}

            {!loading && error && (
                <div
                    style={{
                        marginTop: 60,
                        textAlign: "center",
                        color: "#8c8c8c",
                    }}
                >
                    <FrownOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                    <div style={{ fontSize: 15 }}>
                        Упс… не удалось загрузить данные
                    </div>
                </div>
            )}

            {!loading && !error && datasets.length === 0 && (
                <div
                    style={{
                        marginTop: 60,
                        textAlign: "center",
                        color: "#8c8c8c",
                    }}
                >
                    <Spin size="small" />
                    <div style={{ fontSize: 15, marginTop: 12 }}>
                        Упс… пока здесь пусто
                    </div>
                </div>
            )}

            {!loading && datasets.length > 0 && (
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
        </div>
    );
}
