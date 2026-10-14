import sqlite3 from "sqlite3";
import { resolve } from "path";

const DB_PATH = resolve(process.cwd(), "database.sqlite");
const db = new sqlite3.Database(DB_PATH);

export const initDb = () => {
  return new Promise((resolvePromise, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS shops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop TEXT UNIQUE NOT NULL,
          scope TEXT,
          installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          uninstalled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop TEXT NOT NULL,
          topic TEXT NOT NULL,
          webhook_id TEXT,
          payload TEXT,
          status TEXT DEFAULT 'success',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolvePromise();
      });
    });
  });
};

export const saveShop = (shop, scope) => {
  return new Promise((resolvePromise, reject) => {
    const query = `
      INSERT INTO shops (shop, scope, installed_at, uninstalled_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT(shop) DO UPDATE SET
        scope = excluded.scope,
        uninstalled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    `;
    db.run(query, [shop, scope], function (err) {
      if (err) reject(err);
      else resolvePromise({ id: this.lastID });
    });
  });
};

export const markShopUninstalled = (shop) => {
  return new Promise((resolvePromise, reject) => {
    db.run(
      `UPDATE shops SET uninstalled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE shop = ?`,
      [shop],
      function (err) {
        if (err) reject(err);
        else resolvePromise();
      }
    );
  });
};

export const saveWebhookLog = ({ shop, topic, webhookId, payload, status = "success" }) => {
  return new Promise((resolvePromise, reject) => {
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    db.run(
      `INSERT INTO webhook_logs (shop, topic, webhook_id, payload, status) VALUES (?, ?, ?, ?, ?)`,
      [shop, topic, webhookId, payloadStr, status],
      function (err) {
        if (err) reject(err);
        else resolvePromise({ id: this.lastID });
      }
    );
  });
};

export const getWebhookLogs = (shop, limit = 50) => {
  return new Promise((resolvePromise, reject) => {
    db.all(
      `SELECT * FROM webhook_logs WHERE shop = ? ORDER BY id DESC LIMIT ?`,
      [shop, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolvePromise(rows || []);
      }
    );
  });
};

export const getShop = (shop) => {
  return new Promise((resolvePromise, reject) => {
    db.get(`SELECT * FROM shops WHERE shop = ?`, [shop], (err, row) => {
      if (err) reject(err);
      else resolvePromise(row);
    });
  });
};

export default {
  initDb,
  saveShop,
  markShopUninstalled,
  saveWebhookLog,
  getWebhookLogs,
  getShop,
};
