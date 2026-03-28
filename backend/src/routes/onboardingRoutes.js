import express from "express";
import { getRecommendations } from "../controllers/onboardingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/recommend", protect, getRecommendations);

export default router;
