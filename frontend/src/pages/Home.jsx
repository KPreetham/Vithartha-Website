import React, { useRef, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  Users,
  User,
  Zap,
  BarChart3,
  FileCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  Layers,
  Bot,
  Sparkles,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

void motion;

const PremiumCard = ({
  children,
  style = {},
  className = "",
  glowColor = "rgba(103, 141, 255, 0.15)",
}) => {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const bgOverlayRef = useRef(null);
  const borderRef = useRef(null);
  const borderGlowRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotX = ((y - cy) / cy) * -3;
      const rotY = ((x - cx) / cx) * 3;

      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02) translateY(-3px)`;

      if (bgOverlayRef.current) {
        bgOverlayRef.current.style.opacity = "1";
      }

      if (borderRef.current) {
        borderRef.current.style.opacity = "1";

        // Calculate angle for dynamic flowing border
        const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 90;
        const mask = `conic-gradient(from ${angle}deg at 50% 50%, transparent 0deg, black 60deg, transparent 120deg)`;

        borderRef.current.style.webkitMaskImage = mask;
        borderRef.current.style.maskImage = mask;
      }

      if (glowRef.current) {
        glowRef.current.style.left = `${x}px`;
        glowRef.current.style.top = `${y}px`;
        glowRef.current.style.opacity = "1";
      }

      if (borderGlowRef.current) {
        const baseGlow = glowColor.split(",").slice(0, 3).join(",");
        borderGlowRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, ${baseGlow}, 0.8), transparent 40%)`;
        borderGlowRef.current.style.opacity = "1";
      }
    },
    [glowColor],
  );

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";

    if (bgOverlayRef.current) bgOverlayRef.current.style.opacity = "0";
    if (borderRef.current) borderRef.current.style.opacity = "0";
    if (glowRef.current) glowRef.current.style.opacity = "0";
    if (borderGlowRef.current) borderGlowRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        borderRadius: "24px",
        ...style,
        background: "transparent",
        border: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--grad-dark-glass)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          overflow: "hidden",
        }}
      >
        {/* Hover Darken Overlay */}
        <div
          ref={bgOverlayRef}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            opacity: 0,
            transition: "opacity 0.3s ease",
            zIndex: 1,
          }}
        />

        <div
          ref={glowRef}
          style={{
            position: "absolute",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 0.3s ease",
            zIndex: 0,
          }}
        />
      </div>

      {/* Dynamic Edge Highlight — Follows Cursor */}
      <div
        ref={borderRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "24px",
          border: `2.5px solid ${glowColor.replace("0.15", "0.6").replace("0.2", "0.6")}`,
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease, mask-image 0.2s ease",
          zIndex: 2,
        }}
      />

      <div
        ref={borderGlowRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "24px",
          padding: "2.5px",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          zIndex: 3,
        }}
      />

      <div style={{ position: "relative", zIndex: 3, height: "100%" }}>
        {children}
      </div>
    </div>
  );
};

const services = [
  {
    icon: TrendingUp,
    title: "Income Tax",
    desc: "Expert tax planning and filing for individuals and corporations to ensure optimal compliance.",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.07)",
    border: "rgba(245, 158, 11, 0.15)",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    icon: FileCheck,
    title: "GST Compliance",
    desc: "End to End GST management from registration and returns to complex notice representation.",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.07)",
    border: "rgba(16, 185, 129, 0.15)",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: BarChart3,
    title: "Virtual CFO Services",
    desc: "Digital financial leadership to support your company's fundamental decision-making process.",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.07)",
    border: "rgba(139, 92, 246, 0.15)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: Zap,
    title: "Start-up Mentorship",
    desc: "Strategic guidance to navigate the complexities of launch and drive early-stage growth.",
    color: "#d946ef",
    bg: "rgba(217, 70, 239, 0.07)",
    border: "rgba(217, 70, 239, 0.15)",
    glow: "rgba(217, 70, 239, 0.15)",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Legal",
    desc: "Corporate services covering MCA filings, annual returns, and expert legal advisory.",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.07)",
    border: "rgba(59, 130, 246, 0.15)",
    glow: "rgba(59, 130, 246, 0.15)",
  },
  {
    icon: Users,
    title: "Business Registration",
    desc: "Seamless company incorporation and startup consulting to build your business foundation.",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.07)",
    border: "rgba(239, 68, 68, 0.15)",
    glow: "rgba(239, 68, 68, 0.15)",
  },
];

/*
const testimonials = [
  {
    name: "Aditi Sharma",
    role: "Founder, TechNova",
    avatar: "AS",
    text: "Fin2Line completely transformed our financial operations. Their Virtual CFO service gave us the clarity we needed to scale confidently.",
    rating: 5,
    avatarColor: "#8B1A2D",
  },
  {
    name: "Rahul Deshmukh",
    role: "CEO, GrowthPulse",
    avatar: "RD",
    text: "Excellent GST compliance support. They handled everything seamlessly and saved us from compliance headaches.",
    rating: 5,
    avatarColor: "#4AADA0",
  },
  {
    name: "Kavita Iyer",
    role: "Director, IdeaForge",
    avatar: "KI",
    text: "The startup mentorship program was a game-changer. We went from idea stage to funding in just 8 months.",
    rating: 5,
    avatarColor: "#EFA020",
  },
];
*/

const Home = () => {
  const navigate = useNavigate();
  // const [activeTestimonial, setActiveTestimonial] = useState(0);
  const isLoggedIn = !!localStorage.getItem("user");
  const [typingSuggestionIndex, setTypingSuggestionIndex] = useState(0);
  const [typingSuggestion, setTypingSuggestion] = useState("");
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== "undefined" && document.body.classList.contains("light-mode"),
  );

  const homeText = isLightMode ? "#111111" : "#ffffff";
  const homeTextSoft = isLightMode ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.72)";
  const homeTextMuted = isLightMode ? "rgba(0,0,0,0.58)" : "rgba(255,255,255,0.58)";
  const homeAccentText = isLightMode ? "#678dff" : "#8caaff";

  // AI section uses dark cards regardless of theme, so it needs light text
  const aiText = "#ffffff";
  const aiTextSoft = "rgba(255,255,255,0.72)";
  const aiTextMuted = "rgba(255,255,255,0.58)";
  const aiAccentText = "#8caaff";

  const openAIAssistant = useCallback(() => {
    if (typeof window !== "undefined" && typeof window.openFin2LineAssistant === "function") {
      window.openFin2LineAssistant();
      return;
    }

    window.dispatchEvent(new CustomEvent("fin2line:open-ai-assistant"));
  }, []);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightMode(document.body.classList.contains("light-mode"));
    };

    syncTheme();
    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  useEffect(() => {
    const suggestionBank = [
      "I can map your goals to the best service, then explain the next steps clearly.",
      "I can help you compare compliance, tax, finance, and advisory options side by side.",
      "I can suggest the right service based on your stage, budget, and current filing load.",
    ];

    const currentSuggestion = suggestionBank[typingSuggestionIndex % suggestionBank.length];
    const clearTimer = window.setTimeout(() => {
      setTypingSuggestion("");
    }, 0);

    let charIndex = 0;
    const interval = window.setInterval(() => {
      charIndex += 1;
      setTypingSuggestion(currentSuggestion.slice(0, charIndex));
      if (charIndex >= currentSuggestion.length) {
        window.clearInterval(interval);
      }
    }, 16);

    const timeout = window.setTimeout(() => {
      setTypingSuggestionIndex((prev) => (prev + 1) % suggestionBank.length);
    }, 3800);

    return () => {
      window.clearTimeout(clearTimer);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [typingSuggestionIndex]);

  /*
    useEffect(() => {
      const interval = setInterval(() => {
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000); // Slide every 5 seconds
      return () => clearInterval(interval);
    }, []);
  */

  return (
    <div
      className="home-page-shell"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
      }}
    >
      <div className="home-page-backdrop" aria-hidden="true" />

      {/* ===== HERO ===== */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {/* Clean gradient background — refined via CSS */}
        <div className="hero-bg">
          <div className="hero-gradient-sweep" />
          <div className="home-hero-texture" aria-hidden="true">
            <div className="home-hero-texture-core" />
            <div className="home-hero-texture-noise" />
            <div className="home-hero-texture-grid" />
            <div className="home-hero-texture-bottom" />
          </div>
          {/* CareerZenith Ambient Glow */}
          <div style={{
            position: "absolute",
            right: "-8%",
            bottom: "-18%",
            width: "72%",
            height: "78%",
            background: "radial-gradient(circle at center, rgba(180, 165, 255, 0.12) 0%, transparent 68%)",
            filter: "blur(135px)",
            zIndex: -1,
            pointerEvents: "none",
          }} />
        </div>

        <div
          className="container hero-container"
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "11rem 2rem 5rem",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
              fontWeight: 600,
              color: homeText,
              lineHeight: 1.15,
              letterSpacing: "0.05em",
              marginBottom: "1.6rem",
            }}
          >
            Your direct path to
            <br />
            <span className="compliance-gradient-text">
              compliance
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: homeTextSoft,
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.75,
            }}
          >
            We simplify registrations, filings and legal requirements so your
            business stays compliant without slowing down.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              display: "flex",
              gap: "1.2rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {!isLoggedIn && (
              <button
                id="hero-cta-btn"
                className="btn btn-hero-modern btn-lg"
                style={{
                  fontSize: "0.97rem",
                  padding: "0.9rem 2.2rem",
                }}
                onClick={() => navigate("/login")}
              >
                Start Your Journey <ArrowRight size={19} />
              </button>
            )}
            <button
              id="hero-services-btn"
              className="btn btn-hero-modern btn-lg"
              style={{
                fontSize: "0.97rem",
                padding: "0.9rem 2.2rem",
              }}
              onClick={() => navigate("/recommendations")}
            >
              Explore Services <Layers size={19} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section
        className="section"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        {/* Light page accent */}
        <div className="page-gradient-accent" />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="section-label-white" style={{ color: homeTextMuted }}>Our Services</div>
              <h2
                className="section-title"
                style={{ fontWeight: 600, letterSpacing: "0.05em", color: homeText }}
              >
                Comprehensive Business Solutions
              </h2>
              <p className="section-sub" style={{ margin: "0 auto", color: homeTextSoft }}>
                Everything your startup needs to stay compliant, grow
                confidently, and thrive in the modern business landscape.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <PremiumCard
              className="home-services-card"
              glowColor="rgba(103, 141, 255, 0.2)"
              style={{ padding: "3.5rem", cursor: "default" }}
            >
              <div
                className="grid-2 home-services-grid"
                style={{ gap: "3rem 2rem" }}
              >
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.title}
                      onClick={() => navigate("/services")}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        gap: "1.5rem",
                        padding: "1rem 0",
                        borderBottom: isLightMode ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.05)",
                        transition: "transform 0.2s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateX(5px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <div
                        style={{
                          padding: "0.85rem",
                          borderRadius: "50%",
                          border: `1px solid var(--border)`,
                          flexShrink: 0,
                          alignSelf: "flex-start",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={22} color={service.color} />
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "1.15rem",
                            marginBottom: "0.5rem",
                            color: homeText,
                            fontWeight: 700,
                          }}
                        >
                          {service.title}
                        </h3>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: homeTextSoft,
                            lineHeight: 1.6,
                            margin: 0,
                            flex: 1,
                          }}
                        >
                          {service.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </section>

      {/* ===== WHY FIN2LINE ===== */}
      <section className="section" style={{ background: "transparent" }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <PremiumCard
              className="home-why-card"
              glowColor="rgba(16, 185, 129, 0.2)"
              style={{ padding: "4rem 3rem" }}
            >
              <div
                className="why-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "5rem",
                  alignItems: "center",
                }}
              >
                {/* Left: Text */}
                <div>
                  <div className="section-label-white" style={{ color: homeTextMuted }}>Why Choose Us</div>
                  <h2
                    className="section-title"
                    style={{
                      fontSize: "2.4rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      color: homeText,
                    }}
                  >
                    Your Growth is Our
                    <br />
                    <span style={{ color: "#10b981" }}>Commitment</span>
                  </h2>
                  <p
                    style={{
                      color: homeTextSoft,
                      marginBottom: "2.5rem",
                      fontSize: "0.97rem",
                      lineHeight: 1.8,
                    }}
                  >
                    We combine deep financial expertise with cutting-edge
                    technology to deliver consulting that's fast, accurate, and
                    built specifically for modern startups.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    {[
                      {
                        title: "Dedicated Advisors",
                        desc: "A personal CA and financial advisor assigned to your account.",
                        color: "#10b981",
                      },
                      {
                        title: "Real-time Dashboard",
                        desc: "Track compliance deadlines, documents, and service status live.",
                        color: "#3b82f6",
                      },
                      {
                        title: "Always-on Support",
                        desc: "WhatsApp, email, and call support when you need it most.",
                        color: "#f59e0b",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        style={{
                          display: "flex",
                          gap: "1rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            border: `1px solid ${item.color}50`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          <CheckCircle size={12} color={item.color} />
                        </div>
                        <div>
                          <p
                            style={{
                              fontWeight: 700,
                              color: homeText,
                              margin: 0,
                              fontSize: "1rem",
                            }}
                          >
                            {item.title}
                          </p>
                          <p
                            style={{
                              color: homeTextMuted,
                              fontSize: "0.85rem",
                              margin: "0.4rem 0 0",
                            }}
                          >
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary btn-lg"
                    id="why-cta-btn"
                    style={{
                      marginTop: "3rem",
                      borderRadius: "var(--radius-full)",
                      background: "var(--grad-primary)",
                      color: "#fff",
                      border: "none",
                    }}
                    onClick={() => navigate("/dashboard")}
                  >
                    Explore Dashboard <ArrowRight size={17} />
                  </button>
                </div>

                {/* Right: Visual cards (plain glass rows) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      padding: "2rem",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <TrendingUp
                      size={30}
                      style={{ marginBottom: "0.8rem", color: "#10b981" }}
                    />
                    <h3
                      style={{
                        fontSize: "1.3rem",
                        marginBottom: "0.5rem",
                        color: homeText,
                      }}
                    >
                      Expert-Led Growth
                    </h3>
                    <p
                      style={{
                        fontSize: "0.88rem",
                        lineHeight: 1.65,
                        margin: 0,
                        color: homeTextSoft,
                      }}
                    >
                      Our team of Chartered Accountants, legal experts and
                      business strategists work together to accelerate your
                      growth.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                      gap: "1.5rem",
                    }}
                  >
                    {[
                      {
                        icon: Users,
                        label: "500+",
                        sub: "Happy Clients",
                        color: "#10b981",
                      },
                      {
                        icon: ShieldCheck,
                        label: "100%",
                        sub: "Compliance",
                        color: "#8b5cf6",
                      },
                      {
                        icon: Zap,
                        label: "48h",
                        sub: "Response",
                        color: "#d946ef",
                      },
                      {
                        icon: Star,
                        label: "4.9★",
                        sub: "Avg Rating",
                        color: "#3b82f6",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "16px",
                            padding: "1.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          <Icon
                            size={20}
                            color={item.color}
                            style={{ marginBottom: "0.6rem" }}
                          />
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "1.5rem",
                              fontWeight: 900,
                              color: homeText,
                              letterSpacing: "-0.04em",
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: homeTextMuted,
                              marginTop: "0.2rem",
                            }}
                          >
                            {item.sub}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </section>

      {/* ===== AI ASSISTANT PREVIEW ===== */}
      <section
        className="section"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "transparent",
          paddingTop: "1rem",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%), radial-gradient(circle at 20% 0%, rgba(127,87,251,0.12), transparent 30%), radial-gradient(circle at 80% 100%, rgba(16,185,129,0.08), transparent 28%)",
            pointerEvents: "none",
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div
            className="ai-assistant-preview-grid home-ai-preview-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "4rem",
              padding: "4rem 0",
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="home-ai-card home-ai-card-left"
              style={{
                position: "relative",
                padding: "0 0 1.2rem 0",
                background: "transparent",
                overflow: "visible",
                display: "flex",
                flexDirection: "column",
                height: "94%",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0",
                  background: "transparent",
                  color: aiTextMuted,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "1.8rem",
                  marginTop: "-28px",
                  border: "none",
                }}
              >
                <Sparkles size={14} strokeWidth={2} />
                Smart Guidance
              </div>

              <h3
                style={{
                  fontSize: "clamp(1.75rem, 2.4vw, 2.35rem)",
                  lineHeight: 1.06,
                  color: aiText,
                  marginBottom: "0.85rem",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                }}
              >
                AI Chat for service matching
              </h3>
              <p
                style={{
                  color: aiTextSoft,
                  lineHeight: 1.7,
                  margin: "0 0 1.2rem 0",
                  fontSize: "1.02rem",
                  maxWidth: "95%",
                  fontWeight: 400,
                }}
              >
                Tell us what your business is about and the
                support you need. The assistant explains the best
                financial services for your stage, so you can choose with
                confidence.
              </p>

              <div
                style={{
                  marginTop: "1.1rem",
                  borderRadius: "24px",
                  padding: "2rem 1.6rem",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(13, 17, 32, 0.65)",
                  boxShadow: "0 20px 50px -34px rgba(0,0,0,0.9)",
                  position: "relative",
                  overflow: "hidden",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "440px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100px",
                    background: "radial-gradient(ellipse at 50% 0%, rgba(127,87,251,0.15), transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 50% 45%, rgba(127,87,251,0.18), transparent 32%), radial-gradient(circle at 50% 42%, rgba(16,185,129,0.08), transparent 40%)",
                    pointerEvents: "none",
                  }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 }}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "0.85rem 1.2rem",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: aiText,
                      fontWeight: 500,
                      fontSize: "0.98rem",
                    }}
                  >
                    Can you help me choose the right financial service?
                  </div>
                </motion.div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                    marginBottom: "1.1rem",
                  }}
                >
                  <div
                    style={{
                      color: aiAccentText,
                      marginTop: "0.1rem",
                      textShadow: isLightMode ? "none" : "0 0 12px rgba(225,107,255,0.55)",
                    }}
                  >
                    ✦
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: aiText,
                      fontSize: "0.98rem",
                      lineHeight: 1.8,
                      fontWeight: 600,
                      maxWidth: "94%",
                    }}
                  >
                    Yes. I’ll analyze your business needs, compare the right
                    service options and help you choose the best service for your
                    goals.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "999px",
                      background:
                        "radial-gradient(circle at 35% 35%, rgba(245,181,255,0.9) 0%, rgba(127,87,251,0.72) 45%, rgba(96,63,211,0.6) 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow:
                        "0 0 0 1px rgba(127,87,251,0.22) inset, 0 0 24px rgba(127,87,251,0.24)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: aiText,
                      flexShrink: 0,
                    }}
                  >
                    ✦
                  </div>
                  <div style={{ display: "flex", gap: "0.28rem" }}>
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#7F57FB",
                        boxShadow: "0 0 14px rgba(127,87,251,0.45)",
                      }}
                    />
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, delay: 0.12 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#7F57FB",
                        boxShadow: "0 0 14px rgba(127,87,251,0.45)",
                      }}
                    />
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, delay: 0.24 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#7F57FB",
                        boxShadow: "0 0 14px rgba(127,87,251,0.45)",
                      }}
                    />
                  </div>
                </div>
              </div>

            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="home-ai-card home-ai-card-right"
              style={{
                position: "relative",
                padding: "0 0 1.2rem 0",
                background: "transparent",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0",
                  background: "transparent",
                  color: aiTextMuted,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "1.2rem",
                  border: "none",
                }}
              >
                <MessageSquare size={14} strokeWidth={2} />
                Personalised Advice
              </div>
              <h3
                style={{
                  fontSize: "clamp(2.0rem, 2.6vw, 2.75rem)",
                  lineHeight: 1.06,
                  color: aiText,
                  marginBottom: "0.85rem",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                Built to make service selection simple
              </h3>
              <p
                style={{
                  color: aiTextSoft,
                  lineHeight: 1.75,
                  margin: 0,
                  fontSize: "1.1rem",
                  maxWidth: "95%",
                }}
              >
                The assistant acts like a quick advisor on your homepage. It
                asks the right questions, points you to the right service
                family, and saves time before you speak to our team.
              </p>

              <div
                style={{
                  marginTop: "1.1rem",
                  borderRadius: "24px",
                  padding: "2rem 1.6rem",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(13, 17, 32, 0.65)",
                  boxShadow: "0 20px 50px -34px rgba(0,0,0,0.9)",
                  position: "relative",
                  overflow: "hidden",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "440px",
                }}
              >
                {/* Dotted Background Effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                    pointerEvents: "none",
                    opacity: 0.8,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100px",
                    background: "radial-gradient(ellipse at 50% 0%, rgba(127,87,251,0.15), transparent 70%)",
                    pointerEvents: "none",
                  }}
                />

                <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.95rem",
                      marginBottom: "1.2rem",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "18px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={28} color="rgba(255,255,255,0.35)" strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 16,
                          width: "65%",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.06)",
                          marginBottom: "0.5rem",
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          width: "45%",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                      marginBottom: "1.2rem",
                    }}
                  />

                  <div
                    style={{
                      borderRadius: "18px",
                      padding: "1.35rem",
                      background: "linear-gradient(135deg, rgba(127,87,251,0.06) 0%, rgba(127,87,251,0.02) 100%)",
                      border: "1px solid rgba(127,87,251,0.12)",
                      marginBottom: "auto",
                    }}
                  >
                    <div
                      style={{
                        color: "#A78BFA",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        marginBottom: "0.6rem",
                      }}
                    >
                      Live Suggestion
                    </div>
                    <div style={{ color: aiTextSoft, fontSize: "0.92rem", lineHeight: 1.6 }}>
                      {typingSuggestion}
                      <span style={{ display: "inline-block", width: 2, height: 14, background: "#A78BFA", marginLeft: 4 }} />
                    </div>
                  </div>

                  {/* Reverted Thinking UI (Status bar style) */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      borderRadius: "20px",
                      padding: "0.85rem 1rem",
                      background: "linear-gradient(180deg, rgba(9,11,20,0.92) 0%, rgba(16,18,30,0.95) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 15px 35px -20px rgba(0,0,0,0.8)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(circle at 45% 25%, rgba(127,87,251,0.08), transparent 30%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "14px",
                          background: "linear-gradient(135deg, rgba(127,87,251,0.4) 0%, rgba(16,185,129,0.1) 100%)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Loader2
                          size={16}
                          color={aiText}
                          className="spin"
                          style={{ animation: "spin 2s linear infinite" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: aiText,
                            fontWeight: 500,
                            marginBottom: "0.25rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          Thinking... AI is crafting your suggestion
                        </div>
                        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                              transition={{ repeat: Infinity, duration: 1.0, delay: i * 0.12 }}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "999px",
                                background: "#A78BFA",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            <button
              className="btn btn-hero-modern btn-lg"
              style={{
                minWidth: "240px",
                padding: "1rem 2.2rem",
                background: "linear-gradient(135deg, #7F57FB 0%, #10b981 100%)",
                border: "none",
                boxShadow: "0 16px 30px -18px rgba(127,87,251,0.9)",
              }}
              onClick={openAIAssistant}
            >
              Try Ai Assistant <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      {/* ===== TESTIMONIALS (Disabled) ===== */}
      {/* 
      <section
        className="section"
        style={{
          background: "transparent",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="page-gradient-accent" />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <PremiumCard
              className="home-testimonial-card"
              glowColor="rgba(59, 130, 246, 0.2)"
              style={{
                padding: "clamp(1.75rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3rem)",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "clamp(1.5rem, 4vw, 3.5rem)",
                }}
              >
                <div className="section-tag-purple">Testimonials</div>
                <h2
                  className="section-title"
                  style={{
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    color: "#fff",
                  }}
                >
                  Trusted by Founders Across India
                </h2>
              </div>

              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      padding: "clamp(1.2rem, 4vw, 3rem)",
                      textAlign: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "3px",
                        justifyContent: "center",
                      }}
                    >
                      {Array.from({
                        length: testimonials[activeTestimonial].rating,
                      }).map((_, j) => (
                        <Star
                          key={j}
                          size={16}
                          fill="#EFA020"
                          color="#EFA020"
                        />
                      ))}
                    </div>

                    <p
                      style={{
                        fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
                        color: "#fff",
                        lineHeight: 1.8,
                        fontStyle: "italic",
                        margin: 0,
                      }}
                    >
                      "{testimonials[activeTestimonial].text}"
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        paddingTop: "1.25rem",
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        width: "100%",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background:
                            testimonials[activeTestimonial].avatarColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 800,
                          fontSize: "1rem",
                          letterSpacing: "-0.02em",
                          flexShrink: 0,
                        }}
                      >
                        {testimonials[activeTestimonial].avatar}
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p
                          style={{
                            fontWeight: 700,
                            color: "#fff",
                            fontSize: "0.95rem",
                            margin: 0,
                          }}
                        >
                          {testimonials[activeTestimonial].name}
                        </p>
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "rgba(255,255,255,0.5)",
                            margin: 0,
                          }}
                        >
                          {testimonials[activeTestimonial].role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "1.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      setActiveTestimonial(
                        (i) =>
                          (i - 1 + testimonials.length) % testimonials.length,
                      )
                    }
                    aria-label="Previous testimonial"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.7)",
                      transition: "all 0.2s",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59,130,246,0.25)";
                      e.currentTarget.style.borderColor =
                        "rgba(59,130,246,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      alignItems: "center",
                    }}
                  >
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTestimonial(i)}
                        style={{
                          width: activeTestimonial === i ? "22px" : "8px",
                          height: "8px",
                          borderRadius: "4px",
                          background:
                            activeTestimonial === i
                              ? "#3b82f6"
                              : "rgba(255,255,255,0.2)",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          padding: 0,
                        }}
                        aria-label={`Go to testimonial ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setActiveTestimonial((i) => (i + 1) % testimonials.length)
                    }
                    aria-label="Next testimonial"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.7)",
                      transition: "all 0.2s",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59,130,246,0.25)";
                      e.currentTarget.style.borderColor =
                        "rgba(59,130,246,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </section>
      */}

      {/* ===== CTA BANNER ===== */}
      <section
        style={{
          background: "transparent",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Subtle gradient accents using logo colors */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
                        radial-gradient(ellipse 55% 50% at 75% 50%, rgba(139,26,45,0.1) 0%, transparent 60%),
                        radial-gradient(ellipse 45% 40% at 25% 50%, rgba(74,173,160,0.08) 0%, transparent 55%),
                        radial-gradient(ellipse 30% 30% at 50% 80%, rgba(239,160,32,0.04) 0%, transparent 50%)
                    `,
            pointerEvents: "none",
          }}
        />

        <div
          className="container"
          style={{
            padding: "5.5rem 2rem",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-tag-whitesmoke">Get Started Today</div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                fontWeight: 600,
                color: homeText,
                letterSpacing: "0.05em",
                marginBottom: "1.2rem",
              }}
            >
              Ready to Scale Your Business?
            </h2>
            <p
              style={{
                color: homeTextSoft,
                fontSize: "1.05rem",
                maxWidth: "540px",
                margin: "0 auto 2.8rem",
                lineHeight: 1.8,
              }}
            >
              Take the first step. Answer a few quick questions and get a
              personalized consulting roadmap built for your business.
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                id="cta-explore-dashboard-btn"
                className="btn-hero-modern"
                style={{ padding: "1rem 2.8rem" }}
                onClick={() => navigate("/dashboard")}
              >
                Explore Dashboard <ArrowRight size={19} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
