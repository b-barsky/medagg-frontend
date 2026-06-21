import { useState } from "react";
import {
  Row,
  Col,
  Spin,
  Typography,
  Pagination,
} from "antd";
import {
    SearchOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";

import DatasetCard from "../components/DatasetCard";
import FiltersPanel from "../components/FiltersPanel";
import SearchSection from "../components/SearchSection";

import { searchDatasets } from "../api/datasets";

const { Text } = Typography;

export default function SearchPage() {
    const PAGE_SIZE = 20;

    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState({
        modalities_list: [],
        tags_list: [],
    });

    const [results, setResults] = useState([]);
    const [status, setStatus] = useState("idle");
    // idle | loading | success | empty | timeout | error

    const handleSearch = async (nextPage = 1) => {
        const normalizedQuery = query.trim();

        if (!normalizedQuery) {
            return;
        }

        setStatus("loading");

        if (nextPage === 1) {
            setResults([]);
        }

        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            controller.abort();
            setStatus("timeout");
        }, 15000);

        try {
            const response = await searchDatasets(
                normalizedQuery,
                filters,
                {
                  page: nextPage,
                  signal: controller.signal,
                },
            );

            const data = response?.results ?? [];

            setResults(data);
            setCount(response?.count ?? data.length);
            setPage(nextPage);

            setStatus(data.length === 0 ? "empty" : "success");
        } catch (error) {
            if (error.name !== "AbortError") {
                setStatus("error");
            }
        } finally {
            clearTimeout(timeoutId);
        }
    };

    return (
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
            <Row gutter={20} align="start">
                <Col xs={24} lg={16}>
                    <SearchSection
                        query={query}
                        setQuery={setQuery}
                        onSearch={handleSearch}
                        loading={status === "loading"}
                    />

                    <div style={{ marginTop: 40 }}>
                        {status === "idle" && (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "#8c8c8c",
                                    marginTop: 24,
                                }}
                            >
                                <SearchOutlined style={{ fontSize: 20, marginBottom: 6 }} />
                                <div style={{ fontSize: 14 }}>
                                    Начните поиск по датасетам
                                </div>
                            </div>
                        )}

                        {status === "loading" && (
                            <div style={{ textAlign: "center", marginTop: 40 }}>
                                <Spin size="large" tip="Поиск датасетов…" />
                            </div>
                        )}

                        {status === "timeout" && (
                            <div
                                style={{
                                    textAlign: "center",
                                    marginTop: 32,
                                    color: "#8c8c8c",
                                }}
                            >
                                <ClockCircleOutlined style={{ fontSize: 22, marginBottom: 8 }} />
                                <div style={{ fontSize: 15 }}>
                                    Упс… сервер не ответил вовремя
                                </div>
                                <div style={{ fontSize: 13, marginTop: 4 }}>
                                    Попробуйте повторить запрос
                                </div>
                            </div>
                        )}

                        {status === "empty" && (
                            <div
                                style={{
                                    textAlign: "center",
                                    marginTop: 32,
                                    color: "#8c8c8c",
                                }}
                            >
                                <SearchOutlined
                                    style={{
                                        fontSize: 22,
                                        marginBottom: 8,
                                        color: "#bfbfbf",
                                    }}
                                />
                                <div style={{ fontSize: 15 }}>
                                    Ничего не найдено
                                </div>
                                <div style={{ fontSize: 13, marginTop: 4 }}>
                                    Попробуйте изменить запрос или фильтры
                                </div>
                            </div>
                        )}

                        {status === "error" && (
                            <div
                                style={{
                                    textAlign: "center",
                                    marginTop: 32,
                                    color: "#8c8c8c",
                                }}
                            >
                                <div style={{ fontSize: 15 }}>
                                    Ошибка при выполнении поиска
                                </div>
                            </div>
                        )}
                    </div>

                    {status === "success" && count > PAGE_SIZE && (
                      <Row justify="center" style={{ marginTop: 24 }}>
                        <Pagination
                          current={page}
                          pageSize={PAGE_SIZE}
                          total={count}
                          showSizeChanger={false}
                          onChange={(nextPage) => handleSearch(nextPage)}
                        />
                      </Row>
                    )}
                </Col>

                <Col xs={24} lg={8}>
                    <div style={{ position: "sticky", top: 20 }}>
                        <FiltersPanel
                            filters={filters}
                            setFilters={setFilters}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
}
