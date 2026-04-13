import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

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
3. PRICING: If asked, mention that fees start at ₹1,000 and the timeline is typically 2-4 days. Advise them to confirm interest via the recommendations page for precise quotes.
4. SCOPE: If a user asks a general question unrelated to Fin2Line, provide a very brief professional answer if possible, but immediately follow up by asking them to keep questions relevant to Fin2Line's business services.
5. CONCISENESS: Keep responses brief and focused on how Fin2Line can solve the user's business needs.`;

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your Fin2Line AI Assistant. How can I help you with our specialized business services today?",
    },
  ]);
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const user = JSON.parse(localStorage.getItem("user"));
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
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );

      // Clean up the response: remove any remaining markdown bolding and trim whitespace
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
      {/* Floating Robot Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, y: [0, -10, 0] }}
        transition={{
          scale: { duration: 0.3 },
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
        }}
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          display: isOpen ? "none" : "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        {/* Robot Antenna */}
        <div
          style={{
            width: "4px",
            height: "12px",
            background: "#4AADA0",
            borderRadius: "4px 4px 0 0",
            position: "relative",
          }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              position: "absolute",
              top: "-6px",
              left: "-3px",
              width: "10px",
              height: "10px",
              background: "#EFA020",
              borderRadius: "50%",
              boxShadow: "0 0 10px #EFA020",
            }}
          />
        </div>
        {/* Robot Head */}
        <div
          style={{
            width: "52px",
            height: "46px",
            background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
            borderRadius: "16px",
            border: "2px solid #4AADA0",
            boxShadow:
              "0 10px 30px rgba(74, 173, 160, 0.5), inset 0 2px 10px rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glowing Eyes */}
          <div style={{ display: "flex", gap: "10px", zIndex: 2 }}>
            <div
              style={{
                width: "10px",
                height: "14px",
                background: "#4AADA0",
                borderRadius: "5px",
                boxShadow: "0 0 10px #4AADA0",
              }}
            />
            <div
              style={{
                width: "10px",
                height: "14px",
                background: "#4AADA0",
                borderRadius: "5px",
                boxShadow: "0 0 10px #4AADA0",
              }}
            />
          </div>
          {/* Robot Mouth */}
          <div
            style={{
              width: "16px",
              height: "3px",
              background: "rgba(74,173,160,0.5)",
              borderRadius: "2px",
              marginTop: "4px",
              zIndex: 2,
            }}
          />

          {/* Internal circuitry accent */}
          <div
            style={{
              position: "absolute",
              bottom: "-10px",
              right: "-10px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,26,45,0.2) 0%, transparent 70%)",
              zIndex: 1,
            }}
          />
        </div>
        {/* Shadow */}
        <motion.div
          animate={{ scale: [1, 0.8, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          style={{
            width: "40px",
            height: "8px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
            marginTop: "15px",
            filter: "blur(4px)",
          }}
        />
      </motion.div>

      {/* Chat Sidebar / Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.4,
            }}
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              width: "340px",
              height: "540px",
              /* Always dark — this is a floating overlay */
              background:
                "linear-gradient(145deg, rgba(18,18,24,0.97) 0%, rgba(28,28,38,0.97) 100%)",
              backdropFilter: "blur(25px)",
              WebkitBackdropFilter: "blur(25px)",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(74, 173, 160, 0.12)",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              color: "#fff",
            }}
            className="ai-chat-window"
          >
            {/* Header */}
            <div
              style={{
                padding: "1.2rem",
                background:
                  "linear-gradient(135deg, rgba(139, 26, 45, 0.9) 0%, rgba(74, 173, 160, 0.9) 100%)",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                position: "relative",
              }}
            >
              {/* Header Glow Accent */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    padding: "0.5rem",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={22} color="#fff" />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      lineHeight: "1",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Fin2Line Assistant
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.8,
                      marginTop: "0.2rem",
                      fontWeight: 500,
                    }}
                  >
                    AI Business Advisor
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  padding: "0.5rem",
                  borderRadius: "50%",
                  transition: "background 0.2s",
                  zIndex: 1,
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                padding: "1.2rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                background: "rgba(0,0,0,0.2)",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.1) transparent",
              }}
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #8B1A2D 0%, #A32036 100%)"
                        : "rgba(255,255,255,0.07)",
                    /* Always white text — window is always dark */
                    color: "#fff",
                    padding: "1rem 1.2rem",
                    borderRadius: "20px",
                    borderBottomRightRadius:
                      msg.role === "user" ? "4px" : "20px",
                    borderBottomLeftRadius:
                      msg.role === "assistant" ? "4px" : "20px",
                    fontSize: "0.92rem",
                    lineHeight: "1.6",
                    border:
                      msg.role === "assistant"
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "none",
                    boxShadow:
                      msg.role === "user"
                        ? "0 4px 15px rgba(139, 26, 45, 0.3)"
                        : "none",
                  }}
                >
                  {msg.content}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    alignSelf: "flex-start",
                    color: "#4AADA0",
                    padding: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Loader2
                    size={18}
                    className="spin"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    Fin2Line Assistant is thinking...
                  </span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: "1rem",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(0,0,0,0.3)",
                display: "flex",
                gap: "0.6rem",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask Fin2Line AI..."
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1.2rem",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    /* Always white — window is always dark */
                    color: "#fff",
                    outline: "none",
                    fontSize: "0.95rem",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4AADA0";
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.12)";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                style={{
                  background:
                    "linear-gradient(135deg, #4AADA0 0%, #3d8f84 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor:
                    isLoading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: isLoading || !input.trim() ? 0.6 : 1,
                  boxShadow: "0 4px 15px rgba(74, 173, 160, 0.3)",
                }}
              >
                <Send size={20} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
