import { Router } from "express";
import { getShopInfo } from "../controllers/shop.controller.js";

const router = Router();

router.get("/", getShopInfo);

export default router;
