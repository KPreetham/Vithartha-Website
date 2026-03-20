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
        const candidates = [
            document.querySelector('#navbar-login-btn'),
            document.querySelector('#navbar-mobile-toggle'),
            document.querySelector('#navbar-mobile-signup-btn'),
        ].filter(Boolean);

        const visible = candidates.find((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

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

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('storage', checkVisibility);
            window.removeEventListener('resize', checkVisibility);
            window.removeEventListener('scroll', checkVisibility);
        };
    }, [checkVisibility]);

    useEffect(() => {
        if (!isVisible || mode !== 'guest') return;

        const btn = getGuestSignUpButton();
        if (!btn) return;

        const handleGuestSignUpClick = () => {
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
    const TooltipWrapper = ({ children, targetRect: tr, color = '#ff3b30' }) => {
        if (!tr) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none' }}>
                <AnimatePresence mode="wait">
                    {/* Highlight Outline */}
                    <motion.div
                        key="walkthrough-highlight"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            top: tr.top - 4,
                            left: tr.left - 4,
                            width: tr.width + 8,
                            height: tr.height + 8,
                            borderRadius: '100px',
                            border: `2.5px dotted ${color}`,
                            zIndex: 100001,
                        }}
                    />

                    {/* Tooltip Content */}
                    <motion.div
                        key="walkthrough-tooltip"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        style={{
                            position: 'fixed',
                            top: tr.bottom + 20,
                            // Ensure the box stays within viewport with 20px padding
                            left: Math.min(window.innerWidth - 340, Math.max(20, tr.left + (tr.width / 2) - 160)),
                            width: '320px',
                            zIndex: 100002,
                            pointerEvents: 'auto',
                        }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    };

    // GUEST MODE
    if (mode === 'guest' && navbarBtnRect) {
        return (
            <TooltipWrapper targetRect={navbarBtnRect} color="#ff3b30">
                <motion.div
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="4">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                </motion.div>
                <div style={{
                    background: 'rgba(15, 15, 18, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 59, 48, 0.5)',
                    borderRadius: '24px',
                    padding: '1.2rem 1.5rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <div style={{ 
                        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
                        width: '20px', height: '20px', background: 'rgba(15, 15, 18, 0.98)',
                        borderLeft: '1px solid rgba(255, 59, 48, 0.5)', borderTop: '1px solid rgba(255, 59, 48, 0.5)'
                    }} />
                    <h4 style={{ color: '#ff3b30', fontSize: '0.95rem', fontWeight: 900, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Action Required</h4>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        New here? Click <b>Sign Up</b> to create your account and unlock your personalized service roadmap.
                    </p>
                    <button onClick={handleComplete} style={{ marginTop: '1.2rem', background: 'linear-gradient(135deg, #ff3b30 0%, #d72323 100%)', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 800, padding: '0.5rem 1.5rem', borderRadius: '100px', cursor: 'pointer' }}>
                        Got it
                    </button>
                </div>
            </TooltipWrapper>
        );
    }

    // POST-LOGIN MODE
    if (mode === 'post-login' && targetRect) {
        const step = POST_LOGIN_STEPS[currentStep];
        const StepIcon = step.icon;

        return (
            <TooltipWrapper targetRect={targetRect} color="#ff3b30">
                <div style={{
                    background: 'rgba(15, 15, 18, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 59, 48, 0.4)',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}>
                    <div style={{ 
                        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
                        width: '20px', height: '20px', background: 'rgba(15, 15, 18, 0.98)',
                        borderLeft: '1px solid rgba(255, 59, 48, 0.4)', borderTop: '1px solid rgba(255, 59, 48, 0.4)'
                    }} />

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30' }}>
                            <StepIcon size={20} />
                        </div>
                        <div>
                            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 800, margin: 0 }}>{step.title}</h4>
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
