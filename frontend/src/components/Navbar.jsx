import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Home,
  Layers,
  Info,
  Settings,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { getDashboardPathByRole, normalizeRole } from "../utils/roleRouting";

void motion;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync user from localStorage whenever route changes or storage event fires
  useEffect(() => {
    const checkUser = () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, [location.pathname]);

  // Handle Dynamic Role Updates from Atlas
  useEffect(() => {
    const syncProfile = async () => {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return;

      try {
        const userData = JSON.parse(savedUser);
        const apiUrl = import.meta.env.VITE_API_URL;

        const response = await axios.get(`${apiUrl}/auth/profile`, {
          headers: { Authorization: `Bearer ${userData.token}` }
        });

        if (response.data && response.data.role !== userData.role) {
          console.log("Role update detected:", response.data.role);
          const updatedUser = { ...userData, ...response.data };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
          window.dispatchEvent(new Event("storage"));
          // toast.success(`Role updated to ${response.data.role}`); // Removed to prevent multiple toasts during session
        }
      } catch (error) {
        console.warn("Profile sync skipped:", error.message);
      }
    };

    if (user) {
      syncProfile();
    }
  }, [user]); // Sync when user identity is established

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("fin2line_guest_walkthrough_seen_v5"); // Reset guest walkthrough
    setUser(null);
    setDropdownOpen(false);
    toast.success("Logged Out Successfully");
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Locking scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(new Event("themechange"));
  }, [isDarkMode]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setMobileOpen(false);
      setDropdownOpen(false);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [location.pathname]);

  const getDashboardPath = () => {
    return getDashboardPathByRole(user?.role);
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/recommendations" },
    {
      name: "Dashboard",
      path: getDashboardPath(),
    },
    { name: "About", path: "/about" },
  ];

  const navStyle = {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    zIndex: 1000,
    padding: isMobile ? "0.65rem 1rem" : (scrolled ? "0.65rem 4%" : "0.9rem 4%"),
    background: "transparent",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    transition: "all 0.4s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "none",
    boxShadow: "none",
  };

  const linkColor = isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)";
  const hoverColor = isDarkMode ? "white" : "black";
  const logoTextColor = isDarkMode ? "white" : "black";
  const activeLinkColor = isDarkMode ? "white" : "black";

  return (
    <>
      <nav style={navStyle} id="main-navbar">

        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div style={{
              height: scrolled ? "36px" : "44px",
              width: scrolled ? "36px" : "44px",
              borderRadius: "50%",
              overflow: "hidden",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0,0,0,0.1)",
              boxShadow: isDarkMode ? "0 4px 15px rgba(0, 0, 0, 0.3)" : "0 0 15px rgba(0,0,0,0.1)",
          }}>
            <img
              src="/logo2.png"
              alt="Fin2Line Logo"
              style={{
                height: "100%",
                width: "100%",
                objectFit: "cover",
                transform: "scale(1.1)",
                display: "block",
              }}
            />
          </div>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: scrolled ? "0.9rem" : "0.98rem",
            fontWeight: 700,
            color: logoTextColor,
            letterSpacing: "0.04em",
            transition: "all 0.4s ease"
          }}>
            FIN2LINE
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="desktop-nav" style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                id={`nav-link-${link.name.replace(/\s+/g, "-")}`}
                to={link.path}
                style={{
                  textDecoration: "none",
                  color: isActive ? activeLinkColor : linkColor,
                  fontSize: "1.02rem",
                  fontWeight: 500,
                  padding: "0.5rem 0.8rem",
                  borderRadius: "var(--radius-full)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: "transparent",
                  border: "none",
                  position: "relative",
                  boxShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = hoverColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isActive
                    ? activeLinkColor
                    : linkColor;
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: "transparent",
              border: isDarkMode
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
              color: logoTextColor,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
            (e.currentTarget.style.background = isDarkMode
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth Area */}
          {user ? (
            /* === User Avatar + Dropdown === */
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                id="navbar-user-avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  outline: "none",
                }}
                aria-label="User menu"
                title={user.name}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: isDarkMode ? "#3f4044" : "#e5e7eb",
                    border: isDarkMode
                      ? "2px solid #2e2e32"
                      : "2px solid #d1d5db",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  <User
                    size={18}
                    style={{ color: isDarkMode ? "#e0e0e0" : "#374151" }}
                  />
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    color: isDarkMode ? "#a0a0a0" : "#4b5563",
                    transition: "transform 0.3s ease",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div
                  id="navbar-user-dropdown"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: 0,
                    minWidth: "220px",
                    background: isDarkMode
                      ? "rgba(13, 13, 27, 0.98)"
                      : "rgba(255, 255, 255, 0.97)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: isDarkMode
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "18px",
                    boxShadow: isDarkMode
                      ? "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
                      : "0 24px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    animation:
                      "dropdownFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                    zIndex: 1100,
                  }}
                >
                  {/* User Info Header */}
                  <div
                    style={{
                        padding: "0.85rem 1rem",
                      borderBottom: isDarkMode
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "1px solid rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: isDarkMode ? "#3f4044" : "#e5e7eb",
                        border: isDarkMode
                          ? "1px solid #2e2e32"
                          : "1px solid #d1d5db",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User
                        size={18}
                        style={{ color: isDarkMode ? "#e0e0e0" : "#374151" }}
                      />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                        fontSize: "0.82rem",
                          color: isDarkMode ? "white" : "#111",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.68rem",
                          color: isDarkMode
                            ? "rgba(255,255,255,0.45)"
                            : "rgba(0,0,0,0.45)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.email}
                      </p>
                      <span
                        style={{
                          marginTop: "4px",
                          display: "inline-block",
                          padding: "2px 8px",
                          background:
                            user.role === "admin"
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(16,185,129,0.1)",
                          color: user.role === "admin" ? "#ef4444" : "#10b981",
                          borderRadius: "100px",
                          fontSize: "0.62rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {normalizeRole(user.role) === "pr" ? "PR" : user.role}
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "0.5rem" }}>
                    <button
                      id="navbar-goto-profile-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/profile");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        width: "100%",
                        padding: "0.65rem 0.8rem",
                        border: "none",
                        borderRadius: "10px",
                        background: "transparent",
                        color: isDarkMode
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(0,0,0,0.7)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.05)";
                        e.currentTarget.style.color = isDarkMode
                          ? "white"
                          : "#111";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = isDarkMode
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(0,0,0,0.7)";
                      }}
                    >
                      <User size={15} />
                      My Profile
                    </button>

                    <button
                      id="navbar-goto-dashboard-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(getDashboardPath());
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        width: "100%",
                        padding: "0.65rem 0.8rem",
                        border: "none",
                        borderRadius: "10px",
                        background: "transparent",
                        color: isDarkMode
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(0,0,0,0.7)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.05)";
                        e.currentTarget.style.color = isDarkMode
                          ? "white"
                          : "#111";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = isDarkMode
                          ? "rgba(255,255,255,0.75)"
                          : "rgba(0,0,0,0.7)";
                      }}
                    >
                      <Shield size={15} />
                      {user.role === "admin" ? "Admin Panel" : "My Dashboard"}
                    </button>

                    <div
                      style={{
                        height: "1px",
                        background: isDarkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.06)",
                        margin: "0.3rem 0",
                      }}
                    />

                    <button
                      id="navbar-signout-btn"
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        width: "100%",
                        padding: "0.65rem 0.8rem",
                        border: "none",
                        borderRadius: "10px",
                        background: "transparent",
                        color: "#ef4444",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* === Sign In Button (not logged in) === */
            <button
              id="navbar-signup-btn"
              className="btn navbar-signin-btn"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 52%, #4c1d95 100%)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                fontSize: "0.88rem",
                padding: "0.62rem 1.4rem",
                borderRadius: "12px",
                fontWeight: 600,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 10px 24px rgba(76, 29, 149, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 52%, #5b21b6 100%)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 52%, #4c1d95 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.14)";
              }}
              onClick={() => navigate("/login")}
            >
              Sign In <ArrowRight size={17} />
            </button>
          )}

          {/* Mobile toggle */}
          <button
            id="navbar-mobile-toggle"
            className="mobile-nav-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: logoTextColor,
              padding: "0.4rem",
            }}
            aria-label="Toggle menu"
          >
            <motion.div
              animate={{ rotate: mobileOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </motion.div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, scale: 0.95, y: -20, x: isMobile ? 0 : "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: isMobile ? 0 : "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: isMobile ? 0 : "-50%" }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: "fixed",
              top: isMobile ? (scrolled ? "60px" : "74px") : "80px",
              left: isMobile ? 0 : "50%",
              width: isMobile ? "100%" : "90%",
              zIndex: 999,
              background: isDarkMode
                ? "rgba(10, 10, 20, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(30px) saturate(150%)",
              WebkitBackdropFilter: "blur(30px) saturate(150%)",
              borderRadius: isMobile ? "0 0 24px 24px" : "24px",
              border: isDarkMode
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.1)",
              padding: "1.2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              maxHeight: isMobile ? "calc(100vh - 72px)" : "none",
              overflowY: isMobile ? "auto" : "visible",
            }}
          >
            {/* Mobile user info (if logged in) */}
            {user && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  padding: "0.6rem",
                  marginBottom: "0.8rem",
                  background: isDarkMode
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.01)",
                  borderRadius: "22px",
                  border: isDarkMode
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                    padding: "0.6rem 0.8rem",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: isDarkMode ? "#3f4044" : "#f3f4f6",
                      border: isDarkMode
                        ? "1px solid #2e2e32"
                        : "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <User
                      size={22}
                      style={{ color: isDarkMode ? "#e0e0e0" : "#374151" }}
                    />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: logoTextColor,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.name}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "2px",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          background:
                            user.role === "admin"
                              ? "rgba(239,68,68,0.12)"
                              : "rgba(16,185,129,0.12)",
                          color: user.role === "admin" ? "#ef4444" : "#10b981",
                          borderRadius: "100px",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {user.role}
                      </span>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.72rem",
                          color: isDarkMode
                            ? "rgba(255,255,255,0.4)"
                            : "rgba(0,0,0,0.4)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                        >
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    id="navbar-mobile-profile-btn"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate("/profile");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      width: "100%",
                      padding: "0.9rem 1rem",
                      border: "none",
                      borderRadius: "16px",
                      background: isDarkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                      color: logoTextColor,
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.18s ease",
                      fontFamily: "var(--font-body)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDarkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)";
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                      <User size={16} />
                      My Profile
                    </span>
                    <ChevronRight size={16} style={{ opacity: 0.45 }} />
                  </button>
                </div>
              </div>
            )}

            {navLinks.map((link) => {
                const Icon =
                  link.name === "Home"
                    ? Home
                    : link.name === "Services"
                      ? Layers
                      : link.name === "About"
                        ? Info
                        : Menu;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      padding: "0.9rem 1.2rem",
                      color: logoTextColor,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      borderRadius: "16px",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "between",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkMode
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.03)";
                      e.currentTarget.style.paddingLeft = "1.5rem";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.paddingLeft = "1.2rem";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.8rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: isDarkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} style={{ opacity: 0.8 }} />
                      </div>
                      {link.name}
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                  </Link>
                );
              })}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "0.8rem",
                paddingTop: "1rem",
                borderTop: isDarkMode
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid rgba(0,0,0,0.1)",
              }}
            >
              {user ? (
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: isDarkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 700,
                    gap: "0.4rem",
                    padding: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.2s",
                  }}
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              ) : (
                <button
                  id="navbar-mobile-signup-btn"
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 52%, #4c1d95 100%)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: "var(--radius-full)",
                    padding: "0.8rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @media (max-width: 768px) {
                    #navbar-mobile-toggle { display: flex !important; }
                    #navbar-signup-btn, #navbar-user-avatar-btn { display: none !important; }
                    nav > div:nth-child(2) { display: none !important; }
                }
                /* Mobile menu full width on phones */
                @media (max-width: 768px) {
                    #mobile-menu {
                        width: 100% !important;
                        left: 0 !important;
                    }
                    #main-navbar {
                        width: 100% !important;
                        padding: 0.65rem 1rem !important;
                        left: 0 !important;
                    }
                }
            `}</style>
    </>
  );
};

export default Navbar;
