import { Router } from "express";
import { updateInventory } from "../controllers/inventory.controller.js";

const router = Router();

router.post("/update", updateInventory);

export default router;
