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
