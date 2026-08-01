import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
// Called by Razorpay's servers directly — no user session, so no `protect`.
// Authenticity is instead established via the HMAC signature check inside
// handleRazorpayWebhook using RAZORPAY_WEBHOOK_SECRET.
router.post("/webhook", handleRazorpayWebhook);

export default router;
