import express from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  updateServiceFeesForAllLeads,
  addDocumentToService,
} from "../controllers/serviceController.js";

const router = express.Router();

router.get("/", getServices);
router.get("/:id", getServiceById);
router.post("/", createService);
router.patch("/:id", updateService);
router.delete("/:id", deleteService);
router.patch("/:id/fees", updateServiceFeesForAllLeads);
router.patch("/:id/add-document", addDocumentToService);

export default router;
