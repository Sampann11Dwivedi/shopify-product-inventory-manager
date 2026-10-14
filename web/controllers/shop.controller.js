import shopify from "../shopify.js";
import { getShop } from "../db.js";

/**
 * Fetch shop metadata from Shopify GraphQL and local database
 * Route: GET /api/shop
 */
export const getShopInfo = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const dbShop = await getShop(session.shop);

    const client = new shopify.api.clients.Graphql({ session });
    const shopData = await client.request(`
      query getShopInfo {
        shop {
          name
          email
          myshopifyDomain
          currencyCode
        }
      }
    `);

    res.status(200).json({
      shop: {
        ...shopData.data?.shop,
        installedAt: dbShop?.installed_at,
        scope: dbShop?.scope || session.scope,
      },
    });
  } catch (error) {
    console.error("Failed to fetch shop info:", error);
    res.status(500).json({ error: error.message });
  }
};
