import { Router } from "express";
import shopRouter from "./shop.route.js";
import productsRouter from "./products.route.js";
import inventoryRouter from "./inventory.route.js";
import logsRouter from "./logs.route.js";

const router = Router();

router.use("/shop", shopRouter);
router.use("/products", productsRouter);
router.use("/inventory", inventoryRouter);
router.use("/logs", logsRouter);

export default router;
