import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Pagination,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ClockCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import FiltersPanel from "../components/FiltersPanel";
import SearchResultCard from "../components/SearchResultCard";
import SearchSection from "../components/SearchSection";
import {
  createSearchRun,
  getSearchRun,
} from "../api/datasets";


const { Text } = Typography;
const PAGE_SIZE = 20;
const CREATE_TIMEOUT_MS = 15000;
const POLL_REQUEST_TIMEOUT_MS = 10000;
const MAX_POLL_FAILURES = 3;

const PROVIDER_STATUS = {
  queued: {
    color: "default",
    label: "В очереди",
  },
  running: {
    color: "processing",
    label: "Поиск",
  },
  retrying: {
    color: "warning",
    label: "Повторная попытка",
  },
  enriching: {
    color: "processing",
    label: "Загрузка метаданных",
  },
  succeeded: {
    color: "success",
    label: "Готово",
  },
  partial: {
    color: "warning",
    label: "Частично готово",
  },
  failed: {
    color: "error",
    label: "Ошибка",
  },
};

function resultItems(response) {
  return Array.isArray(response?.results?.items)
    ? response.results.items
    : [];
}

function providerFailureMessage(response) {
  const messages = (response?.providers ?? [])
    .filter((provider) =>
      ["failed", "partial"].includes(provider.status),
    )
    .map((provider) => {
      const sourceName = provider.source?.name ?? "Источник";
      const message = provider.error?.message ?? "неизвестная ошибка";

      return `${sourceName}: ${message}`;
    });

  return messages.join(" ");
}

function providerProgress(provider) {
  const total = Number(provider.result_count ?? 0);

  if (total <= 0) {
    return "";
  }

  const completed = Number(
    provider.detail_completed_count ?? 0,
  );
  const failed = Number(
    provider.detail_failed_count ?? 0,
  );
  const progress = `метаданные ${completed}/${total}`;

  return failed > 0
    ? `${progress}, ошибок ${failed}`
    : progress;
}

function isRetryablePollError(error) {
  return (
    error?.name === "AbortError" ||
    error?.isNetworkError === true ||
    error instanceof TypeError ||
    (Number.isInteger(error?.status) && error.status >= 500)
  );
}

export default function SearchPage() {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState(["kaggle"]);
  const [results, setResults] = useState([]);
  const [run, setRun] = useState(null);
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const createControllerRef = useRef(null);
  const searchSequenceRef = useRef(0);

  const applySearchResponse = useCallback(
    (response, nextPage) => {
      const items = resultItems(response);
      const nextCount = response?.results?.count ?? items.length;

      setRun(response);
      setResults(items);
      setCount(nextCount);
      setPage(nextPage);
      setErrorMessage("");

      if (!response?.is_terminal) {
        setStatus("running");
        return;
      }

      if (response.status === "failed") {
        setErrorMessage(
          providerFailureMessage(response) ||
            "Все источники завершились с ошибкой.",
        );
        setStatus("error");
        return;
      }

      setStatus(items.length === 0 ? "empty" : "success");
    },
    [],
  );

  const handleSearch = async () => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    if (sources.length === 0) {
      setErrorMessage("Выберите хотя бы один источник.");
      setStatus("error");
      return;
    }

    createControllerRef.current?.abort();
    const sequence = searchSequenceRef.current + 1;
    searchSequenceRef.current = sequence;

    setRunId(null);
    setRun(null);
    setPage(1);
    setCount(0);
    setResults([]);
    setErrorMessage("");
    setStatus("submitting");

    const controller = new AbortController();
    createControllerRef.current = controller;
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      CREATE_TIMEOUT_MS,
    );

    try {
      const response = await createSearchRun(
        normalizedQuery,
        sources,
        {
          signal: controller.signal,
        },
      );

      if (searchSequenceRef.current !== sequence) {
        return;
      }

      setRunId(response.id);
      applySearchResponse(response, 1);
    } catch (error) {
      if (searchSequenceRef.current !== sequence) {
        return;
      }

      if (error.name === "AbortError") {
        setStatus("timeout");
        return;
      }

      setErrorMessage(
        error.message || "Не удалось запустить поиск.",
      );
      setStatus("error");
    } finally {
      window.clearTimeout(timeoutId);

      if (createControllerRef.current === controller) {
        createControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!runId) {
      return undefined;
    }

    const sequence = searchSequenceRef.current;
    let cancelled = false;
    let pollTimerId = null;
    let activeController = null;
    let consecutiveFailures = 0;

    const schedulePoll = (callback, delay) => {
      pollTimerId = window.setTimeout(callback, delay);
    };

    const poll = async () => {
      activeController = new AbortController();
      const requestTimeoutId = window.setTimeout(
        () => activeController.abort(),
        POLL_REQUEST_TIMEOUT_MS,
      );

      try {
        const response = await getSearchRun(
          runId,
          {
            page,
            pageSize: PAGE_SIZE,
            signal: activeController.signal,
          },
        );

        if (
          cancelled ||
          searchSequenceRef.current !== sequence
        ) {
          return;
        }

        consecutiveFailures = 0;
        applySearchResponse(response, page);

        if (!response.is_terminal) {
          schedulePoll(
            poll,
            response.poll_after_ms ?? 1200,
          );
        }
      } catch (error) {
        if (
          cancelled ||
          searchSequenceRef.current !== sequence
        ) {
          return;
        }

        if (!isRetryablePollError(error)) {
          setErrorMessage(
            error.message ||
              "Не удалось обновить состояние поиска.",
          );
          setStatus("error");
          return;
        }

        consecutiveFailures += 1;

        if (consecutiveFailures > MAX_POLL_FAILURES) {
          setErrorMessage(
            error.message ||
              "Не удалось связаться с сервером поиска.",
          );
          setStatus("timeout");
          return;
        }

        schedulePoll(
          poll,
          Math.min(
            1000 * 2 ** (consecutiveFailures - 1),
            5000,
          ),
        );
      } finally {
        window.clearTimeout(requestTimeoutId);
      }
    };

    poll();

    return () => {
      cancelled = true;
      activeController?.abort();

      if (pollTimerId !== null) {
        window.clearTimeout(pollTimerId);
      }
    };
  }, [applySearchResponse, page, runId]);

  useEffect(
    () => () => {
      searchSequenceRef.current += 1;
      createControllerRef.current?.abort();
    },
    [],
  );

  const showResults = results.length > 0;
  const showRunningSpinner = (
    status === "running" && !showResults
  );

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={6}>
        <FiltersPanel
          sources={sources}
          setSources={setSources}
        />
      </Col>

      <Col xs={24} lg={18}>
        <Space
          direction="vertical"
          size={20}
          style={{ width: "100%" }}
        >
          <SearchSection
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            loading={status === "submitting"}
          />

          {run && (
            <Card size="small" title="Состояние источников">
              <Space wrap size={[8, 8]}>
                {(run.providers ?? []).map((provider) => {
                  const providerStatus = (
                    PROVIDER_STATUS[provider.status] ?? {
                      color: "default",
                      label: provider.status,
                    }
                  );
                  const progress = providerProgress(provider);

                  return (
                    <Tag
                      key={provider.id}
                      color={providerStatus.color}
                    >
                      {provider.source?.name ?? "Источник"}: {" "}
                      {providerStatus.label}
                      {progress ? ` (${progress})` : ""}
                    </Tag>
                  );
                })}
              </Space>
            </Card>
          )}

          {run?.status === "partial" && (
            <Alert
              type="warning"
              showIcon
              message="Поиск завершён частично"
              description={
                providerFailureMessage(run) ||
                "Некоторые подробные метаданные недоступны, " +
                "но найденные сводные результаты показаны ниже."
              }
            />
          )}

          {status === "idle" && (
            <Empty
              image={<SearchOutlined style={{ fontSize: 48 }} />}
              description="Начните поиск по датасетам"
            />
          )}

          {status === "submitting" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin tip="Создаём задачу поиска..." />
            </div>
          )}

          {showRunningSpinner && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin tip="Источники обрабатывают запрос..." />
            </div>
          )}

          {status === "running" && showResults && (
            <Alert
              type="info"
              showIcon
              message="Результаты найдены, метаданные ещё загружаются"
              description={
                "Карточки обновляются автоматически по мере " +
                "завершения фоновых задач."
              }
            />
          )}

          {status === "timeout" && (
            <Empty
              image={<ClockCircleOutlined style={{ fontSize: 48 }} />}
              description={
                <Space direction="vertical" size={4}>
                  <Text>Не удалось обновить поиск вовремя</Text>
                  <Text type="secondary">
                    {errorMessage ||
                      "Задача сохранена на сервере. " +
                      "Проверьте Celery и повторите запрос состояния."}
                  </Text>
                </Space>
              }
            />
          )}

          {status === "empty" && (
            <Empty description="Ничего не найдено" />
          )}

          {status === "error" && (
            <Alert
              type="error"
              showIcon
              message="Ошибка при выполнении поиска"
              description={
                errorMessage || "Попробуйте повторить запрос."
              }
            />
          )}

          {showResults && (
            <Row gutter={[16, 16]}>
              {results.map((dataset) => (
                <Col
                  key={
                    dataset.search_result_id ??
                    `${dataset.source?.slug}-${dataset.id}`
                  }
                  xs={24}
                  md={12}
                  xl={8}
                >
                  <SearchResultCard data={dataset} />
                </Col>
              ))}
            </Row>
          )}

          {showResults && count > PAGE_SIZE && (
            <Row justify="center">
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={count}
                showSizeChanger={false}
                onChange={setPage}
              />
            </Row>
          )}
        </Space>
      </Col>
    </Row>
  );
}
