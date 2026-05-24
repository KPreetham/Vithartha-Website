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
  ArrowRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

const About = () => {
  const founderDetails = {
    name: "Fin2Line Consulting",
    tagline: "Your direct path to compliance",
    mission:
      "To simplify compliance, finance and business advisory for startups and growing enterprises across India, delivering expert-led, technology-driven solutions that accelerate growth.",
    vision:
      "To become India's most trusted partner for startup compliance, financial management and business consulting.",
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

  const containerStyle = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 2rem",
  };

  const sectionHeadingStyle = {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#10b981",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    marginBottom: "1rem",
    display: "block"
  };

  return (
    <div
      className="about-page-wrapper"
      style={{
        background: "#ffffff",
        minHeight: "100vh",
        color: "#1a1a1a",
        paddingTop: "clamp(150px, 18vw, 200px)",
        paddingBottom: "8rem",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        .about-page-wrapper {
          --accent: #10b981;
          --text-main: #000000;
          --text-sub: #4b5563;
          --border-light: #f3f4f6;
        }

        .about-container {
          width: 100%;
        }
        
        .hero-heading {
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.3;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .hero-description {
          font-size: 1.1rem;
          font-weight: 400;
          color: var(--text-sub);
          line-height: 1.6;
          max-width: 850px;
          margin: 0 auto 5rem auto;
          text-align: center;
          padding: 0;
        }

        .content-section {
          margin-bottom: 6rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .text-block {
          font-size: 1.1rem;
          line-height: 1.8;
          color: var(--text-sub);
        }

        .text-block p {
          margin-bottom: 1.5rem;
        }

        .stat-item {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-item h3 {
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 0.5rem;
        }

        .stat-item p {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-sub);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .services-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .service-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 500;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          margin-top: 3rem;
        }

        .contact-info-item {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .contact-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          flex-shrink: 0;
        }

        .contact-form-minimal input, 
        .contact-form-minimal textarea {
          width: 100%;
          padding: 1rem 0;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: transparent;
          font-size: 1rem;
          margin-bottom: 2rem;
          outline: none;
          transition: border-color 0.3s;
        }

        .contact-form-minimal input:focus, 
        .contact-form-minimal textarea:focus {
          border-bottom-color: var(--accent);
        }

        .submit-btn-minimal {
          background: var(--text-main);
          color: white;
          padding: 1.2rem 2.5rem;
          border: none;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          transition: transform 0.3s;
        }

        .submit-btn-minimal:hover {
          transform: translateX(5px);
        }

        @media (max-width: 768px) {
          .about-page-wrapper {
            padding-top: 7rem !important;
            padding-bottom: 5rem !important;
          }

          .about-container {
            padding: 0 1.25rem !important;
          }

          .hero-heading {
            font-size: clamp(1.7rem, 6vw, 2.2rem);
          }

          .hero-description {
            font-size: 1rem;
            margin-bottom: 3rem;
          }

          .about-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .about-mv-grid {
            grid-template-columns: 1fr;
          }

          .about-offer-grid {
            grid-template-columns: 1fr;
          }

          .about-contact-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .about-contact-card {
            padding: 2rem !important;
            border-radius: 20px !important;
          }

          .contact-info-item {
            gap: 1rem;
            margin-bottom: 1.5rem;
            align-items: flex-start;
          }

          .contact-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
          }

          .about-socials {
            gap: 0.75rem !important;
            flex-wrap: wrap;
          }

          .about-socials a {
            width: 40px !important;
            height: 40px !important;
          }
        }

        @media (max-width: 480px) {
          .about-page-wrapper {
            padding-top: 8.5rem !important;
            padding-bottom: 4rem !important;
          }

          .about-container {
            padding: 0 1rem !important;
          }

          .content-section {
            margin-bottom: 3.5rem;
          }

          .hero-heading {
            font-size: clamp(1.55rem, 8vw, 2rem);
            margin-bottom: 1rem;
            text-align: center;
          }

          .hero-description {
            font-size: 0.95rem;
            margin-bottom: 2.5rem;
            text-align: left;
          }

          .about-stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .stat-item h3 {
            font-size: 1.7rem;
          }

          .stat-item p {
            font-size: 0.7rem;
          }

          .about-mv-card,
          .about-expertise-card,
          .about-contact-card {
            padding: 1.4rem !important;
            border-radius: 18px !important;
          }

          .about-mv-grid,
          .about-offer-grid,
          .about-contact-grid {
            grid-template-columns: 1fr !important;
          }

          .service-item {
            gap: 0.8rem;
            align-items: flex-start;
          }

          .service-item span {
            font-size: 0.92rem;
            line-height: 1.45;
          }

          .contact-info-item {
            gap: 0.85rem;
            margin-bottom: 1.2rem;
          }

          .contact-info-item a,
          .contact-info-item p {
            word-break: break-word;
            font-size: 0.95rem !important;
          }

          .about-socials a {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }
        }
      `}</style>

      <div className="about-container" style={containerStyle}>
        {/* ── Hero Section ── */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="content-section"
        >
          <h1 className="hero-heading">
            About {founderDetails.name}
          </h1>
          <p className="hero-description">
            We are a premier financial consulting firm dedicated to simplifying compliance 
            and accelerating growth for modern Indian enterprises through technology driven 
            advisory and expert led financial solutions.
          </p>
        </motion.section>
      </div>

      {/* ── Stats Row (Full Width) ── */}
      <section 
        style={{ 
          background: "#f1f5f9", 
          padding: "3rem 0", 
          marginBottom: "6rem",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div 
          className="about-stats-grid"
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(4, 1fr)", 
            maxWidth: "1200px", 
            margin: "0 auto", 
            padding: "0 2rem" 
          }}
        >
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-item" style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.5rem" }}>{stat.value}</h3>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="about-container" style={containerStyle}>
        {/* ── Mission & Vision ── */}
        <section className="content-section" style={{ borderTop: "1px solid #f3f4f6", paddingTop: "5rem" }}>
          <div className="about-mv-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem" }}>
            <motion.div 
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="about-mv-card"
              style={{ 
                background: "#f9fafb", 
                padding: "3rem", 
                borderRadius: "24px", 
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
              }}
            >
              <span style={sectionHeadingStyle}>Our Mission</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6, color: "var(--text-main)" }}>
                {founderDetails.mission}
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -8, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{ 
                background: "#f9fafb", 
                padding: "3rem", 
                borderRadius: "24px", 
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
              }}
            >
              <span style={sectionHeadingStyle}>Our Vision</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6, color: "var(--text-main)" }}>
                {founderDetails.vision}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Core Expertise ── */}
        <section className="content-section">
          <div style={{ width: "100%" }}>
            <span style={{ ...sectionHeadingStyle, textAlign: "center", marginBottom: "3rem" }}>Expertise</span>
            <div 
              className="about-offer-grid"
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
                gap: "1.2rem" 
              }}
            >
              {services.map((service, idx) => (
                <motion.div 
                  key={idx} 
                  whileHover={{ y: -5, scale: 1.02, backgroundColor: "#ffffff" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "1.2rem", 
                    padding: "1.5rem", 
                    background: "#f9fafb", 
                    borderRadius: "16px", 
                    border: "1px solid #e5e7eb",
                    cursor: "default"
                  }}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={20} color="#10b981" />
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>{service}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact Section ── */}
        <section id="contact-section" className="content-section" style={{ borderTop: "1px solid #f3f4f6", paddingTop: "6rem" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
             <span style={sectionHeadingStyle}>Get in Touch</span>
             <h2 style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-main)", marginTop: "1rem" }}>Let's build something great together.</h2>
          </div>
          
          <div style={{ display: "flex", justifyContent: "center" }}>
            {/* Centered Card: Info & Socials */}
            <motion.div 
              whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="about-contact-card"
              style={{ 
                background: "#f9fafb", 
                padding: "3.5rem", 
                borderRadius: "24px", 
                border: "1px solid #e5e7eb",
                color: "var(--text-main)",
                maxWidth: "800px",
                width: "100%"
              }}
            >
              <div style={{ marginBottom: "3rem" }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem", color: "var(--text-main)" }}>Contact Information</h3>
                <div className="contact-info-item">
                  <div className="contact-icon"><Mail size={20} /></div>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-main)", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Us</p>
                    <a href="mailto:vitrharthaconsulting@gmail.com" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", textDecoration: "none" }}>vitrharthaconsulting@gmail.com</a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-icon"><Phone size={20} /></div>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-main)", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Call Us</p>
                    <a href="tel:+917795114365" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", textDecoration: "none" }}>+91 7795114365</a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-icon"><MapPin size={20} /></div>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-main)", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Office</p>
                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)" }}>Mangaluru, Karnataka, India</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-main)" }}>Connect with Us</h3>
                <div className="about-socials" style={{ display: "flex", gap: "1rem" }}>
                  {[
                    { icon: Linkedin, color: "#0077b5" },
                    { icon: Twitter, color: "#1da1f2" },
                    { icon: Instagram, color: "#e4405f" },
                  ].map((social, i) => (
                    <motion.a 
                      key={i}
                      href="#"
                      whileHover={{ scale: 1.1, backgroundColor: social.color, color: "#fff" }}
                      style={{ 
                        width: "45px", 
                        height: "45px", 
                        borderRadius: "12px", 
                        background: "#fff", 
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: social.color,
                        transition: "all 0.3s ease"
                      }}
                    >
                      <social.icon size={20} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
