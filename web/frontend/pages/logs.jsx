import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Banner,
  Spinner,
  Stack,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) {
        throw new Error(`Failed to load logs (${res.status})`);
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || "Error fetching logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const formatPayload = (rawPayload) => {
    if (!rawPayload) return "Empty";
    try {
      const parsed = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(rawPayload);
    }
  };

  return (
    <Page fullWidth>
      <TitleBar title="Webhook & Synchronization Logs" />

      <Layout>
        {error && (
          <Layout.Section>
            <Banner title="Error" status="critical">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card sectioned>
            <Stack alignment="center" distribution="equalSpacing">
              <Stack.Item>
                <Text variant="headingMd" as="h2">
                  Event & Webhook Audit Logs
                </Text>
                <Text variant="bodySm" as="p" color="subdued">
                  Real-time webhook events and inventory synchronization logs stored in SQLite.
                </Text>
              </Stack.Item>
              <Stack.Item>
                <Button onClick={fetchLogs} loading={loading}>
                  Refresh Logs
                </Button>
              </Stack.Item>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spinner accessibilityLabel="Loading logs" size="large" />
                <div style={{ marginTop: "12px" }}>
                  <Text variant="bodyMd" as="p">
                    Loading webhook logs from database...
                  </Text>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Text variant="headingMd" as="h3">
                  No logs recorded yet
                </Text>
                <p style={{ marginTop: "8px", color: "#637381" }}>
                  When product or inventory webhooks arrive (or inventory is updated from the app),
                  audit events will appear here automatically.
                </p>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #dfe3e8",
                      textAlign: "left",
                      color: "#637381",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <th style={{ padding: "12px 16px" }}>ID</th>
                    <th style={{ padding: "12px 16px" }}>Timestamp</th>
                    <th style={{ padding: "12px 16px" }}>Topic</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px" }}>Webhook / Ref ID</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isExpanded = expandedRow === log.id;
                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #f4f6f8",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>#{log.id}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <code>{log.topic}</code>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge status={log.status === "success" ? "success" : "critical"}>
                            {log.status}
                          </Badge>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: "12px", color: "#637381" }}>
                            {log.webhook_id || "N/A"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <Button size="slim" onClick={() => toggleExpand(log.id)}>
                            {isExpanded ? "Hide Data" : "View Data"}
                          </Button>
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: "12px",
                                textAlign: "left",
                                backgroundColor: "#1e1e1e",
                                color: "#00ff66",
                                padding: "12px",
                                borderRadius: "4px",
                                overflowX: "auto",
                                maxHeight: "300px",
                                fontFamily: "monospace",
                                fontSize: "12px",
                              }}
                            >
                              <pre style={{ margin: 0 }}>{formatPayload(log.payload)}</pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
