import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Recommendations from "./pages/Recommendations";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PRDashboard from "./pages/PRDashboard";
import ExecutorDashboard from "./pages/ExecutorDashboard";
import DocumentReview from "./pages/DocumentReview";
import DraftReview from "./pages/DraftReview";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Walkthrough from "./components/Walkthrough";
import AIAssistant from "./components/AIAssistant";
import Loader from "./components/Loader";
import { Toaster } from "react-hot-toast";
import "./App.css";

void motion;

// Routes that hide the Footer
const HIDE_FOOTER_ROUTES = ["/login", "/register", "/services", "/onboarding", "/auth/google/callback"];
// Routes that hide the Navbar — only auth pages (login/register) since dashboard now uses the shared navbar
const HIDE_NAVBAR_ROUTES = ["/login", "/register", "/onboarding", "/auth/google/callback"];

function App() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showFullRouteLoader, setShowFullRouteLoader] = useState(false);

  const shouldHideNavbar = HIDE_NAVBAR_ROUTES.some(
    (r) => location.pathname === r,
  );
  const shouldHideFooter = HIDE_FOOTER_ROUTES.some(
    (r) => location.pathname === r,
  );
  const shouldShowAIAssistant = location.pathname === "/";
  const isDarkMode = localStorage.getItem("theme") !== "light";

  // Handle Initial Site Load
  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem("fin2line_loaded");
    const delay = hasLoadedBefore ? 2200 : 4500; // 4.5s for first visit, 2.2s for refresh/return

    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsInitialLoad(false);
      sessionStorage.setItem("fin2line_loaded", "true");
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // Handle Route Transitions
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isInitialLoad) {
      const isAuthRedirect = sessionStorage.getItem("fin2line_auth_redirect") === "true";
      let hideTimer;
      if (isAuthRedirect) {
        setIsLoading(true);
        setShowFullRouteLoader(true);
        hideTimer = window.setTimeout(() => {
          setIsLoading(false);
          setShowFullRouteLoader(false);
          sessionStorage.removeItem("fin2line_auth_redirect");
        }, 250);
      } else {
        const showTimer = window.setTimeout(() => {
          setIsLoading(true);
          hideTimer = window.setTimeout(() => {
            setIsLoading(false);
          }, 250); // Snappy route transition delay
        }, 0);
        return () => {
          window.clearTimeout(showTimer);
          if (hideTimer) window.clearTimeout(hideTimer);
        };
      }
      return () => {
        if (hideTimer) window.clearTimeout(hideTimer);
      };
    }
  }, [location.pathname, isInitialLoad]);

  
  useEffect(() => {
    window.triggerFin2LineRefresh = () => {
      setIsInitialLoad(true);
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 2500);
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AnimatePresence mode="wait">
        {isLoading && <Loader key="loader" minimal={!isInitialLoad && !showFullRouteLoader} />}
      </AnimatePresence>

      <motion.div
        className="app-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {!shouldHideNavbar && <Navbar />}
        <Walkthrough isAppLoading={isLoading} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route 
              path="/recommendations" 
              element={
                <ProtectedRoute>
                  <Recommendations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/services" 
              element={
                <ProtectedRoute>
                  <Recommendations />
                </ProtectedRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pr-dashboard"
              element={
                <ProtectedRoute allowedRoles={["PR", "admin"]}>
                  <PRDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/executor-dashboard"
              element={
                <ProtectedRoute allowedRoles={["executor", "executorN", "admin"]}>
                  <ExecutorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/review/:leadId"
              element={
                <ProtectedRoute adminOnly={true}>
                  <DocumentReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/review-draft/:leadId"
              element={
                <ProtectedRoute>
                  <DraftReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
        {!shouldHideFooter && <Footer />}
        {shouldShowAIAssistant && <AIAssistant />}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: "var(--font-body)",
              borderRadius: "4px",
              background: "whitesmoke",
              color: "#000",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.01em",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "whitesmoke",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "whitesmoke",
              },
            },
          }}
        />
      </motion.div>
    </GoogleOAuthProvider>
  );
}

export default App;
