import { DeliveryMethod } from "@shopify/shopify-api";
import { saveWebhookLog, markShopUninstalled } from "./db.js";

const createHandler = (topicName) => ({
  deliveryMethod: DeliveryMethod.Http,
  callbackUrl: "/api/webhooks",
  callback: async (topic, shop, body, webhookId) => {
    try {
      const payload = typeof body === "string" ? JSON.parse(body) : body;
      await saveWebhookLog({
        shop,
        topic: topic || topicName,
        webhookId,
        payload,
        status: "success",
      });
    } catch (err) {
      console.error(`Error processing webhook ${topicName}:`, err);
      await saveWebhookLog({
        shop,
        topic: topic || topicName,
        webhookId,
        payload: body,
        status: "error",
      });
    }
  },
});

export default {
  PRODUCTS_CREATE: createHandler("PRODUCTS_CREATE"),
  PRODUCTS_UPDATE: createHandler("PRODUCTS_UPDATE"),
  PRODUCTS_DELETE: createHandler("PRODUCTS_DELETE"),
  INVENTORY_LEVELS_UPDATE: createHandler("INVENTORY_LEVELS_UPDATE"),
  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = typeof body === "string" ? JSON.parse(body) : body;
        await markShopUninstalled(shop);
        await saveWebhookLog({
          shop,
          topic: "APP_UNINSTALLED",
          webhookId,
          payload,
          status: "success",
        });
      } catch (err) {
        console.error("Error processing APP_UNINSTALLED webhook:", err);
      }
    },
  },
  CUSTOMERS_DATA_REQUEST: createHandler("CUSTOMERS_DATA_REQUEST"),
  CUSTOMERS_REDACT: createHandler("CUSTOMERS_REDACT"),
  SHOP_REDACT: createHandler("SHOP_REDACT"),
};
