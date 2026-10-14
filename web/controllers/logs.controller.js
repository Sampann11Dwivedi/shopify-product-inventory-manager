import { getWebhookLogs } from "../db.js";

/**
 * Fetch synchronization and webhook audit logs
 * Route: GET /api/logs
 */
export const getLogs = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const limit = parseInt(req.query.limit || "100", 10);
    const logs = await getWebhookLogs(session.shop, isNaN(limit) ? 100 : limit);
    res.status(200).json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    res.status(500).json({ error: error.message });
  }
};
