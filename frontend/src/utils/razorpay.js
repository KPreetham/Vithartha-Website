import axios from "axios";
import { toast } from "react-hot-toast";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptLoadPromise = null;

const loadRazorpayScript = () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
};

/**
 * Opens the Razorpay checkout for the given lead's initial-submission payment.
 * Creates the order server-side (amount is resolved from the lead, never
 * trusted from the client), opens the Razorpay modal, and verifies the
 * payment signature server-side on success.
 */
export const payForLead = async (leadId, { name, email, contact } = {}, { onSuccess, onFailure } = {}) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const authHeaders = { headers: { Authorization: `Bearer ${storedUser.token}` } };

  const loadingToast = toast.loading("Preparing payment...");

  try {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Failed to load Razorpay checkout. Check your internet connection.");
    }

    const orderRes = await axios.post(`${apiUrl}/payments/create-order`, { leadId }, authHeaders);
    const { orderId, amount, currency, keyId } = orderRes.data || {};

    if (!orderId || !keyId) {
      throw new Error("Failed to create payment order");
    }

    toast.dismiss(loadingToast);

    const razorpay = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "Vithartha Consulting",
      description: "Service fee payment",
      prefill: { name: name || "", email: email || "", contact: contact || "" },
      theme: { color: "#16a34a" },
      handler: async (response) => {
        try {
          const verifyRes = await axios.post(
            `${apiUrl}/payments/verify`,
            {
              leadId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
            authHeaders,
          );
          if (verifyRes.data?.success) {
            toast.success("Payment successful");
            onSuccess?.(verifyRes.data.lead);
          } else {
            toast.error("Payment verification failed");
            onFailure?.();
          }
        } catch (verifyError) {
          toast.error(verifyError.response?.data?.message || "Payment verification failed");
          onFailure?.();
        }
      },
      modal: {
        ondismiss: () => {
          onFailure?.();
        },
      },
    });

    razorpay.on("payment.failed", () => {
      toast.error("Payment failed. Please try again.");
      onFailure?.();
    });

    razorpay.open();
  } catch (error) {
    toast.dismiss(loadingToast);
    toast.error(error.response?.data?.message || error.message || "Failed to start payment");
    onFailure?.();
  }
};
