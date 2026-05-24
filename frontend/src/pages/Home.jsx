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
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
  },
  {
    icon: FileCheck,
    title: "GST Compliance",
    desc: "End to End GST management from registration and returns to complex notice representation.",
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
  },
  {
    icon: BarChart3,
    title: "Virtual CFO Services",
    desc: "Digital financial leadership to support your company's fundamental decision-making process.",
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
  },
  {
    icon: Zap,
    title: "Start-up Mentorship",
    desc: "Strategic guidance to navigate the complexities of launch and drive early-stage growth.",
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Legal",
    desc: "Corporate services covering MCA filings, annual returns, and expert legal advisory.",
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
  },
  {
    icon: Users,
    title: "Business Registration",
    desc: "Seamless company incorporation and startup consulting to build your business foundation.",
    color: "#7a7a7a",
    bg: "rgba(245, 245, 245, 0.9)",
    border: "rgba(190, 190, 190, 0.18)",
    glow: "rgba(190, 190, 190, 0.18)",
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
  const [whySlideIndex, setWhySlideIndex] = useState(0);
  const [isWhyCarouselHovered, setIsWhyCarouselHovered] = useState(false);
  const whyCtaButtonRef = useRef(null);
  const isLightMode = true;

  const homeText = isLightMode ? "#111111" : "#ffffff";
  const homeTextSoft = isLightMode ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.72)";
  const homeTextMuted = isLightMode ? "rgba(0,0,0,0.58)" : "rgba(255,255,255,0.58)";
  const homeAccentText = isLightMode ? "#678dff" : "#8caaff";

  // AI preview section uses light cards with dark text
  const aiText = "#000000";
  const aiTextSoft = "rgba(0,0,0,0.62)";
  const aiTextMuted = "rgba(0,0,0,0.58)";
  const aiAccentText = "#8caaff";

  const openAIAssistant = useCallback(() => {
    if (typeof window !== "undefined" && typeof window.openFin2LineAssistant === "function") {
      window.openFin2LineAssistant();
      return;
    }

    window.dispatchEvent(new CustomEvent("fin2line:open-ai-assistant"));
  }, []);

  const whyCarouselSlides = [
    {
      id: "growth",
      icon: TrendingUp,
      accent: "#10b981",
      kicker: "Why Choose Us",
      title: "Your Growth is Our Commitment",
      description:
        "We combine deep financial expertise with cutting-edge technology to deliver consulting that's fast, accurate, and built specifically for modern startups.",
    },
    {
      id: "advisors",
      icon: CheckCircle,
      accent: "#8a8a8a",
      kicker: "Dedicated Advisors",
      title: "A Personal Expert Team",
      description:
        "A personal CA and financial advisor assigned to your account.",
    },
    {
      id: "dashboard",
      icon: BarChart3,
      accent: "#3b82f6",
      kicker: "Real-time Dashboard",
      title: "Track Every Milestone Live",
      description:
        "Track compliance deadlines, documents, and service status live.",
    },
    {
      id: "support",
      icon: MessageSquare,
      accent: "#d946ef",
      kicker: "Always-on Support",
      title: "Support When You Need It",
      description:
        "WhatsApp, email, and call support when you need it most.",
    },
    {
      id: "clients",
      icon: Users,
      accent: "#10b981",
      kicker: "500+ Happy Clients",
      title: "Trusted By Growing Businesses",
      description:
        "Hundreds of founders rely on our team for compliance and growth support.",
    },
    {
      id: "compliance",
      icon: ShieldCheck,
      accent: "#8b5cf6",
      kicker: "100% Compliance",
      title: "Accuracy You Can Depend On",
      description:
        "We help you stay fully compliant with timely filings and rigorous review.",
    },
  ];

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWhySlideIndex((s) => (s + 1) % whyCarouselSlides.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [whyCarouselSlides.length]);

  useEffect(() => {
    const button = whyCtaButtonRef.current;
    if (!button) return;

    button.style.setProperty("background", "linear-gradient(135deg, #fb6a21 0%, #f55f18 100%)", "important");
    button.style.setProperty("background-color", "#f97316", "important");
    button.style.setProperty("color", "#ffffff", "important");
    button.style.setProperty("border", "none", "important");
    button.style.setProperty("box-shadow", "0 16px 30px -18px rgba(245, 95, 24, 0.45)", "important");
  }, []);

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
        background: "#ffffff",
        color: "#111111",
        minHeight: "100vh",
      }}
    >
      <div className="home-page-backdrop" aria-hidden="true" />

      {/* ===== HERO ===== */}
        <section
          className="home-hero-section"
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
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
            background: "radial-gradient(circle at center, rgba(245,245,245,0.9) 0%, transparent 68%)",
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
            textAlign: "left",
            padding: "6rem clamp(1rem, 4vw, 3rem) 5rem clamp(1rem, 4vw, 3rem)",
            maxWidth: "1400px",
            margin: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "3rem",
          }}
        >
          {/* Left Column - Text Content */}
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              minWidth: "0",
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
                color: "#000000",
                lineHeight: 1.15,
                letterSpacing: "0.05em",
                marginBottom: "1.6rem",
                maxWidth: "fit-content",
              }}
            >
              Your direct path to <span style={{ color: "#000000" }}>compliance</span>
            </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "#000000",
              maxWidth: "640px",
              margin: "0 0 2.5rem",
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
              justifyContent: "flex-start",
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

          {/* Right Column - Image */}
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "1.5rem",
              minWidth: "0",
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 48 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              style={{
                width: "100%",
                maxWidth: "640px",
                aspectRatio: "1",
              }}
            >
              <img
                src="/homepageimage.png?v=2"
                alt="Vithartha Financial Services"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "24px",
                }}
              />
            </motion.div>
          </div>
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
              <div className="section-label-white" style={{ color: "#000000" }}>Our Services</div>
              <h2
                className="section-title"
                style={{ fontWeight: 600, letterSpacing: "0.05em", color: "#000000" }}
              >
                Comprehensive Business Solutions
              </h2>
              <p className="section-sub" style={{ margin: "0 auto", color: homeTextSoft }}>
                Everything your startup needs to stay compliant, grow
                confidently and thrive in the modern business landscape.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div
              className="home-services-wrapper"
              style={{
                padding: "2.5rem",
                borderRadius: "16px",
                background: "transparent",
              }}
            >
              <div
                className="home-services-row"
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  padding: "1rem 0",
                }}
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
                        flexDirection: "column",
                        gap: "1rem",
                        padding: "1.25rem",
                        flex: "1 1 300px",
                        minWidth: "220px",
                        maxWidth: "340px",
                        background: "linear-gradient(180deg, #f8f8f9 0%, #f2f3f4 100%)",
                        border: "1px solid rgba(0,0,0,0.04)",
                        borderRadius: "14px",
                        boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                        color: "#000000",
                        transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 0 rgba(0,0,0,0.02)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.9rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.6rem",
                            borderRadius: "50%",
                            border: `1px solid rgba(0,0,0,0.06)`,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.6)",
                          }}
                        >
                          <Icon size={20} color={service.color} />
                        </div>
                        <h3
                          style={{
                            fontSize: "1.05rem",
                            margin: 0,
                            color: "#000000",
                            fontWeight: 700,
                          }}
                        >
                          {service.title}
                        </h3>
                      </div>

                      <p
                        style={{
                          fontSize: "0.95rem",
                          color: homeTextMuted,
                          lineHeight: 1.6,
                          margin: "0.85rem 0 0",
                          flex: 1,
                        }}
                      >
                        {service.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <div
              className="home-why-carousel-shell"
              onMouseEnter={() => setIsWhyCarouselHovered(true)}
              onMouseLeave={() => setIsWhyCarouselHovered(false)}
              style={{
                borderRadius: "24px",
                padding: "3rem clamp(1.25rem, 3vw, 2.5rem)",
                background: isWhyCarouselHovered
                  ? "linear-gradient(180deg, #f4f5f6 0%, #eceef0 100%)"
                  : "linear-gradient(180deg, #f8f8f9 0%, #f1f2f3 100%)",
                border: isWhyCarouselHovered
                  ? "1px solid rgba(156,163,175,0.55)"
                  : "1px solid rgba(0,0,0,0.05)",
                boxShadow: isWhyCarouselHovered
                  ? "0 16px 34px rgba(0,0,0,0.08)"
                  : "0 12px 30px rgba(0,0,0,0.05)",
                minHeight: "360px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1.5rem",
                transition: "background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={whyCarouselSlides[whySlideIndex].id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}
                >
                  <div className="section-label-white" style={{ color: "#4b5563" }}>
                    {whyCarouselSlides[whySlideIndex].kicker}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    {(() => {
                      const Icon = whyCarouselSlides[whySlideIndex].icon;
                      return <Icon size={30} color={whyCarouselSlides[whySlideIndex].accent} />;
                    })()}
                    <h2
                      className="section-title"
                      style={{
                        fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                        color: "#000000",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {whyCarouselSlides[whySlideIndex].title}
                    </h2>
                  </div>
                  <p
                    style={{
                      color: homeTextMuted,
                      margin: 0,
                      fontSize: "1rem",
                      lineHeight: 1.8,
                      maxWidth: "860px",
                    }}
                  >
                    {whyCarouselSlides[whySlideIndex].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.9rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                  {whyCarouselSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setWhySlideIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      style={{
                        width: idx === whySlideIndex ? 20 : 8,
                        height: 8,
                        borderRadius: 10,
                        background: idx === whySlideIndex ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.2)",
                        border: "none",
                        transition: "width 0.2s ease, background 0.2s ease",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>

                <button
                  className="why-cta-button"
                  id="why-cta-btn"
                  ref={whyCtaButtonRef}
                  style={{
                    borderRadius: "var(--radius-full)",
                  }}
                  onClick={() => navigate("/dashboard")}
                >
                  Explore Dashboard <ArrowRight size={17} />
                </button>
              </div>
            </div>
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
              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%), radial-gradient(circle at 20% 0%, rgba(228,228,228,0.12), transparent 30%), radial-gradient(circle at 80% 100%, rgba(214,214,214,0.08), transparent 28%)",
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(156,163,175,0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.08)";
                }}
                style={{
                  marginTop: "1.1rem",
                  borderRadius: "24px",
                  padding: "2rem 1.6rem",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  background: "#ffffff",
                  boxShadow: "0 20px 50px -34px rgba(0,0,0,0.25)",
                  position: "relative",
                  overflow: "hidden",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "440px",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100px",
                    background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.04), transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.03), transparent 32%), radial-gradient(circle at 50% 42%, rgba(0,0,0,0.02), transparent 40%)",
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
                      background: "#f5f6f7",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
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
                    <MessageSquare size={22} color="#111111" strokeWidth={2.2} />
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
                      background: "linear-gradient(180deg, #fb6a21 0%, #f55f18 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 10px 24px rgba(245, 95, 24, 0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={22} color="#ffffff" strokeWidth={2.2} />
                  </div>
                  <div style={{ display: "flex", gap: "0.28rem" }}>
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#d6d6d6",
                        boxShadow: "0 0 14px rgba(180,180,180,0.35)",
                      }}
                    />
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, delay: 0.12 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#d6d6d6",
                        boxShadow: "0 0 14px rgba(180,180,180,0.35)",
                      }}
                    />
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.1, delay: 0.24 }}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "999px",
                        background: "#d6d6d6",
                        boxShadow: "0 0 14px rgba(180,180,180,0.35)",
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(156,163,175,0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.08)";
                }}
                style={{
                  marginTop: "1.1rem",
                  borderRadius: "24px",
                  padding: "2rem 1.6rem",
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  background: "#ffffff",
                  boxShadow: "0 20px 50px -34px rgba(0,0,0,0.25)",
                  position: "relative",
                  overflow: "hidden",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "440px",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Dotted Background Effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                    pointerEvents: "none",
                    opacity: 0.45,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100px",
                    background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.04), transparent 70%)",
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
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "#f5f6f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={28} color="rgba(0,0,0,0.35)" strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 16,
                          width: "65%",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.08)",
                          marginBottom: "0.5rem",
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          width: "45%",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.06)",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(0,0,0,0.08)",
                      marginBottom: "1.2rem",
                    }}
                  />

                  <div
                    style={{
                      borderRadius: "18px",
                      padding: "1.35rem",
                      background: "linear-gradient(135deg, rgba(245,245,245,0.95) 0%, rgba(235,235,235,0.98) 100%)",
                      border: "1px solid rgba(200,200,200,0.12)",
                      marginBottom: "auto",
                    }}
                  >
                    <div
                      style={{
                        color: "#9b9b9b",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        marginBottom: "0.6rem",
                      }}
                    >
                      Live Suggestion
                    </div>
                    <div style={{ color: "#000000", fontSize: "0.92rem", lineHeight: 1.6 }}>
                      {typingSuggestion}
                      <span style={{ display: "inline-block", width: 2, height: 14, background: "#cfcfcf", marginLeft: 4 }} />
                    </div>
                  </div>

                  {/* Reverted Thinking UI (Status bar style) */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      borderRadius: "20px",
                      padding: "0.85rem 1rem",
                      background: "#f5f6f7",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      boxShadow: "0 10px 22px -16px rgba(0,0,0,0.25)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(circle at 45% 25%, rgba(0,0,0,0.05), transparent 30%)",
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
                        background: "linear-gradient(135deg, rgba(240,240,240,1) 0%, rgba(230,230,230,0.95) 100%)",
                        border: "1px solid rgba(0,0,0,0.08)",
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
                                background: "#d0d0d0",
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
              id="home-ai-try-btn"
              className="btn btn-hero-modern btn-lg"
              style={{
                minWidth: "240px",
                padding: "1rem 2.2rem",
                background: "linear-gradient(135deg, #fb6a21 0%, #f55f18 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 16px 30px -18px rgba(245,95,24,0.45)",
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
            <div className="section-tag-whitesmoke" style={{ color: "#000000", opacity: 1 }}>Get Started Today</div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                fontWeight: 600,
                color: "#000000",
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
