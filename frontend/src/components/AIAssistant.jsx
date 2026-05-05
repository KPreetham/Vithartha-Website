import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

void motion;

const SYSTEM_PROMPT = `You are a professional AI Business Advisor for Fin2Line, a company specializing in Finance, Compliance, Advisory, Tax, and Legal services.

Your primary goal is to assist users with queries regarding:
- Compliance: GST Registration/Filing, MCA Annual Filings, EPF & ESI, TDS, E-Way Bill, and Health Checks.
- Tax: ITR Filing, TDS Payments, IT Notices, NRI Taxation, and Refunds.
- Finance: Virtual CFO and Virtual Accounting services.
- Legal: Company Incorporation, Import/Export (IEC), Secretarial services, Share Transfer & ESOP.
- Advisory: Startup Consulting and Technical Services.

Guidelines:
1. TONE: Maintain a high-level, professional, and sophisticated tone. Avoid informal language.
2. FORMATTING: Use plain text only. CRITICAL: Never use double asterisks (**) for bolding or emphasis.
3. PRICING: If asked, mention that fees start at Rs 1,000 and the timeline is typically 2-4 days. Advise them to confirm interest via the recommendations page for precise quotes.
4. SCOPE: If a user asks a general question unrelated to Fin2Line, provide a very brief professional answer if possible, but immediately follow up by asking them to keep questions relevant to Fin2Line's business services.
5. CONCISENESS: Keep responses brief and focused on how Fin2Line can solve the user's business needs.`;

const previewMessages = [
  {
    role: "assistant",
    content: "Hello! How can I help you with your business compliance and finance today?",
  },
];

const TypingDots = ({ accent = "#A78BFA" }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      paddingLeft: "0.2rem",
    }}
  >
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
        transition={{
          repeat: Infinity,
          duration: 0.9,
          ease: "easeInOut",
          delay: i * 0.12,
        }}
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "999px",
          background: accent,
          boxShadow: `0 0 14px ${accent}66`,
          display: "inline-block",
        }}
      />
    ))}
  </div>
);

const RobotLauncher = () => (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "grid",
      placeItems: "center",
    }}
  >
    <motion.svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      aria-hidden="true"
      animate={{ y: [0, -1.5, 0] }}
      transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="botBadge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="botStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      <motion.g animate={{ rotate: [-0.8, 0.8, -0.8] }} transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }} style={{ transformOrigin: "32px 32px" }}>
        {/* Purple Background Square */}
        <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#botBadge)" />
        
        {/* Head Outline */}
        <rect x="18" y="23" width="28" height="19" rx="4" fill="none" stroke="url(#botStroke)" strokeWidth="3.5" />
        
        {/* Vertical Capsule Eyes */}
        <line x1="26" y1="29" x2="26" y2="36" stroke="url(#botStroke)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="38" y1="29" x2="38" y2="36" stroke="url(#botStroke)" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* Antenna (Inverted L-shape) */}
        <path d="M28 23v-4h6" fill="none" stroke="url(#botStroke)" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* Side Protrusions (Ears) */}
        <line x1="18" y1="32.5" x2="14" y2="32.5" stroke="url(#botStroke)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="46" y1="32.5" x2="50" y2="32.5" stroke="url(#botStroke)" strokeWidth="3.5" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  </div>
);

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(previewMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const openAssistant = () => setIsOpen(true);

    window.openFin2LineAssistant = openAssistant;
    window.addEventListener("fin2line:open-ai-assistant", openAssistant);

    return () => {
      window.removeEventListener("fin2line:open-ai-assistant", openAssistant);
      if (window.openFin2LineAssistant === openAssistant) {
        delete window.openFin2LineAssistant;
      }
    };
  }, []);



  const getAuthToken = () => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) return null;

      const parsedUser = JSON.parse(userRaw);
      const token =
        parsedUser?.token ||
        parsedUser?.accessToken ||
        parsedUser?.authToken ||
        null;

      if (!token || token === "undefined" || token === "null") {
        return null;
      }

      return token;
    } catch (error) {
      console.warn("Unable to read auth token from localStorage:", error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const token = getAuthToken();
    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Please log in to use the AI Assistant. Your session appears to be missing or expired.",
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(
        `${apiUrl}/ai/chat`,
        {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            userMessage,
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const rawReply = response.data.choices[0].message.content;
      const aiReply = rawReply.replace(/\*\*/g, "").trim();

      setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "I apologize, but I am unable to process your request at this moment. Please try again shortly.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, y: 16 }}
        animate={{ scale: 1, y: [0, -8, 0] }}
        transition={{
          scale: { duration: 0.25 },
          y: { repeat: Infinity, duration: 3.5, ease: "easeInOut" },
        }}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI assistant"
        style={{
          position: "fixed",
          bottom: "1.75rem",
          right: "1.75rem",
          zIndex: 9999,
          width: "64px",
          height: "64px",
          padding: "0",
          borderRadius: "16px",
          border: "none",
          background: "transparent",
          color: "#fff",
          boxShadow: "none",
          cursor: "pointer",
          display: isOpen ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <RobotLauncher />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: "fixed",
              bottom: "6rem",
              right: "2rem",
              width: "min(400px, calc(100vw - 4rem))",
              height: "min(600px, calc(100vh - 8rem))",
              zIndex: 10000,
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(13, 18, 32, 0.95)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.2rem",
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "var(--grad-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                    Fin2Line Assistant
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                    Always active
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: "0.5rem",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "0.8rem 1rem",
                    borderRadius: msg.role === "user" ? "18px 18px 2px 18px" : "18px 18px 18px 2px",
                    background: msg.role === "user" ? "var(--grad-primary)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div style={{ alignSelf: "flex-start", padding: "0.5rem 0" }}>
                  <TypingDots accent="#7F57FB" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: "1.2rem",
                background: "rgba(255,255,255,0.02)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                gap: "0.75rem",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question..."
                className="ai-assistant-input"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "0.75rem 1rem",
                  color: "#fff",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "var(--grad-primary)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
