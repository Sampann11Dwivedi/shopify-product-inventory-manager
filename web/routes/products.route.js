import { Router } from "express";
import {
  getProducts,
  populateProducts,
  countProducts,
} from "../controllers/products.controller.js";

const router = Router();

router.get("/", getProducts);
router.post("/populate", populateProducts);
router.post("/", populateProducts);
router.get("/count", countProducts);

export default router;
