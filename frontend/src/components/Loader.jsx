import React from "react";
import { motion } from "framer-motion";

const Loader = ({ minimal = false }) => {
  if (minimal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10001,
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background Accents for Depth */}
      <div
        style={{
          position: "absolute",
          width: "60vw",
          height: "60vw",
          background:
            "radial-gradient(circle, rgba(139, 26, 45, 0.08) 0%, transparent 70%)",
          top: "-10%",
          right: "-10%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "50vw",
          height: "50vw",
          background:
            "radial-gradient(circle, rgba(74, 182, 160, 0.08) 0%, transparent 70%)",
          bottom: "-10%",
          left: "-10%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "200px",
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {/* Rotating Outer Ring (Advanced UI) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            width: "130px",
            height: "130px",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTop: "2px solid rgba(74, 182, 160, 0.6)",
            borderBottom: "2px solid rgba(139, 26, 45, 0.6)",
            position: "absolute",
          }}
        />

        {/* Second Counter-Rotating Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            border: "1px solid transparent",
            borderLeft: "1px solid rgba(239, 160, 32, 0.4)",
            borderRight: "1px solid rgba(74, 182, 160, 0.4)",
            position: "absolute",
          }}
        />

        {/* Logo Container - Absolute Centering within relative parent */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.04, 1],
            opacity: 1,
          }}
          transition={{
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.5 },
          }}
          style={{
            width: "90px",
            height: "90px",
            background: "rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(15px)",
            borderRadius: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)",
            position: "absolute",
            zIndex: 2,
          }}
        >
          <img
            src="/vithartha-logo.png"
            alt="Loading Logo"
            style={{
              width: "58px",
              height: "58px",
              objectFit: "contain",
            }}
          />
        </motion.div>

        {/* Subtle Text below (Offset) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            position: "absolute",
            bottom: "-60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.85rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              background: "linear-gradient(135deg, #4AB6A0, #8B1A2D)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              opacity: 0.8,
            }}
          >
            Vithartha
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Loader;
