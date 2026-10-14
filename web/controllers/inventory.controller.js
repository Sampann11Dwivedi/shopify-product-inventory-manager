import shopify from "../shopify.js";
import { saveWebhookLog } from "../db.js";

/**
 * Update inventory quantity for a variant at a location
 * Route: POST /api/inventory/update
 */
export const updateInventory = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const { inventoryItemId, quantity, locationId: reqLocationId } = req.body;

    if (!inventoryItemId || quantity === undefined || quantity === null) {
      return res
        .status(400)
        .json({ error: "Missing required fields: inventoryItemId, quantity" });
    }

    const targetQuantity = parseInt(quantity, 10);
    if (isNaN(targetQuantity)) {
      return res.status(400).json({ error: "Quantity must be an integer" });
    }

    let locationId = reqLocationId;
    if (!locationId) {
      const locResponse = await client.request(`
        query getLocations {
          locations(first: 1) {
            nodes {
              id
              name
            }
          }
        }
      `);
      locationId = locResponse.data?.locations?.nodes?.[0]?.id;
    }

    if (!locationId) {
      return res.status(400).json({ error: "No location found to update inventory" });
    }

    // Set inventory quantity mutation
    const setMutation = `
      mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup {
            id
            changes {
              name
              delta
              quantityAfterChange
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const setVariables = {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity: targetQuantity,
          },
        ],
      },
    };

    let setResponse = await client.request(setMutation, { variables: setVariables });
    let userErrors = setResponse.data?.inventorySetQuantities?.userErrors || [];

    // If item not tracked, activate tracking and retry
    if (userErrors.some((e) => e.message?.toLowerCase().includes("not tracked"))) {
      await client.request(
        `
        mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
          inventoryItemUpdate(id: $id, input: { tracked: true }) {
            inventoryItem { id tracked }
            userErrors { field message }
          }
        }
      `,
        { variables: { id: inventoryItemId } }
      );

      setResponse = await client.request(setMutation, { variables: setVariables });
      userErrors = setResponse.data?.inventorySetQuantities?.userErrors || [];
    }

    // If item not stocked at location, activate location and retry
    if (
      userErrors.some((e) =>
        e.message?.toLowerCase().includes("not stocked at location")
      )
    ) {
      await client.request(
        `
        mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
          inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
            inventoryLevel { id }
            userErrors { field message }
          }
        }
      `,
        {
          variables: {
            inventoryItemId,
            locationId,
            available: targetQuantity,
          },
        }
      );
      userErrors = [];
    }

    if (userErrors.length > 0) {
      return res.status(400).json({ error: userErrors[0].message });
    }

    // Record internal synchronization log in database
    await saveWebhookLog({
      shop: session.shop,
      topic: "INVENTORY_SYNC_UPDATE",
      webhookId: `manual_${Date.now()}`,
      payload: { inventoryItemId, locationId, quantity: targetQuantity },
      status: "success",
    });

    res.status(200).json({
      success: true,
      inventoryItemId,
      quantity: targetQuantity,
    });
  } catch (error) {
    console.error("Failed to update inventory:", error);
    res.status(500).json({ error: error.message });
  }
};
