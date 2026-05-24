import React from "react";
import { motion } from "framer-motion";

const Loader = ({ minimal = false }) => {
  const hasLoadedBefore = typeof window !== "undefined" ? sessionStorage.getItem("fin2line_loaded") : null;
  const progressDuration = hasLoadedBefore ? 2.05 : 4.15;

  const shellStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 10001,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 40%, rgba(226,232,240,1) 100%)",
  };

  const accentStyle = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  if (minimal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={shellStyle}
      >
        <div style={{ position: "relative", width: "50px", height: "50px" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid rgba(67, 97, 238, 0.1)",
              borderTopColor: "#4361ee",
              position: "absolute",
            }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      style={shellStyle}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "28px",
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{
            scale: [1, 1.02, 1],
            opacity: 1,
            y: [0, -3, 0],
          }}
          transition={{
            scale: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.45 },
          }}
          style={{
            width: 164,
            height: 164,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.88) 100%)",
            backdropFilter: "blur(18px)",
            borderRadius: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(17,24,39,0.06)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 38,
              background:
                "radial-gradient(circle at 30% 25%, rgba(22,163,74,0.08) 0%, transparent 38%), radial-gradient(circle at 70% 75%, rgba(249,115,22,0.08) 0%, transparent 32%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: 28,
              overflow: "hidden",
              boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              position: "relative",
              zIndex: 1,
            }}
          >
            <img
              src="/logo2.png"
              alt="Fin2Line Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
          </div>
        </motion.div>

        {/* Sleek, professional progress loader with matching green/orange gradient */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "220px",
              height: "4px",
              background: "rgba(15, 23, 42, 0.06)",
              borderRadius: "999px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: progressDuration,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                background: "linear-gradient(90deg, #16a34a 0%, #f97316 100%)",
                borderRadius: "999px",
                boxShadow: "0 0 8px rgba(22, 163, 74, 0.2), 0 0 8px rgba(249, 115, 22, 0.2)",
              }}
            />
          </div>
          <motion.span
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#64748b",
              textTransform: "uppercase",
              marginTop: "2px",
            }}
          >
            Fin2Line Consulting
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

export default Loader;
