import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isLoading = false }) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(17, 24, 39, 0.45)",
              zIndex: 99999,
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal Container */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              pointerEvents: "none",
              padding: "16px",
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: "400px",
                maxWidth: "100%",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "24px",
                  border: "1px solid rgba(17, 24, 39, 0.08)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                  padding: "32px",
                  position: "relative",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.08)", borderRadius: "14px" }}>
                    <AlertCircle size={24} color="#ef4444" />
                  </div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#111111", letterSpacing: "-0.02em" }}>
                    {title}
                  </h2>
                </div>

                {/* Message */}
                <p
                  style={{
                    margin: "0 0 32px 0",
                    fontSize: "15px",
                    color: "#4b5563",
                    lineHeight: "1.7",
                    fontWeight: "400",
                  }}
                >
                  {message}
                </p>

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "12px",
                      border: "1px solid rgba(17, 24, 39, 0.08)",
                      background: "#f9fafb",
                      color: "#111111",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "700",
                      transition: "all 0.2s ease",
                      opacity: isLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "#f3f4f6";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "12px",
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "800",
                      transition: "all 0.2s ease",
                      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                      opacity: isLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 6px 15px rgba(239, 68, 68, 0.35)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.25)";
                    }}
                  >
                    {isLoading ? "Deleting..." : "Confirm Removal"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmationModal;
