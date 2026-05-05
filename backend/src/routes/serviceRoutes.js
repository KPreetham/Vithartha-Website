import express from "express";
import {
  getServices,
  getServiceById,
  updateService,
} from "../controllers/serviceController.js";

const router = express.Router();

router.get("/", getServices);
router.get("/:id", getServiceById);
router.patch("/:id", updateService);

export default router;
