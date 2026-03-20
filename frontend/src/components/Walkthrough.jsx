import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, X, Play, Target, Sparkles, LayoutDashboard,
    ArrowRight, ArrowUpLeft, MousePointer2, UserPlus, 
    Rocket, Shield, Zap, Globe
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
    hasSeenPostLoginWalkthrough,
    markPostLoginWalkthroughSeen,
    hasCompletedOnboarding,
} from '../utils/onboardingFlow';

const POST_LOGIN_STEPS = [
    {
        id: 'guide-services',
        title: 'Our Services',
        description: 'Explore our full range of professional business solutions. From registrations to compliance, find everything you need to grow.',
        target: '#nav-link-Services',
        icon: Sparkles
    },
    {
        id: 'guide-dashboard',
        title: 'Your Dashboard',
        description: 'Access your personalized control center anytime. Track your business growth, manage documents, and view service history here.',
        target: '#nav-link-Dashboard, #navbar-goto-dashboard-btn, #mobile-dashboard-link',
        icon: LayoutDashboard
    },
    {
        id: 'guide-about',
        title: 'About Vithartha',
        description: 'Discover the vision behind Vithartha and how we are revolutionizing business management for entrepreneurs.',
        target: '#nav-link-About',
        icon: Globe
    }
];

const GUEST_WALKTHROUGH_KEY = 'vithartha_guest_walkthrough_seen_v3';

const Walkthrough = ({ isAppLoading }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [navbarBtnRect, setNavbarBtnRect] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [mode, setMode] = useState('guest'); 
    const postLoginTimersRef = useRef([]);
    
    const navigate = useNavigate();
    const location = useLocation();

    const burstFlowers = useCallback((intense = false) => {
        confetti({
            particleCount: intense ? 120 : 70,
            spread: intense ? 90 : 60,
            origin: { x: 0.1, y: 0.85 },
            zIndex: 100005,
            colors: ['#ff3b30', '#ff8a65', '#ffd166', '#22c55e'],
        });
        confetti({
            particleCount: intense ? 120 : 70,
            spread: intense ? 90 : 60,
            origin: { x: 0.9, y: 0.85 },
            zIndex: 100005,
            colors: ['#ff3b30', '#ff8a65', '#ffd166', '#22c55e'],
        });
    }, []);

    const clearPostLoginTimers = useCallback(() => {
        postLoginTimersRef.current.forEach((id) => clearTimeout(id));
        postLoginTimersRef.current = [];
    }, []);

    const getVisibleTargetElement = useCallback((selectorList) => {
        if (!selectorList) return null;
        const selectors = selectorList.split(',').map((s) => s.trim()).filter(Boolean);
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
    const updateTargetRect = useCallback((targetSelector) => {
        if (!targetSelector) return;
        const el = getVisibleTargetElement(targetSelector);
        if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect(prev => {
                if (!prev) return rect;
                const moved = Math.abs(prev.top - rect.top) > 1 || Math.abs(prev.left - rect.left) > 1 ||
                              Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1;
                return moved ? rect : prev;
            });
            return true;
        }
        return false;
    }, [getVisibleTargetElement]);

    const getGuestSignUpButton = useCallback(() => {
        // Order of preference: 
        // 1. The actual mobile signup button (if menu is open)
        // 2. The desktop login/signup button
        // 3. The mobile toggle (hamburger)
        const candidates = [
            document.querySelector('#navbar-mobile-signup-btn'),
            document.querySelector('#navbar-login-btn'),
            document.querySelector('#navbar-mobile-toggle'),
        ].filter(Boolean);

        const visible = candidates.find((el) => {
            const rect = el.getBoundingClientRect();
            // Check visibility and also if it's within viewport roughly
            return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top <= window.innerHeight;
        });

        // Fallback to whichever candidate exists
        return visible || candidates[0] || null;
    }, []);

    const checkVisibility = useCallback(() => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isAuthPage = location.pathname.includes('/login') || location.pathname.includes('/register');
        const isLandingPage = location.pathname === '/';
        
        if (isAuthPage) {
            setIsVisible(false);
            return;
        }

        if (mode === 'guest' && isVisible) {
            const hasSeenGuest = localStorage.getItem(GUEST_WALKTHROUGH_KEY) === 'true';
            if (hasSeenGuest || !isLandingPage || !!user) {
                setIsVisible(false);
                return;
            }
            // Update the rect for positioning
            const btn = getGuestSignUpButton();
            if (btn) {
                const rect = btn.getBoundingClientRect();
                setNavbarBtnRect(prev => {
                    if (!prev) return rect;
                    const moved = Math.abs(prev.top - rect.top) > 1 || Math.abs(prev.left - rect.left) > 1;
                    return moved ? rect : prev;
                });
            }
            return;
        }

        // Keep post-login tour stable during background checks.
        // Guest tour should still re-check so it dismisses reliably when marked as seen.
        if (isVisible && (mode === 'post-login' || mode === 'user')) {
            return;
        }

        if (!user) {
            const hasSeenGuest = localStorage.getItem(GUEST_WALKTHROUGH_KEY) === 'true';
            if (hasSeenGuest || !isLandingPage) {
                setIsVisible(false);
                return;
            }

            setMode('guest');
            const btn = getGuestSignUpButton();
            if (btn) {
                const rect = btn.getBoundingClientRect();
                setNavbarBtnRect(rect);
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } else {
            const hasSeenPostLogin = hasSeenPostLoginWalkthrough(user);
            const onboardingDone = hasCompletedOnboarding(user);
            
            // Only show post-login guide on Services page for non-admins
            if (
                !hasSeenPostLogin &&
                onboardingDone &&
                (location.pathname === '/services' || location.pathname === '/recommendations') &&
                user.role !== 'admin'
            ) {
                setMode('post-login');
                setIsVisible(true);
                setCurrentStep(0);
                const step = POST_LOGIN_STEPS[currentStep];
                if (step) updateTargetRect(step.target);
            } else {
                setIsVisible(false);
            }
        }
    }, [location.pathname, currentStep, updateTargetRect, isVisible, mode, getGuestSignUpButton]);

    useEffect(() => {
        // Initial check with delay for page load
        const timer = setTimeout(checkVisibility, 500);
        
        // Listeners for dynamic updates
        window.addEventListener('storage', checkVisibility);
        window.addEventListener('resize', checkVisibility);
        window.addEventListener('scroll', checkVisibility);
        
        // Polling for elements that might appear later
        const interval = setInterval(checkVisibility, 2000);

        // Global click listener to refresh promptly after any user interaction
        const handleGlobalClick = () => setTimeout(checkVisibility, 300);
        window.addEventListener('click', handleGlobalClick);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('storage', checkVisibility);
            window.removeEventListener('resize', checkVisibility);
            window.removeEventListener('scroll', checkVisibility);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [checkVisibility]);

    useEffect(() => {
        if (!isVisible || mode !== 'guest') return;

        const btn = getGuestSignUpButton();
        if (!btn) return;

        const handleGuestSignUpClick = (e) => {
            // Do not dismiss if clicking the hamburger menu toggle; 
            // we want to wait for the menu to open and point to the real button.
            if (btn.id === 'navbar-mobile-toggle') return;
            
            localStorage.setItem(GUEST_WALKTHROUGH_KEY, 'true');
            setIsVisible(false);
        };

        btn.addEventListener('click', handleGuestSignUpClick);
        return () => btn.removeEventListener('click', handleGuestSignUpClick);
    }, [isVisible, mode, getGuestSignUpButton]);

    useEffect(() => () => clearPostLoginTimers(), [clearPostLoginTimers]);

    // Recalculate rect whenever mode or step changes
    useEffect(() => {
        const step = POST_LOGIN_STEPS[currentStep];
        if (isVisible && step && mode === 'post-login') {
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
        if (mode === 'post-login' || mode === 'user') {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            if (user) markPostLoginWalkthroughSeen(user);
            burstFlowers(true);
        } else if (mode === 'guest') {
            localStorage.setItem(GUEST_WALKTHROUGH_KEY, 'true');
        }
        setCurrentStep(0);
    };

    if (!isVisible || isAppLoading) return null;

    // Common Tooltip Wrapper
    const TooltipWrapper = ({ children, targetRect: tr, color = '#ff3b30', isGuest = false }) => {
        const vW = window.innerWidth;
        const vH = window.innerHeight;
        const bW = Math.min(320, vW - 40);

        if (!tr) {
            return (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 100000, 
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.4)'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="walkthrough-center"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                width: bW,
                                zIndex: 100002,
                                pointerEvents: 'auto',
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

        // Calculate horizontal position
        const targetCenter = tr.left + (tr.width / 2);
        const boxLeft = Math.min(vW - bW - 20, Math.max(20, targetCenter - (bW / 2)));
        
        // Calculate arrow center relative to the box
        // Clamp arrowX between 20px and (boxWidth - 20px) so it doesn't pop out of the bubble
        const arrowX = Math.min(bW - 20, Math.max(20, targetCenter - boxLeft));

        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none' }}>
                <AnimatePresence mode="wait">
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
                            position: 'fixed',
                            top: tr.top - 6,
                            left: tr.left - 6,
                            width: tr.width + 12,
                            height: tr.height + 12,
                            borderRadius: '100px',
                            border: `3px dashed ${color}`,
                            zIndex: 100001,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Tooltip Content Container */}
                    <motion.div
                        key={`tooltip-${tr.top}-${tr.left}`} // Force re-render on move
                        initial={{ opacity: 0, scale: 0.9, y: shouldShowAbove ? 20 : -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: shouldShowAbove ? 10 : -10 }}
                        style={{
                            position: 'fixed',
                            top: shouldShowAbove ? 'auto' : tr.bottom + 20,
                            bottom: shouldShowAbove ? (vH - tr.top) + 20 : 'auto',
                            left: boxLeft,
                            width: bW,
                            zIndex: 100002,
                            pointerEvents: 'auto',
                            display: 'flex',
                            flexDirection: shouldShowAbove ? 'column-reverse' : 'column',
                            alignItems: 'center'
                        }}
                    >
                        {/* Dynamic Arrow/Triangle for Post-Login or Guest */}
                        {!isGuest && (
                            <div style={{ 
                                width: '20px', 
                                height: '20px', 
                                background: 'rgba(15, 15, 18, 0.98)',
                                borderLeft: `1px solid ${color}44`, 
                                borderTop: shouldShowAbove ? 'none' : `1px solid ${color}44`,
                                borderRight: shouldShowAbove ? `1px solid ${color}44` : 'none',
                                borderBottom: shouldShowAbove ? `1px solid ${color}44` : 'none',
                                transform: 'rotate(45deg)',
                                marginBottom: shouldShowAbove ? 0 : -10,
                                marginTop: shouldShowAbove ? -10 : 0,
                                position: 'relative',
                                zIndex: 1,
                                // Center the triangle precisely under/above the target center
                                left: arrowX - (bW / 2)
                            }} />
                        )}

                        {isGuest && (
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ 
                                    marginBottom: shouldShowAbove ? 0 : '10px',
                                    marginTop: shouldShowAbove ? '10px' : 0,
                                    alignSelf: 'flex-start',
                                    marginLeft: arrowX - 16, // Center of 32px SVG
                                    transform: shouldShowAbove ? 'rotate(180deg)' : 'none'
                                }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="4">
                                    <path d="M12 19V5M5 12l7-7 7 7"/>
                                </svg>
                            </motion.div>
                        )}

                        <div style={{ width: '100%' }}>
                            {children}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    };

    if (mode === 'guest' && navbarBtnRect) {
        return (
            <TooltipWrapper targetRect={navbarBtnRect} color="#ff3b30" isGuest={true}>
                <div style={{
                    background: 'rgba(15, 15, 18, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 59, 48, 0.5)',
                    borderRadius: '24px',
                    padding: window.innerWidth < 380 ? '1rem 1.25rem' : '1.2rem 1.5rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                    textAlign: 'center',
                }}>
                    <h1 style={{ color: '#ff3b30', fontSize: window.innerWidth < 380 ? '0.85rem' : '0.95rem', fontWeight: 900, marginBottom: '0.4rem', textTransform: 'uppercase', margin: 0 }}>Action Required</h1>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: window.innerWidth < 380 ? '0.8rem' : '0.85rem', lineHeight: 1.5, margin: '0.4rem 0 0' }}>
                        New here? Click <b>Sign Up</b> to create your account and unlock your personalized roadmap.
                    </p>
                    <button onClick={handleComplete} style={{ marginTop: '1.2rem', background: 'linear-gradient(135deg, #ff3b30 0%, #d72323 100%)', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '0.5rem 1.5rem', borderRadius: '100px', cursor: 'pointer' }}>
                        Got it
                    </button>
                </div>
            </TooltipWrapper>
        );
    }
    // POST-LOGIN MODE
    const isMobile = window.innerWidth <= 768;
    if (mode === 'post-login' && (targetRect || isMobile)) {
        const step = POST_LOGIN_STEPS[currentStep];
        const StepIcon = step.icon;
        const tr = isMobile ? null : targetRect;

        return (
            <TooltipWrapper targetRect={tr} color="#ff3b30">
                <div style={{
                    background: 'rgba(15, 15, 18, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 59, 48, 0.4)',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30' }}>
                            <StepIcon size={20} />
                        </div>
                        <div>
                            <h1 style={{ color: 'white', fontSize: '1rem', fontWeight: 800, margin: 0 }}>{step.title}</h1>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tour: {currentStep + 1} of {POST_LOGIN_STEPS.length}</div>
                        </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                        {step.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={handleSkip} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer' }}>Skip</button>
                        <button 
                            onClick={handleNext} 
                            style={{ 
                                background: 'linear-gradient(135deg, #ff3b30 0%, #d72323 100%)', color: 'white', border: 'none', borderRadius: '12px', 
                                padding: '0.6rem 1.4rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 10px 20px rgba(255, 59, 48, 0.2)'
                            }}
                        >
                            {currentStep === POST_LOGIN_STEPS.length - 1 ? 'Finish' : 'Next'}
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
