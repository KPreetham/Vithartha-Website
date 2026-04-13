import React, { useRef, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  Users,
  Zap,
  BarChart3,
  FileCheck,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PremiumCard = ({
  children,
  style = {},
  className = "",
  glowColor = "rgba(16, 185, 129, 0.15)",
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
    icon: FileCheck,
    title: "Income Tax & GST",
    desc: "End-to-end compliance management — from registration to notice representation with zero hassle.",
    color: "#10b981", // green
    bg: "rgba(16, 185, 129, 0.07)",
    border: "rgba(16, 185, 129, 0.15)",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: BarChart3,
    title: "Virtual CFO Services",
    desc: "Digital financial leadership to support your company's fundamental decision-making process.",
    color: "#8b5cf6", // violet
    bg: "rgba(139, 92, 246, 0.07)",
    border: "rgba(139, 92, 246, 0.15)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: Zap,
    title: "Start-up Mentorship",
    desc: "Strategic guidance to navigate the complexities of launch and drive early-stage growth.",
    color: "#d946ef", // purple
    bg: "rgba(217, 70, 239, 0.07)",
    border: "rgba(217, 70, 239, 0.15)",
    glow: "rgba(217, 70, 239, 0.15)",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Legal",
    desc: "Corporate services covering MCA filings, annual returns, and expert legal advisory.",
    color: "#3b82f6", // blue
    bg: "rgba(59, 130, 246, 0.07)",
    border: "rgba(59, 130, 246, 0.15)",
    glow: "rgba(59, 130, 246, 0.15)",
  },
];

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

const Home = () => {
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const isLoggedIn = !!localStorage.getItem("user");

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Slide every 5 seconds
    return () => clearInterval(interval);
  }, []);

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
              color: "var(--text)",
              lineHeight: 1.15,
              letterSpacing: "0.05em",
              marginBottom: "1.6rem",
            }}
          >
            Your direct path to
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #EFA020 0%, #F5B94A 50%, #4AADA0 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              compliance
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.75,
            }}
          >
            We simplify registrations, filings, and legal requirements so your
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
              Explore Services
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
              <div className="section-tag-vgreen">Our Services</div>
              <h2
                className="section-title"
                style={{ fontWeight: 600, letterSpacing: "0.05em" }}
              >
                Comprehensive Business Solutions
              </h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>
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
              glowColor="rgba(59, 130, 246, 0.2)"
              style={{ padding: "3.5rem", cursor: "default" }}
            >
              <div
                className="grid-2 home-services-grid"
                style={{ gap: "3rem 2rem" }}
              >
                {services.map((service, i) => {
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
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
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
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        >
                          {service.title}
                        </h3>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: "rgba(255,255,255,0.7)",
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
                  <div className="section-tag-vgreen">Why Choose Us</div>
                  <h2
                    className="section-title"
                    style={{
                      fontSize: "2.4rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      color: "#fff",
                    }}
                  >
                    Your Growth is Our
                    <br />
                    <span style={{ color: "#10b981" }}>Commitment</span>
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.7)",
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
                    ].map((item, i) => (
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
                              color: "#fff",
                              margin: 0,
                              fontSize: "1rem",
                            }}
                          >
                            {item.title}
                          </p>
                          <p
                            style={{
                              color: "rgba(255,255,255,0.5)",
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
                      background: "#10b981",
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
                        color: "#fff",
                      }}
                    >
                      Expert-Led Growth
                    </h3>
                    <p
                      style={{
                        fontSize: "0.88rem",
                        lineHeight: 1.65,
                        margin: 0,
                        color: "rgba(255,255,255,0.7)",
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
                    ].map((item, i) => {
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
                              color: "#fff",
                              letterSpacing: "-0.04em",
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "rgba(255,255,255,0.5)",
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

      {/* ===== TESTIMONIALS ===== */}
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
                <div className="section-tag-vgreen">Testimonials</div>
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

              {/* Testimonial carousel — natural height, mobile-safe */}
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
                    {/* Stars */}
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

                    {/* Quote */}
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

                    {/* Author */}
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

                {/* Navigation — dots + prev/next arrows */}
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
                  {/* Prev arrow */}
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

                  {/* Dots */}
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

                  {/* Next arrow */}
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
                color: "var(--text)",
                letterSpacing: "0.05em",
                marginBottom: "1.2rem",
              }}
            >
              Ready to Scale Your Business?
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
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
