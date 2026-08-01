import crypto from "crypto";
import { razorpay } from "../config/razorpay.js";
import Lead from "../models/Lead.js";
import { parseFeeAmount } from "../utils/servicePricing.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

// Resolve the amount to charge server-side from the lead itself — never trust
// an amount sent by the client, since that would let a user pay less (or
// nothing) for their service.
const resolveLeadPaymentAmount = (lead) => {
  const amount =
    parseFeeAmount(lead?.recommendedFeeAmount) ??
    parseFeeAmount(lead?.recommendedFees) ??
    parseFeeAmount(lead?.cost);
  return Number.isFinite(amount) && amount > 0 ? amount : 1;
};

export const createPaymentOrder = async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, message: "leadId is required" });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const leadUserId = lead.user?.toString();
    const isOwner = leadUserId && leadUserId === req.user._id.toString();
    const isAdmin = normalizeRole(req.user.role) === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to pay for this service" });
    }

    if (lead.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "This service has already been paid for" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    const amountInRupees = resolveLeadPaymentAmount(lead);
    const amountInPaise = Math.round(amountInRupees * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `lead_${lead._id}`,
      notes: {
        leadId: String(lead._id),
        serviceName: lead.serviceName || "",
      },
    });

    lead.razorpayOrderId = order.id;
    lead.paymentAmount = amountInRupees;
    await lead.save();

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { leadId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!leadId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification details" });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const leadUserId = lead.user?.toString();
    const isOwner = leadUserId && leadUserId === req.user._id.toString();
    const isAdmin = normalizeRole(req.user.role) === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to verify this payment" });
    }

    if (lead.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order does not match this service" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    lead.paymentStatus = "Paid";
    lead.razorpayPaymentId = razorpay_payment_id;
    lead.paymentVerifiedAt = new Date();
    await lead.save();

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};

// Server-to-server notification from Razorpay (configured in the Razorpay
// dashboard under Webhooks). This is the durable source of truth for
// paymentStatus — unlike verifyPayment above, it does not depend on the
// user's browser surviving long enough to call our API after checkout.
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Webhook not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature || !req.rawBody) {
      return res.status(400).json({ success: false, message: "Missing signature or body" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      console.error("Razorpay webhook signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const orderEntity = req.body?.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;

    // Acknowledge events we don't act on so Razorpay stops retrying them.
    if (!["payment.captured", "order.paid"].includes(event) || !razorpayOrderId) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const lead = await Lead.findOne({ razorpayOrderId });
    if (!lead) {
      console.error(`Webhook: no lead found for razorpayOrderId ${razorpayOrderId}`);
      // Still 200 — this is not a signature problem, retrying won't help.
      return res.status(200).json({ success: true, matched: false });
    }

    if (lead.paymentStatus !== "Paid") {
      lead.paymentStatus = "Paid";
      if (razorpayPaymentId) lead.razorpayPaymentId = razorpayPaymentId;
      lead.paymentVerifiedAt = new Date();
      await lead.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling Razorpay webhook:", error);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
