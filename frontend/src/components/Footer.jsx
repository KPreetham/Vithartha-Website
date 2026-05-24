import React from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  ArrowRight,
  Shield,
} from "lucide-react";

const Footer = () => {
  const solutions = [
    { name: "GST Compliance", path: "/recommendations" },
    { name: "Virtual CFO", path: "/recommendations" },
    { name: "Income Tax", path: "/recommendations" },
    { name: "Registration", path: "/recommendations" },
    { name: "Payroll Services", path: "/recommendations" },
    { name: "Legal Advisory", path: "/recommendations" },
  ];

  const company = [
    { name: "About Us", path: "/about" },
    // { name: 'Our Team', path: '/' },
    // { name: 'Careers', path: '/' },
    // { name: 'Blog', path: '/' },
  ];

  return (
    <footer
      style={{
        background: "var(--secondary)",
        color: "var(--text)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top gradient border — logo colors */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(139,26,45,0.6), rgba(239,160,32,0.5), rgba(74,173,160,0.6), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,26,45,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,173,160,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="container"
        style={{ padding: "5rem 2rem 3rem", position: "relative", zIndex: 1 }}
      >
        {/* Top section */}
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: "4rem",
            paddingBottom: "4rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            {/* Logo image + wordmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.4rem",
              }}
            >
              <div style={{
                height: "64px",
                width: "64px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img
                  src="/logo2.png"
                  alt="Fin2Line Logo"
                  style={{
                    height: "100%",
                    width: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "0.02em",
                }}
              >
                FIN2LINE
              </span>
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                lineHeight: 1.8,
                fontSize: "0.9rem",
                marginBottom: "2rem",
                maxWidth: "280px",
              }}
            >
              Empowering entrepreneurs with comprehensive business solutions and
              digital financial leadership. Redefining consulting for the modern
              startup era.
            </p>

            {/* Newsletter */}
            <div
              className="footer-newsletter"
              style={{
                display: "flex",
                gap: "0",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                maxWidth: "300px",
              }}
            >
              <input
                type="email"
                placeholder="Your email address"
                id="footer-newsletter-input"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "0.75rem 1.2rem",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-body)",
                }}
              />
              <button
                id="footer-newsletter-btn"
                style={{
                  background: "var(--grad-primary)",
                  border: "none",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Socials */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              {[
                { icon: Linkedin, label: "LinkedIn", id: "footer-linkedin" },
                { icon: Twitter, label: "Twitter", id: "footer-twitter" },
                { icon: Github, label: "GitHub", id: "footer-github" },
              ].map(({ icon: Icon, label, id }) => (
                <button
                  key={label}
                  id={id}
                  aria-label={label}
                  style={{
                    width: "38px",
                    height: "38px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,26,45,0.25)";
                    e.currentTarget.style.borderColor = "rgba(139,26,45,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                  }}
                >
                  <Icon size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#4AADA0",
                marginBottom: "1.4rem",
              }}
            >
              Solutions
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {solutions.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#4AADA0",
                marginBottom: "1.4rem",
              }}
            >
              Company
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {company.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#4AADA0",
                marginBottom: "1.4rem",
              }}
            >
              Contact
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              {[
                { icon: Mail, text: "vitrharthaconsulting@gmail.com" },
                { icon: Phone, text: "+91 7795114365" },
                { icon: MapPin, text: "Mangaluru, India" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    gap: "0.8rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      marginTop: "2px",
                      background: "rgba(74,173,160,0.12)",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color="#4AADA0" />
                  </div>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="footer-bottom"
          style={{
            paddingTop: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            <Shield size={14} />
            <span>
              © 2026 Fin2Line Consulting Pvt. Ltd. All rights reserved.
            </span>
          </div>
          <div
            className="footer-bottom-links"
            style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}
          >
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (item) => (
                <Link
                  key={item}
                  to="/"
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  {item}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
