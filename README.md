# Product Inventory Manager (Shopify Embedded App)

An embedded Shopify application built with **React**, **Node.js (Express)**, **Shopify Admin GraphQL API**, and **SQLite**.

The application allows Shopify merchants to view, search, and update product inventory in real time, automatically captures inventory and product webhook events, and provides an audit log interface.

---

## Features

- **Shopify Authentication**: Secure OAuth 2.0 flow using `@shopify/shopify-app-express` with session token validation.
- **Product & Variant Catalog**: Fetch products, variants, SKUs, pricing, and stock levels via Shopify Admin GraphQL API.
- **Product Search**: Real-time server-side product search by title or SKU.
- **Inventory Updates**: Update variant inventory quantities directly from the app using GraphQL `inventorySetQuantities`.
- **Webhook Processing**: Validates Shopify HMAC headers and processes inventory/product lifecycle events:
  - `PRODUCTS_CREATE`
  - `PRODUCTS_UPDATE`
  - `PRODUCTS_DELETE`
  - `INVENTORY_LEVELS_UPDATE`
  - `APP_UNINSTALLED`
- **Database Storage**: Stores shop details and webhook/sync events in SQLite (`database.sqlite`).
- **Audit Logs Page**: Dedicated interface for merchants to view webhook events, timestamps, sync statuses, and formatted JSON payloads.

---

## Tech Stack

- **Frontend**: React 18, Vite, Shopify Polaris, App Bridge React
- **Backend**: Node.js, Express, `@shopify/shopify-app-express`, `@shopify/shopify-api`
- **API**: Shopify Admin GraphQL API (`2024-10`)
- **Database**: SQLite (`database.sqlite` via `sqlite3`)

---

## Database Schema

Database tables are initialized automatically on application startup. You can also review the migration file in [`web/schema.sql`](file:///Users/sampanndwivedi/Developer/Shopify/new%20project/web/schema.sql).

### `shops`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY | Unique ID |
| `shop` | TEXT UNIQUE | Myshopify domain (e.g., `store.myshopify.com`) |
| `scope` | TEXT | Granted access scopes |
| `installed_at` | DATETIME | Installation timestamp |
| `uninstalled_at`| DATETIME | Uninstallation timestamp |
| `created_at` | DATETIME | Created timestamp |
| `updated_at` | DATETIME | Updated timestamp |

### `webhook_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY | Unique ID |
| `shop` | TEXT | Myshopify domain |
| `topic` | TEXT | Webhook topic (e.g., `PRODUCTS_UPDATE`) |
| `webhook_id` | TEXT | Shopify Webhook ID / Reference ID |
| `payload` | TEXT | JSON string of the received payload |
| `status` | TEXT | Event processing status (`success` / `error`) |
| `created_at` | DATETIME | Timestamp of event |

---

## Project Structure

```
├── shopify.app.toml       # Shopify app configuration and access scopes
├── package.json           # Root package scripts
├── web/
│   ├── index.js           # Express server, GraphQL endpoints, webhook router
│   ├── db.js              # SQLite database initialization & helper functions
│   ├── schema.sql         # Database schema definition
│   ├── webhook-handlers.js# Webhook handlers with HMAC verification
│   ├── shopify.js         # Shopify app & session storage configuration
│   └── frontend/
│       ├── App.jsx        # App routing & navigation
│       └── pages/
│           ├── index.jsx  # Products & Inventory Manager page
│           └── logs.jsx   # Webhook & Synchronization Logs page
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or later
- **Shopify CLI**: installed globally or via npm (`npm install -g @shopify/cli`)
- **Shopify Partner Account**: with a development store for testing

### 2. Installation

Install all required dependencies:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd web && npm install

# Install frontend dependencies
cd frontend && npm install
cd ../..
```

### 3. Running Locally

Run the Shopify CLI development server from the project root:

```bash
npm run dev
```

The CLI will:
1. Prompt you to log in to your Shopify Partner account.
2. Select or create your app in the Partner Dashboard.
3. Automatically configure development URLs and Cloudflare/ngrok tunnels.
4. Output the URL to install and test the app in your development store.

---

## Testing Webhooks

You can test webhook delivery using the Shopify CLI:

```bash
# Trigger a product update webhook
shopify app webhook trigger --topic PRODUCTS_UPDATE

# Trigger an inventory level update webhook
shopify app webhook trigger --topic INVENTORY_LEVELS_UPDATE
```

Once triggered, open the **Webhook Logs** tab inside the app to inspect the received payload and timestamp.
