import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, LogOut, User, ChevronDown, Shield, Home, Layers, Info, Settings, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
    });
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Sync user from localStorage whenever route changes or storage event fires
    useEffect(() => {
        const checkUser = () => {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                try { setUser(JSON.parse(savedUser)); }
                catch { setUser(null); }
            } else {
                setUser(null);
            }
        };
        checkUser();
        window.addEventListener('storage', checkUser);
        return () => window.removeEventListener('storage', checkUser);
    }, [location.pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setDropdownOpen(false);
        toast.success('Logged Out Successfully');
        setTimeout(() => {
            navigate('/');
        }, 1000);
    };

    const isHome = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Locking scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [mobileOpen]);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        setMobileOpen(false);
        setDropdownOpen(false);
    }, [location.pathname]);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/recommendations' },
        { name: 'Dashboard', path: user?.role === 'admin' ? '/admin' : '/dashboard' },
        { name: 'About', path: '/about' },
    ];

    const navStyle = {
        position: 'fixed',
        top: scrolled ? '0.5rem' : '0.8rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '94%',
        maxWidth: '1200px',
        zIndex: 1000,
        padding: scrolled ? '0.5rem 1.8rem' : '0.7rem 2.2rem',
        background: isDarkMode
            ? 'rgba(20, 20, 20, 0.45)'
            : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 'var(--radius-full)',
        boxShadow: isDarkMode
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const linkColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
    const hoverColor = '#22c55e';
    const logoTextColor = isDarkMode ? 'white' : 'black';
    const activeLinkColor = '#22c55e';


    return (
        <>
            <nav style={navStyle} id="main-navbar">
                {/* Logo */}
                <Link
                    to="/"
                    style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                    }}
                >
                    <img
                        src="/vithartha-logo.png"
                        alt="Vithartha Logo"
                        style={{
                            height: scrolled ? '24px' : '28px',
                            width: 'auto',
                            objectFit: 'contain',
                            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'block',
                        }}
                    />
                    <span
                        style={{
                            fontFamily: "'Inter', 'Outfit', sans-serif",
                            fontSize: scrolled ? '1rem' : '1.1rem',
                            fontWeight: 600,
                            color: logoTextColor,
                            letterSpacing: '-0.02em',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        VITHARTHA
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                    {navLinks.map(link => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                id={`nav-link-${link.name.replace(/\s+/g, '-')}`}
                                to={link.path}
                                style={{
                                    textDecoration: 'none',
                                    color: isActive ? activeLinkColor : linkColor,
                                    fontSize: '0.96rem',
                                    fontWeight: 700,
                                    padding: '0.5rem 0.8rem',
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'all 0.2s ease',
                                    background: 'transparent',
                                    position: 'relative',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = hoverColor; }}
                                onMouseLeave={e => { e.currentTarget.style.color = isActive ? activeLinkColor : linkColor; }}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        style={{
                            background: 'transparent',
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            color: logoTextColor,
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        aria-label="Toggle theme"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Auth Area */}
                    {user ? (
                        /* === User Avatar + Dropdown === */
                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                            <button
                                id="navbar-user-avatar-btn"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0',
                                    outline: 'none',
                                }}
                                aria-label="User menu"
                                title={user.name}
                            >
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: isDarkMode ? '#3f4044' : '#e5e7eb',
                                    border: isDarkMode ? '2px solid #2e2e32' : '2px solid #d1d5db',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s ease',
                                }}>
                                    <User size={22} style={{ color: isDarkMode ? '#e0e0e0' : '#374151' }} />
                                </div>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        color: isDarkMode ? '#a0a0a0' : '#4b5563',
                                        transition: 'transform 0.3s ease',
                                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                />
                            </button>

                            {/* Dropdown Panel */}
                            {dropdownOpen && (
                                <div
                                    id="navbar-user-dropdown"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 12px)',
                                        right: 0,
                                        minWidth: '220px',
                                        background: isDarkMode ? 'rgba(18, 18, 25, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                                        backdropFilter: 'blur(24px)',
                                        WebkitBackdropFilter: 'blur(24px)',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: '18px',
                                        boxShadow: isDarkMode
                                            ? '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                                            : '0 24px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
                                        overflow: 'hidden',
                                        animation: 'dropdownFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                                        zIndex: 1100,
                                    }}
                                >
                                    {/* User Info Header */}
                                    <div style={{
                                        padding: '1rem 1.2rem',
                                        borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                    }}>
                                        <div style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: '50%',
                                            background: isDarkMode ? '#3f4044' : '#e5e7eb',
                                            border: isDarkMode ? '1px solid #2e2e32' : '1px solid #d1d5db',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <User size={20} style={{ color: isDarkMode ? '#e0e0e0' : '#374151' }} />
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <p style={{
                                                margin: 0,
                                                fontWeight: 700,
                                                fontSize: '0.88rem',
                                                color: isDarkMode ? 'white' : '#111',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {user.name}
                                            </p>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.72rem',
                                                color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {user.email}
                                            </p>
                                            <span style={{
                                                marginTop: '4px',
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                background: user.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: user.role === 'admin' ? '#ef4444' : '#10b981',
                                                borderRadius: '100px',
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div style={{ padding: '0.5rem' }}>
                                        <button
                                            id="navbar-goto-profile-btn"
                                            onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                width: '100%',
                                                padding: '0.65rem 0.8rem',
                                                border: 'none',
                                                borderRadius: '10px',
                                                background: 'transparent',
                                                color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease',
                                                fontFamily: 'var(--font-body)',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                                                e.currentTarget.style.color = isDarkMode ? 'white' : '#111';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)';
                                            }}
                                        >
                                            <User size={15} />
                                            My Profile
                                        </button>

                                        <button
                                            id="navbar-goto-dashboard-btn"
                                            onClick={() => { setDropdownOpen(false); navigate(user.role === 'admin' ? '/admin' : '/dashboard'); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                width: '100%',
                                                padding: '0.65rem 0.8rem',
                                                border: 'none',
                                                borderRadius: '10px',
                                                background: 'transparent',
                                                color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease',
                                                fontFamily: 'var(--font-body)',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                                                e.currentTarget.style.color = isDarkMode ? 'white' : '#111';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)';
                                            }}
                                        >
                                            <Shield size={15} />
                                            {user.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                                        </button>

                                        <div style={{
                                            height: '1px',
                                            background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                            margin: '0.3rem 0',
                                        }} />

                                        <button
                                            id="navbar-signout-btn"
                                            onClick={handleLogout}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                width: '100%',
                                                padding: '0.65rem 0.8rem',
                                                border: 'none',
                                                borderRadius: '10px',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease',
                                                fontFamily: 'var(--font-body)',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
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
                        /* === Sign Up Button (not logged in) === */
                        <button
                            id="navbar-login-btn"
                            className="btn"
                            style={{
                                background: '#111114',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                fontSize: '0.9rem',
                                padding: '0.6rem 2rem',
                                borderRadius: '8px',
                                fontWeight: 700,
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#22c55e';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onClick={() => navigate('/login')}
                        >
                            Sign Up
                        </button>
                    )}

                    {/* Mobile toggle */}
                    <button
                        id="navbar-mobile-toggle"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{
                            display: 'none',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: logoTextColor,
                            padding: '0.4rem',
                        }}
                        aria-label="Toggle menu"
                    >
                        <motion.div
                            animate={{ rotate: mobileOpen ? 90 : 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                        initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        style={{
                            position: 'fixed',
                            top: '80px',
                            left: '50%',
                            width: '90%',
                            zIndex: 999,
                            background: isDarkMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(30px) saturate(150%)',
                            WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                            borderRadius: '24px',
                            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                            padding: '1.2rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        }}
                    >
                        {/* Mobile user info (if logged in) */}
                        {user && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                                padding: '0.6rem',
                                marginBottom: '0.8rem',
                                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                                borderRadius: '22px',
                                border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    padding: '0.6rem 0.8rem',
                                }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: isDarkMode ? '#3f4044' : '#f3f4f6',
                                        border: isDarkMode ? '1px solid #2e2e32' : '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }}>
                                        <User size={22} style={{ color: isDarkMode ? '#e0e0e0' : '#374151' }} />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: logoTextColor, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {user.name}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                background: user.role === 'admin' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                                color: user.role === 'admin' ? '#ef4444' : '#10b981',
                                                borderRadius: '100px',
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em'
                                            }}>
                                                {user.role}
                                            </span>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Quick Actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', padding: '0.2rem' }}>
                                    <Link
                                        to="/profile"
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '0.7rem',
                                            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                                            boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                                            borderRadius: '14px',
                                            color: logoTextColor,
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            transition: 'all 0.2s',
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)',
                                        }}
                                    >
                                        <User size={15} /> My Profile
                                    </Link>
                                    <Link
                                        id="mobile-dashboard-link"
                                        to={user.role === 'admin' ? '/admin' : '/dashboard'}
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '0.7rem',
                                            background: user.role === 'admin' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                            borderRadius: '14px',
                                            color: user.role === 'admin' ? '#ef4444' : '#10b981',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            transition: 'all 0.2s',
                                            border: user.role === 'admin' ? '1px solid rgba(239,68,68,0.1)' : '1px solid rgba(16,185,129,0.1)',
                                        }}
                                    >
                                        {user.role === 'admin' ? <Shield size={15} /> : <Layers size={15} />}
                                        {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {navLinks.filter(link => {
                            if (user && link.name === 'Dashboard') return false;
                            return true;
                        }).map(link => {
                            const Icon = link.name === 'Home' ? Home :
                                link.name === 'Services' ? Layers :
                                    link.name === 'About' ? Info : Menu;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setMobileOpen(false)}
                                    style={{
                                        padding: '0.9rem 1.2rem',
                                        color: logoTextColor,
                                        fontSize: '0.95rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        borderRadius: '16px',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'transparent',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
                                        e.currentTarget.style.paddingLeft = '1.5rem';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.paddingLeft = '1.2rem';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '10px',
                                            background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Icon size={18} style={{ opacity: 0.8 }} />
                                        </div>
                                        {link.name}
                                    </div>
                                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                                </Link>
                            );
                        })}

                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            marginTop: '0.8rem',
                            paddingTop: '1rem',
                            borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0,0,0,0.1)',
                        }}>
                            {user ? (
                                <button
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 700,
                                        gap: '0.4rem',
                                        padding: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
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
                                        justifyContent: 'center',
                                        background: isDarkMode ? 'white' : 'black',
                                        color: isDarkMode ? 'black' : 'white',
                                        borderRadius: 'var(--radius-full)',
                                        padding: '0.8rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                    onClick={() => navigate('/login')}
                                >
                                    Sign Up
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
                    #navbar-login-btn, #navbar-user-avatar-btn { display: none !important; }
                    nav > div:nth-child(2) { display: none !important; }
                }
                /* Mobile menu full width on phones */
                @media (max-width: 480px) {
                    #mobile-menu {
                        width: calc(100vw - 1.5rem) !important;
                        left: 50% !important;
                        top: 70px !important;
                    }
                    #main-navbar {
                        width: calc(100% - 1.2rem) !important;
                        padding: 0.5rem 1rem !important;
                    }
                }
            `}</style>
        </>
    );
};

export default Navbar;
