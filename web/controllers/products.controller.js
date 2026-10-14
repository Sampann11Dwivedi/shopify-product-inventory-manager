import shopify from "../shopify.js";
import productCreator from "../product-creator.js";

/**
 * Fetch and search products with variants, SKU, and inventory levels
 * Route: GET /api/products?q=...
 */
export const getProducts = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const searchQuery = req.query.q ? String(req.query.q).trim() : null;

    const query = `
      query getProducts($query: String) {
        products(first: 50, query: $query) {
          nodes {
            id
            title
            status
            featuredImage {
              url
              altText
            }
            variants(first: 50) {
              nodes {
                id
                title
                sku
                price
                inventoryQuantity
                inventoryItem {
                  id
                  tracked
                  inventoryLevels(first: 10) {
                    nodes {
                      id
                      location {
                        id
                        name
                      }
                      quantities(names: ["available"]) {
                        name
                        quantity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = searchQuery ? { query: searchQuery } : {};
    const response = await client.request(query, { variables });

    const products = (response.data?.products?.nodes || []).map((product) => ({
      id: product.id,
      title: product.title,
      status: product.status,
      imageUrl: product.featuredImage?.url || null,
      variants: (product.variants?.nodes || []).map((variant) => {
        const primaryLevel = variant.inventoryItem?.inventoryLevels?.nodes?.[0];
        const availableQty = primaryLevel?.quantities?.find(
          (q) => q.name === "available"
        )?.quantity;

        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku || "N/A",
          price: variant.price,
          inventoryQuantity:
            availableQty !== undefined ? availableQty : variant.inventoryQuantity,
          inventoryItemId: variant.inventoryItem?.id,
          tracked: variant.inventoryItem?.tracked,
          locationId: primaryLevel?.location?.id || null,
          locationName: primaryLevel?.location?.name || "Primary Location",
        };
      }),
    }));

    res.status(200).json({ products });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Populate sample products for demo/testing
 * Route: POST /api/products/populate or POST /api/products
 */
export const populateProducts = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const count = parseInt(req.body?.count || "3", 10);
    await productCreator(session, isNaN(count) ? 3 : count);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to populate products:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Count total products
 * Route: GET /api/products/count
 */
export const countProducts = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const countData = await client.request(`
      query {
        productsCount {
          count
        }
      }
    `);
    res.status(200).json({ count: countData.data?.productsCount?.count ?? 0 });
  } catch (error) {
    console.error("Failed to count products:", error);
    res.status(500).json({ error: error.message });
  }
};
