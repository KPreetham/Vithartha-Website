import express from "express";
import {
  getServices,
  getServiceById,
  createService,
  bulkImportServices,
  updateService,
  deleteService,
  updateServiceFeesForAllLeads,
  addDocumentToService,
} from "../controllers/serviceController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getServices);
router.post("/bulk", protect, authorize("admin"), bulkImportServices);
router.get("/:id", getServiceById);
router.post("/", protect, authorize("admin"), createService);
router.patch("/:id", protect, authorize("admin"), updateService);
router.delete("/:id", protect, authorize("admin"), deleteService);
router.patch("/:id/fees", protect, authorize("admin"), updateServiceFeesForAllLeads);
router.patch("/:id/add-document", protect, authorize("admin"), addDocumentToService);

export default router;
