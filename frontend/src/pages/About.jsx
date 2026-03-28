import React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Award,
  Users,
  Target,
  Briefcase,
  CheckCircle2,
  Instagram,
  Twitter,
  Facebook,
  Send,
  Globe,
} from "lucide-react";
import { toast } from "react-hot-toast";

const About = () => {
  const founderDetails = {
    name: "Vithartha Consulting",
    tagline: "Precision Compliance. Professional Growth.",
    mission:
      "To simplify compliance, finance, and business advisory for startups and growing enterprises across India, delivering expert-led, technology-driven solutions that accelerate growth.",
    vision:
      "To become India's most trusted partner for startup compliance, financial management, and business consulting.",
  };

  const services = [
    "GST Registration & Filing",
    "Income Tax & TDS Compliance",
    "Company Incorporation & Startup Consulting",
    "Virtual CFO & Accountant Services",
    "Legal & Secretarial Services",
    "Payroll Management (EPF, ESI)",
  ];

  const stats = [
    { label: "Clients Served", value: "500+", icon: Users },
    { label: "Services Offered", value: "25+", icon: Briefcase },
    { label: "Expert Years", value: "10+", icon: Award },
    { label: "Satisfaction", value: "99%", icon: Target },
  ];

  const cardStyle = {
    background: "var(--about-card-bg)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    position: "relative",
    overflow: "hidden",
    padding: "1.5rem",
  };

  const containerStyle = {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "0 2rem",
  };

  return (
    <div
      className="home-page-shell about-pad-top"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        color: "var(--text)",
        paddingTop: "clamp(140px, 16vw, 180px)",
        paddingBottom: "5rem",
        position: "relative",
      }}
    >
      <div className="home-page-backdrop" aria-hidden="true" />

      <style>{`
                @media (max-width: 768px) {
                    .about-grid-mission, .about-grid-services, .about-grid-contact {
                        grid-template-columns: 1fr !important;
                        gap: 1.5rem !important;
                    }
                    .about-grid-stats {
                        grid-template-columns: 1fr 1fr !important;
                    }
                    .about-hero-title {
                        font-size: 2rem !important;
                    }
                    .about-hero-subtitle {
                        font-size: 1.5rem !important;
                        display: block;
                        margin-top: 5px;
                    }
                    .about-hero-text {
                        font-size: 0.95rem !important;
                        padding: 0 10px;
                    }
                    .about-container {
                        padding: 0 1rem !important;
                    }
                    .about-pad-top {
                        padding-top: clamp(100px, 12vw, 120px) !important;
                    }
                    .about-section-margin {
                        margin-bottom: 2.5rem !important;
                    }
                    .about-story-card {
                        padding: 1.5rem !important;
                    }
                    .about-story-card h2 {
                        font-size: 1.5rem !important;
                    }
                    .about-story-card p {
                        font-size: 0.95rem !important;
                    }
                    .about-contact-form {
                        padding: 1.5rem !important;
                    }
                    .about-contact-form h2 {
                        font-size: 1.25rem !important;
                    }
                    .about-form-name-email {
                        grid-template-columns: 1fr !important;
                    }
                    .about-sidebar-card {
                        padding: 1.5rem !important;
                    }
                    .about-social-icons {
                        justify-content: center !important;
                        flex-wrap: wrap !important;
                    }
                }
                @media (max-width: 480px) {
                    .about-grid-stats {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 0.7rem !important;
                    }
                    .about-pad-top {
                        padding-top: 90px !important;
                    }
                    .about-hero-title {
                        font-size: 1.6rem !important;
                    }
                    .about-hero-subtitle {
                        font-size: 1.2rem !important;
                    }
                    .about-story-card {
                        padding: 1.2rem !important;
                    }
                    .about-contact-form {
                        padding: 1.2rem !important;
                    }
                }
            `}</style>

      {/* ── Hero Section ── */}
      <section
        className="about-section-margin"
        style={{ marginBottom: "4rem" }}
      >
        <div className="about-container" style={containerStyle}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center" }}
          >
            <h1
              className="about-hero-title"
              style={{
                fontSize: "2.8rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--text)",
                marginBottom: "1rem",
                lineHeight: 1.2,
              }}
            >
              {founderDetails.name} <br />
              <span
                className="about-hero-subtitle"
                style={{ color: "#10b981", fontSize: "2.2rem" }}
              >
                Precision Compliance. Professional Growth.
              </span>
            </h1>
            <p
              className="about-hero-text"
              style={{
                color: "var(--text-muted)",
                fontSize: "1.05rem",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              {founderDetails.mission.split(",")[0]}. Simplifying the
              complexities of financial growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section
        className="about-section-margin"
        style={{ marginBottom: "4rem" }}
      >
        <div className="about-container" style={containerStyle}>
          <div
            className="about-grid-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {stats.map((stat, idx) => (
              <div key={idx} style={{ ...cardStyle, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 700,
                    color: "#10b981",
                    marginBottom: "0.2rem",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "var(--card-content-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section
        className="about-section-margin"
        style={{ marginBottom: "4rem" }}
      >
        <div className="about-container" style={containerStyle}>
          <div
            className="about-grid-mission"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "3px",
                  background: "#10b981",
                  opacity: 0.6,
                }}
              />
              <h3
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}
              >
                Our Mission
              </h3>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--card-content-text)",
                  lineHeight: 1.7,
                }}
              >
                {founderDetails.mission}
              </p>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "3px",
                  background: "#10b981",
                  opacity: 0.6,
                }}
              />
              <h3
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}
              >
                Our Vision
              </h3>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--card-content-text)",
                  lineHeight: 1.7,
                }}
              >
                {founderDetails.vision}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Offerings ── */}
      <section
        className="about-section-margin"
        style={{ marginBottom: "4rem" }}
      >
        <div className="about-container" style={containerStyle}>
          <div style={{ ...cardStyle, padding: "2rem" }}>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "1.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              Core Expertise
            </h2>
            <div
              className="about-grid-services"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "0.8rem",
              }}
            >
              {services.map((service, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                    padding: "0.8rem",
                    background: "var(--bg-card-alt)",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <CheckCircle2
                    size={16}
                    color="#10b981"
                    style={{ opacity: 0.6 }}
                  />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--card-content-text)",
                    }}
                  >
                    {service}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Detailed About Vithartha ── */}
      <section
        className="about-section-margin"
        style={{ marginBottom: "6rem" }}
      >
        <div className="about-container" style={containerStyle}>
          <div className="about-story-card" style={{ ...cardStyle, padding: "3rem", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "300px",
                height: "300px",
                background: "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: "2rem",
                letterSpacing: "-0.03em",
              }}
            >
              The Vithartha Story <span style={{ color: "#10b981" }}>.</span>
            </h2>
            <div
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.8,
                color: "var(--text-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <p>
                Founded on the principles of <strong>Clarity, Compliance, and Growth</strong>, Vithartha Consulting emerged as a response to the growing complexities faced by Indian startups and MSMEs. We recognized that while entrepreneurship is thriving, the administrative and financial burdens of compliance often stifle innovation.
              </p>
              <p>
                Our team consists of seasoned Chartered Accountants, Legal Experts, and Strategic Advisors who believe that compliance shouldn't be a hurdle, but a foundation for scaling. We've built Vithartha to be more than just a consultancy; we are your extended financial and legal department.
              </p>
              <p>
                By integrating cutting-edge financial technology with deep domain expertise, we provide a seamless dashboard-driven experience where you can track every filing, every document, and every deadline in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact & Connect Section ── */}
      <section id="contact-section" style={{ paddingBottom: "4rem" }}>
        <div className="about-container" style={containerStyle}>
          <div
            className="about-grid-contact"
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: "2.5rem",
              alignItems: "stretch",
            }}
          >
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              style={{ ...cardStyle, padding: "2.5rem" }}
              className="about-contact-form"
            >
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                  Get in Touch
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Have questions? Drop us a message and our team will get back to you within 24 hours.
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Message sent! We'll get back to you soon.");
                  e.target.reset();
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
              >
                <div className="about-form-name-email" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Full Name</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="John Doe"
                      style={{ 
                        background: "rgba(255,255,255,0.03)", 
                        border: "1px solid var(--border)", 
                        borderRadius: "10px", 
                        padding: "0.8rem", 
                        color: "var(--text)",
                        outline: "none"
                      }} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Email ID</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="john@example.com"
                      style={{ 
                        background: "rgba(255,255,255,0.03)", 
                        border: "1px solid var(--border)", 
                        borderRadius: "10px", 
                        padding: "0.8rem", 
                        color: "var(--text)",
                        outline: "none"
                      }} 
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Subject</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Inquiry about GST Registration"
                    style={{ 
                      background: "rgba(255,255,255,0.03)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "10px", 
                      padding: "0.8rem", 
                      color: "var(--text)",
                      outline: "none"
                    }} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Your Message</label>
                  <textarea 
                    required 
                    rows="4" 
                    placeholder="Tell us how we can help you..."
                    style={{ 
                      background: "rgba(255,255,255,0.03)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "10px", 
                      padding: "0.8rem", 
                      color: "var(--text)",
                      outline: "none",
                      resize: "none"
                    }} 
                  />
                </div>
                <button 
                  type="submit" 
                  style={{ 
                    background: "#10b981", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "12px", 
                    padding: "1rem", 
                    fontWeight: 700, 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                    marginTop: "0.5rem",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >
                  Send Message <Send size={18} />
                </button>
              </form>
            </motion.div>

            {/* Contact Details & Socials */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="about-sidebar-card"
                style={{ ...cardStyle, padding: "2rem" }}
              >
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem" }}>Connect with Us</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  {[
                    { icon: Mail, label: "Email", value: "info@vithartha.com", link: "mailto:info@vithartha.com" },
                    { icon: Phone, label: "Phone", value: "+91 98765 43210", link: "tel:+919876543210" },
                    { icon: MapPin, label: "Office", value: "Bangalore, India", link: "#" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyCenter: "center", border: "1px solid rgba(16,185,129,0.2)" }}>
                         <item.icon size={16} color="#10b981" style={{ margin: "auto" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>{item.label}</div>
                        <a href={item.link} style={{ fontSize: "0.9rem", color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>{item.value}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="about-sidebar-card"
                style={{ ...cardStyle, padding: "2rem" }}
              >
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem" }}>Follow Our Insights</h3>
                <div className="about-social-icons" style={{ display: "flex", gap: "0.8rem" }}>
                  {[
                    { icon: Linkedin, color: "#0077b5", link: "https://linkedin.com/company/vithartha" },
                    { icon: Twitter, color: "#1da1f2", link: "https://twitter.com/vithartha" },
                    { icon: Instagram, color: "#e4405f", link: "https://instagram.com/vithartha" },
                    { icon: Facebook, color: "#1877f2", link: "https://facebook.com/vithartha" },
                  ].map((social, i) => (
                    <a 
                      key={i} 
                      href={social.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        width: "42px", 
                        height: "42px", 
                        borderRadius: "12px", 
                        background: social.color + "15", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        border: "1px solid " + social.color + "30",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = social.color;
                        e.currentTarget.firstChild.style.stroke = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = social.color + "15";
                        e.currentTarget.firstChild.style.stroke = social.color;
                      }}
                    >
                      <social.icon size={20} color={social.color} />
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
