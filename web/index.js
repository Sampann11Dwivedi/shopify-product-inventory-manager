import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import WebhookHandlers from "./webhook-handlers.js";
import { initDb, saveShop } from "./db.js";
import apiRoutes from "./routes/index.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Initialize database
await initDb();

// Authentication and Webhooks
app.get(shopify.config.auth.path, shopify.auth.begin());

app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    try {
      const session = res.locals.shopify?.session;
      if (session?.shop) {
        await saveShop(session.shop, session.scope);
      }
    } catch (error) {
      console.error("Failed to save shop record during OAuth callback:", error);
    }
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: WebhookHandlers })
);

// Protected API routes
app.use("/api/*", shopify.validateAuthenticatedSession(), async (req, res, next) => {
  const session = res.locals.shopify?.session;
  if (session?.shop) {
    saveShop(session.shop, session.scope).catch((err) =>
      console.error("Failed to ensure shop record in database:", err)
    );
  }
  next();
});

app.use(express.json());

// Mount modular API routes
app.use("/api", apiRoutes);

// Frontend static asset serving and catch-all
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => {
  console.log(`Product Inventory Manager backend running on port ${PORT}`);
});
