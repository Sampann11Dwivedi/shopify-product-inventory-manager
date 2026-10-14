import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Badge,
  Banner,
  Spinner,
  Stack,
  Thumbnail,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

export default function ProductInventoryManager() {
  const shopify = useAppBridge();

  const [products, setProducts] = useState([]);
  const [shop, setShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [inventoryDrafts, setInventoryDrafts] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isPopulating, setIsPopulating] = useState(false);

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch("/api/shop");
      if (res.ok) {
        const data = await res.json();
        setShop(data.shop);
      }
    } catch (err) {
      console.error("Failed to load shop details:", err);
    }
  }, []);

  const fetchProducts = useCallback(async (query = "") => {
    setLoading(true);
    setErrorMessage("");
    try {
      const url = query ? `/api/products?q=${encodeURIComponent(query)}` : "/api/products";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load products (${res.status})`);
      }
      const data = await res.json();
      setProducts(data.products || []);

      // Initialize local input values
      const initialDrafts = {};
      (data.products || []).forEach((product) => {
        product.variants.forEach((variant) => {
          initialDrafts[variant.id] =
            variant.inventoryQuantity !== undefined && variant.inventoryQuantity !== null
              ? String(variant.inventoryQuantity)
              : "0";
        });
      });
      setInventoryDrafts(initialDrafts);
    } catch (err) {
      setErrorMessage(err.message || "Error loading products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShop();
    fetchProducts();
  }, [fetchShop, fetchProducts]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchProducts(searchQuery);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    fetchProducts("");
  };

  const handleDraftChange = (variantId, value) => {
    setInventoryDrafts((prev) => ({
      ...prev,
      [variantId]: value,
    }));
  };

  const handlePopulateDemoProducts = async () => {
    setIsPopulating(true);
    try {
      const res = await fetch("/api/products/populate", { method: "POST" });
      if (res.ok) {
        shopify.toast.show("Created demo products!");
        await fetchProducts();
      } else {
        shopify.toast.show("Failed to create demo products", { isError: true });
      }
    } catch {
      shopify.toast.show("Error creating demo products", { isError: true });
    } finally {
      setIsPopulating(false);
    }
  };

  const handleUpdateInventory = async (variant) => {
    const draftValue = inventoryDrafts[variant.id];
    const newQty = parseInt(draftValue, 10);

    if (isNaN(newQty)) {
      shopify.toast.show("Please enter a valid quantity", { isError: true });
      return;
    }

    setUpdatingId(variant.id);
    try {
      const res = await fetch("/api/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: variant.inventoryItemId,
          locationId: variant.locationId,
          quantity: newQty,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update inventory");
      }

      shopify.toast.show(`Updated ${variant.sku || variant.title} inventory to ${newQty}`);

      // Update state locally
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === variant.id ? { ...v, inventoryQuantity: newQty } : v
          ),
        }))
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message || "Failed to update inventory", { isError: true });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Page fullWidth>
      <TitleBar title="Product Inventory Manager" />

      <Layout>
        {shop && (
          <Layout.Section>
            <Banner
              title={`Store: ${shop.name || shop.myshopifyDomain || "Connected"}`}
              status="info"
            >
              <p>
                Domain: <strong>{shop.myshopifyDomain}</strong> | Scopes:{" "}
                <code>{shop.scope || "write_products, write_inventory"}</code>
                {shop.installedAt && (
                  <span> | Connected since: {new Date(shop.installedAt).toLocaleString()}</span>
                )}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {errorMessage && (
          <Layout.Section>
            <Banner title="Error" status="critical">
              <p>{errorMessage}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card sectioned>
            <form onSubmit={handleSearchSubmit}>
              <Stack alignment="center">
                <Stack.Item fill>
                  <TextField
                    label="Search Products"
                    value={searchQuery}
                    onChange={(val) => setSearchQuery(val)}
                    placeholder="Search by product title or SKU..."
                    clearButton
                    onClearButtonClick={handleSearchClear}
                    autoComplete="off"
                  />
                </Stack.Item>
                <Stack.Item>
                  <div style={{ marginTop: "24px" }}>
                    <Stack>
                      <Button submit primary>
                        Search
                      </Button>
                      <Button onClick={() => fetchProducts(searchQuery)} loading={loading}>
                        Refresh
                      </Button>
                    </Stack>
                  </div>
                </Stack.Item>
              </Stack>
            </form>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {loading ? (
            <Card sectioned>
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spinner accessibilityLabel="Loading products" size="large" />
                <div style={{ marginTop: "12px" }}>
                  <Text variant="bodyMd" as="p">
                    Loading store products and inventory...
                  </Text>
                </div>
              </div>
            </Card>
          ) : products.length === 0 ? (
            <Card sectioned>
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Text variant="headingMd" as="h3">
                  No products found
                </Text>
                {searchQuery ? (
                  <p style={{ marginTop: "8px" }}>
                    No matching products found for "{searchQuery}".
                  </p>
                ) : (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ marginBottom: "16px", color: "#637381" }}>
                      Your store currently has no products. You can create sample demo products to test.
                    </p>
                    <Button
                      primary
                      loading={isPopulating}
                      onClick={handlePopulateDemoProducts}
                    >
                      Create Demo Products
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            products.map((product) => (
              <Card key={product.id} sectioned>
                <Stack alignment="center" spacing="tight">
                  <Thumbnail
                    source={
                      product.imageUrl ||
                      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
                    }
                    alt={product.title}
                    size="small"
                  />
                  <Stack.Item fill>
                    <Stack vertical spacing="extraTight">
                      <Stack alignment="center" spacing="tight">
                        <Text variant="headingMd" as="h2">
                          {product.title}
                        </Text>
                        <Badge status={product.status === "ACTIVE" ? "success" : "attention"}>
                          {product.status}
                        </Badge>
                      </Stack>
                    </Stack>
                  </Stack.Item>
                </Stack>

                <div style={{ marginTop: "16px" }}>
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
                        }}
                      >
                        <th style={{ padding: "8px" }}>Variant</th>
                        <th style={{ padding: "8px" }}>SKU</th>
                        <th style={{ padding: "8px" }}>Price</th>
                        <th style={{ padding: "8px" }}>Location</th>
                        <th style={{ padding: "8px" }}>Current Stock</th>
                        <th style={{ padding: "8px", width: "220px" }}>Update Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((variant) => (
                        <tr
                          key={variant.id}
                          style={{
                            borderBottom: "1px solid #f4f6f8",
                          }}
                        >
                          <td style={{ padding: "10px 8px" }}>
                            <strong>{variant.title === "Default Title" ? "Standard" : variant.title}</strong>
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <code>{variant.sku}</code>
                          </td>
                          <td style={{ padding: "10px 8px" }}>${variant.price}</td>
                          <td style={{ padding: "10px 8px" }}>{variant.locationName}</td>
                          <td style={{ padding: "10px 8px" }}>
                            <Badge
                              status={
                                variant.inventoryQuantity > 10
                                  ? "success"
                                  : variant.inventoryQuantity > 0
                                  ? "attention"
                                  : "critical"
                              }
                            >
                              {String(variant.inventoryQuantity ?? 0)}
                            </Badge>
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <Stack spacing="extraTight" alignment="center">
                              <div style={{ width: "90px" }}>
                                <TextField
                                  type="number"
                                  value={inventoryDrafts[variant.id] ?? ""}
                                  onChange={(val) => handleDraftChange(variant.id, val)}
                                  autoComplete="off"
                                />
                              </div>
                              <Button
                                size="slim"
                                primary
                                loading={updatingId === variant.id}
                                onClick={() => handleUpdateInventory(variant)}
                              >
                                Save
                              </Button>
                            </Stack>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
