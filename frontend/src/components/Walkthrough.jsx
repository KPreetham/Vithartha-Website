import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  X,
  Play,
  Target,
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  ArrowUpLeft,
  MousePointer2,
  UserPlus,
  Rocket,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  hasSeenPostLoginWalkthrough,
  markPostLoginWalkthroughSeen,
  hasCompletedOnboarding,
} from "../utils/onboardingFlow";

const POST_LOGIN_STEPS = [
  {
    id: "guide-services",
    title: "Our Services",
    description:
      "Explore our full range of professional business solutions. From registrations to compliance, find everything you need to grow.",
    target: "#nav-link-Services",
    icon: Sparkles,
  },
  {
    id: "guide-dashboard",
    title: "Your Dashboard",
    description:
      "Access your personalized control center anytime. Track your business growth, manage documents, and view service history here.",
    target:
      "#nav-link-Dashboard, #navbar-goto-dashboard-btn, #mobile-dashboard-link",
    icon: LayoutDashboard,
  },
  {
    id: "guide-about",
    title: "About Fin2Line",
    description:
      "Discover the vision behind Fin2Line and how we are revolutionizing business management for entrepreneurs.",
    target: "#nav-link-About",
    icon: Globe,
  },
];

const GUEST_WALKTHROUGH_SEEN_KEY = "fin2line_guest_walkthrough_seen_v5";
const MOBILE_BREAKPOINT = 768;

const Walkthrough = ({ isAppLoading }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [navbarBtnRect, setNavbarBtnRect] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [mode, setMode] = useState("guest");
  const postLoginTimersRef = useRef([]);

  const navigate = useNavigate();
  const location = useLocation();

  const getStoredUser = useCallback(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr);
      return u && u.email ? u : null; // Ensure it's a valid user object
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  }, []);

  const getGuestSeenKey = useCallback(() => {
    return GUEST_WALKTHROUGH_SEEN_KEY;
  }, []);

  const burstFlowers = useCallback((intense = false) => {
    confetti({
      particleCount: intense ? 120 : 70,
      spread: intense ? 90 : 60,
      origin: { x: 0.1, y: 0.85 },
      zIndex: 100005,
      colors: ["#ff3b30", "#ff8a65", "#ffd166", "#22c55e"],
    });
    confetti({
      particleCount: intense ? 120 : 70,
      spread: intense ? 90 : 60,
      origin: { x: 0.9, y: 0.85 },
      zIndex: 100005,
      colors: ["#ff3b30", "#ff8a65", "#ffd166", "#22c55e"],
    });
  }, []);

  const clearPostLoginTimers = useCallback(() => {
    postLoginTimersRef.current.forEach((id) => clearTimeout(id));
    postLoginTimersRef.current = [];
  }, []);

  const getVisibleTargetElement = useCallback((selectorList) => {
    if (!selectorList) return null;
    const selectors = selectorList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return el;
      }
    }
    return null;
  }, []);

  // Helper to get viewport-relative rect
  const updateTargetRect = useCallback(
    (targetSelector) => {
      if (!targetSelector) return;
      const el = getVisibleTargetElement(targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect((prev) => {
          if (!prev) return rect;
          const moved =
            Math.abs(prev.top - rect.top) > 1 ||
            Math.abs(prev.left - rect.left) > 1 ||
            Math.abs(prev.width - rect.width) > 1 ||
            Math.abs(prev.height - rect.height) > 1;
          return moved ? rect : prev;
        });
        return true;
      }
      return false;
    },
    [getVisibleTargetElement],
  );

  const getGuestSignUpButton = useCallback(() => {
    const btn = document.querySelector("#navbar-login-btn");
    if (!btn) return null;

    const rect = btn.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    return isVisible ? btn : null;
  }, []);

  const getGuestMobileEntryButton = useCallback(() => {
    const btn = document.querySelector("#navbar-mobile-toggle");
    if (!btn) return null;

    const rect = btn.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    return isVisible ? btn : null;
  }, []);

  const getGuestWalkthroughTarget = useCallback(() => {
    const mobileBtn = getGuestMobileEntryButton();
    if (mobileBtn) return mobileBtn;

    const desktopBtn = getGuestSignUpButton();
    if (desktopBtn) return desktopBtn;

    return null;
  }, [getGuestMobileEntryButton, getGuestSignUpButton]);

  const checkVisibility = useCallback(() => {
    if (isAppLoading) return;

    const user = getStoredUser();
    const isAuthPage =
      location.pathname.includes("/login") ||
      location.pathname.includes("/register") ||
      location.pathname === "/onboarding";
    const isLandingPage = !isAuthPage; // Show on all guest-accessible pages

    if (isAuthPage) {
      setIsVisible(false);
      return;
    }

    if (mode === "guest" && isVisible) {
      const hasSeenGuest = sessionStorage.getItem(getGuestSeenKey()) === "true";
      if (hasSeenGuest || !isLandingPage || !!user) {
        setIsVisible(false);
        return;
      }
      const btn = getGuestWalkthroughTarget();
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setNavbarBtnRect((prev) => {
          if (!prev) return rect;
          const moved =
            Math.abs(prev.top - rect.top) > 1 ||
            Math.abs(prev.left - rect.left) > 1;
          return moved ? rect : prev;
        });
      }
      return;
    }

    // Keep post-login tour stable during background checks.
    // Guest tour should still re-check so it dismisses reliably when marked as seen.
    if (isVisible && (mode === "post-login" || mode === "user")) {
      return;
    }

    if (!user) {
      const hasSeenGuest = sessionStorage.getItem(getGuestSeenKey()) === "true";
      if (hasSeenGuest || !isLandingPage) {
        setIsVisible(false);
        return;
      }

      setMode("guest");
      const btn = getGuestWalkthroughTarget();
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setNavbarBtnRect(rect);
      } else {
        setNavbarBtnRect(null);
      }
      setIsVisible(true);
    } else {
      const hasSeenPostLogin = hasSeenPostLoginWalkthrough(user);
      const onboardingDone = hasCompletedOnboarding(user);

      // Show post-login guide on Services/Recommendations pages
      if (
        !hasSeenPostLogin &&
        onboardingDone &&
        (location.pathname === "/services" ||
          location.pathname === "/recommendations")
      ) {
        setMode("post-login");
        setIsVisible(true);
        setCurrentStep(0);
        const step = POST_LOGIN_STEPS[currentStep];
        if (step) updateTargetRect(step.target);
      } else {
        setIsVisible(false);
      }
    }
  }, [
    location.pathname,
    currentStep,
    updateTargetRect,
    isVisible,
    mode,
    getGuestWalkthroughTarget,
    getStoredUser,
    getGuestSeenKey,
    isAppLoading,
  ]);

  useEffect(() => {
    // Initial check with delay for page load
    const timer = setTimeout(checkVisibility, 150);

    // Listeners for dynamic updates
    window.addEventListener("storage", checkVisibility);
    window.addEventListener("resize", checkVisibility);
    window.addEventListener("scroll", checkVisibility);

    // Polling for elements that might appear later
    const interval = setInterval(checkVisibility, 2000);

    // Global click listener to refresh promptly after any user interaction
    const handleGlobalClick = () => setTimeout(checkVisibility, 300);
    window.addEventListener("click", handleGlobalClick);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("storage", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
      window.removeEventListener("scroll", checkVisibility);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [checkVisibility]);

  useEffect(() => {
    if (isAppLoading) return;
    checkVisibility();
    const settleTimer = setTimeout(checkVisibility, 300);
    return () => clearTimeout(settleTimer);
  }, [isAppLoading, location.pathname, checkVisibility]);

  useEffect(() => {
    if (!isVisible || mode !== "guest") return;

    const btn = getGuestSignUpButton();
    if (!btn) return;

    const handleGuestSignUpClick = (e) => {
      sessionStorage.setItem(getGuestSeenKey(), "true");
      setIsVisible(false);
    };

    btn.addEventListener("click", handleGuestSignUpClick);
    return () => btn.removeEventListener("click", handleGuestSignUpClick);
  }, [isVisible, mode, getGuestSignUpButton, getGuestSeenKey]);

  useEffect(() => () => clearPostLoginTimers(), [clearPostLoginTimers]);

  // Recalculate rect whenever mode or step changes
  useEffect(() => {
    const step = POST_LOGIN_STEPS[currentStep];
    if (isVisible && step && mode === "post-login") {
      // Re-try finding the element several times as the page might still be rendering
      let attempts = 0;
      const tryUpdate = () => {
        const found = updateTargetRect(step.target);
        if (!found && attempts < 10) {
          attempts++;
          setTimeout(tryUpdate, 200);
        }
      };
      tryUpdate();
    }
  }, [mode, currentStep, isVisible, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < POST_LOGIN_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    clearPostLoginTimers();
    setIsVisible(false);
    if (mode === "post-login" || mode === "user") {
      const user = getStoredUser();
      if (user) markPostLoginWalkthroughSeen(user);
      burstFlowers(true);
    } else if (mode === "guest") {
      sessionStorage.setItem(getGuestSeenKey(), "true");
    }
    setCurrentStep(0);
  };

  useEffect(() => {
    if (!isVisible || mode !== "guest") return;
    if (navbarBtnRect) return;

    let frameId = null;
    const resolveGuestTarget = () => {
      const btn = getGuestWalkthroughTarget();
      if (btn) {
        setNavbarBtnRect(btn.getBoundingClientRect());
        return;
      }
      frameId = window.requestAnimationFrame(resolveGuestTarget);
    };

    frameId = window.requestAnimationFrame(resolveGuestTarget);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [isVisible, mode, navbarBtnRect, getGuestWalkthroughTarget]);

  if (!isVisible || isAppLoading) return null;

  // Common Tooltip Wrapper
  const TooltipWrapper = ({
    children,
    targetRect: tr,
    color = "#ff3b30",
    isGuest = false,
  }) => {
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    const edgeGap = vW <= 480 ? 12 : 20;
    const maxBubbleWidth = vW >= 1280 ? 420 : 360;
    const bW = Math.min(maxBubbleWidth, vW - edgeGap * 2);

    if (!tr) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.4)",
            padding: `${edgeGap}px`,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="walkthrough-center"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                width: bW,
                zIndex: 100002,
                pointerEvents: "auto",
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    // Decide whether to show above or below
    const spaceBelow = vH - tr.bottom;
    const spaceAbove = tr.top;
    const shouldShowAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
    const estimatedTooltipHeight = vW <= 430 ? 250 : 300;

    // Calculate horizontal position
    const targetCenter = tr.left + tr.width / 2;
    const boxLeft = Math.min(
      vW - bW - edgeGap,
      Math.max(edgeGap, targetCenter - bW / 2),
    );

    // Calculate arrow center relative to the box
    // Clamp arrowX between 20px and (boxWidth - 20px) so it doesn't pop out of the bubble
    const arrowX = Math.min(bW - 20, Math.max(20, targetCenter - boxLeft));
    const preferredTop = shouldShowAbove
      ? tr.top - estimatedTooltipHeight - 20
      : tr.bottom + 20;
    const clampedTop = Math.max(
      edgeGap,
      Math.min(vH - estimatedTooltipHeight - edgeGap, preferredTop),
    );

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="sync">
          {/* Highlight Outline */}
          <motion.div
            key={`highlight-${tr.top}-${tr.left}`} // Force re-render on move
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.05, 1],
            }}
            transition={{
              opacity: { repeat: Infinity, duration: 2 },
              scale: { repeat: Infinity, duration: 2 },
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "fixed",
              top: tr.top - 6,
              left: tr.left - 6,
              width: tr.width + 12,
              height: tr.height + 12,
              borderRadius: "100px",
              border: `3px dashed ${color}`,
              zIndex: 100001,
              pointerEvents: "none",
            }}
          />

          {/* Tooltip Content Container */}
          <motion.div
            key={`tooltip-${tr.top}-${tr.left}`} // Force re-render on move
            initial={{ opacity: 0, scale: 0.9, y: shouldShowAbove ? 20 : -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: shouldShowAbove ? 10 : -10 }}
            style={{
              position: "fixed",
              top: clampedTop,
              left: boxLeft,
              width: bW,
              maxHeight: `calc(100vh - ${edgeGap * 2}px)`,
              zIndex: 100002,
              pointerEvents: "auto",
              display: "flex",
              flexDirection: shouldShowAbove ? "column-reverse" : "column",
              alignItems: "center",
            }}
          >
            {/* Dynamic Arrow/Triangle for Post-Login or Guest */}
            {!isGuest && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "rgba(15, 15, 18, 0.98)",
                  borderLeft: `1px solid ${color}44`,
                  borderTop: shouldShowAbove ? "none" : `1px solid ${color}44`,
                  borderRight: shouldShowAbove
                    ? `1px solid ${color}44`
                    : "none",
                  borderBottom: shouldShowAbove
                    ? `1px solid ${color}44`
                    : "none",
                  transform: "rotate(45deg)",
                  marginBottom: shouldShowAbove ? 0 : -10,
                  marginTop: shouldShowAbove ? -10 : 0,
                  position: "relative",
                  zIndex: 1,
                  // Center the triangle precisely under/above the target center
                  left: arrowX - bW / 2,
                }}
              />
            )}

            {isGuest && (
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  marginBottom: shouldShowAbove ? 0 : "10px",
                  marginTop: shouldShowAbove ? "10px" : 0,
                  alignSelf: "flex-start",
                  marginLeft: arrowX - 16, // Center of 32px SVG
                  transform: shouldShowAbove ? "rotate(180deg)" : "none",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={color}
                  strokeWidth="4"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </motion.div>
            )}

            <div style={{ width: "100%" }}>{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const isSmallScreen = window.innerWidth <= 430;
  const mobileEntryButton = getGuestMobileEntryButton();
  const hasMobileNavEntry = !!mobileEntryButton;
  const guestTargetBtn = getGuestWalkthroughTarget();
  const effectiveGuestRect =
    navbarBtnRect ||
    (guestTargetBtn ? guestTargetBtn.getBoundingClientRect() : null);

  if (mode === "guest") {
    // Keep guest message centered whenever mobile nav entry is active.
    const guestTr = hasMobileNavEntry ? null : effectiveGuestRect;

    return (
      <TooltipWrapper
        targetRect={guestTr}
        color="#ff3b30"
        isGuest={!hasMobileNavEntry}
      >
        <div
          style={{
            background: "rgba(15, 15, 18, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 59, 48, 0.5)",
            borderRadius: "24px",
            padding: isSmallScreen
              ? "1rem 1rem"
              : isMobile
                ? "1.15rem 1.25rem"
                : "1.25rem 1.5rem",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              color: "#ff3b30",
              fontSize: isSmallScreen
                ? "0.82rem"
                : isMobile
                  ? "0.9rem"
                  : "0.98rem",
              fontWeight: 900,
              marginBottom: "0.4rem",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Action Required
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: isSmallScreen
                ? "0.78rem"
                : isMobile
                  ? "0.83rem"
                  : "0.9rem",
              lineHeight: 1.5,
              margin: "0.45rem 0 0",
            }}
          >
            {hasMobileNavEntry ? (
              <>
                Welcome to Fin2Line! Tap the menu icon, then choose{" "}
                <b>Sign Up</b> to create your account and unlock your
                personalized roadmap.
              </>
            ) : (
              <>
                New here? Click <b>Sign Up</b> to create your account and unlock
                your personalized roadmap.
              </>
            )}
          </p>
          <button
            onClick={handleComplete}
            style={{
              marginTop: "1.2rem",
              background: "linear-gradient(135deg, #ff3b30 0%, #d72323 100%)",
              border: "none",
              color: "#fff",
              fontSize: isSmallScreen ? "0.72rem" : "0.78rem",
              fontWeight: 800,
              padding: isSmallScreen ? "0.5rem 1.15rem" : "0.55rem 1.5rem",
              borderRadius: "100px",
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </TooltipWrapper>
    );
  }
  // POST-LOGIN MODE
  if (mode === "post-login") {
    const step = POST_LOGIN_STEPS[currentStep];
    const StepIcon = step.icon;
    const tr = isMobile ? null : targetRect;

    return (
      <TooltipWrapper targetRect={tr} color="#ff3b30">
        <div
          style={{
            background: "rgba(15, 15, 18, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 59, 48, 0.4)",
            borderRadius: "24px",
            padding: isSmallScreen ? "1rem" : isMobile ? "1.2rem" : "1.5rem",
            boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: isSmallScreen ? "0.7rem" : "1rem",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: isSmallScreen ? "34px" : "40px",
                height: isSmallScreen ? "34px" : "40px",
                background: "rgba(255, 59, 48, 0.1)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff3b30",
                flexShrink: 0,
              }}
            >
              <StepIcon size={isSmallScreen ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  color: "white",
                  fontSize: isSmallScreen ? "0.9rem" : "1rem",
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </h1>
              <div
                style={{
                  fontSize: isSmallScreen ? "0.65rem" : "0.7rem",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Tour: {currentStep + 1} of {POST_LOGIN_STEPS.length}
              </div>
            </div>
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: isSmallScreen ? "0.8rem" : "0.88rem",
              lineHeight: 1.6,
              margin: "0 0 1.4rem",
            }}
          >
            {step.description}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={handleSkip}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                fontSize: isSmallScreen ? "0.75rem" : "0.8rem",
                cursor: "pointer",
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #ff3b30 0%, #d72323 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: isSmallScreen ? "0.55rem 1rem" : "0.6rem 1.4rem",
                fontSize: isSmallScreen ? "0.76rem" : "0.8rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 10px 20px rgba(255, 59, 48, 0.2)",
              }}
            >
              {currentStep === POST_LOGIN_STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </TooltipWrapper>
    );
  }

  return null;
};

export default Walkthrough;
