import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Mail, Lock, Building, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    clearOnboardingCompleted,
    clearPostLoginWalkthroughSeen,
} from '../utils/onboardingFlow';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialData = location.state?.initialData || {};

    const [formData, setFormData] = useState({
        name: initialData.name || '',
        email: initialData.email || '',
        company: '',
        password: '',
        role: 'user',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [regRole, setRegRole] = useState('user');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRoleChange = (role) => {
        setRegRole(role);
        setFormData({ ...formData, role });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(`Welcome aboard, ${data.name || formData.name}!`, { icon: '✅' });
                const newUser = { ...data, onboardingCompleted: false };
                localStorage.setItem('vithartha_guest_walkthrough_seen_v2', 'true');
                localStorage.setItem('user', JSON.stringify(newUser));
                clearOnboardingCompleted(newUser);
                clearPostLoginWalkthroughSeen(newUser);
                window.dispatchEvent(new Event('storage'));
                setTimeout(() => {
                    navigate(data.role === 'admin' ? '/admin' : '/onboarding');
                }, 1200);
            } else {
                toast.error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.8rem 1rem',
        transition: 'border-color 0.2s ease',
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            position: 'relative',
            overflow: 'hidden',
            padding: '4.5rem 1rem 1rem',
        }}>
            {/* Green radial glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `
                    radial-gradient(ellipse 40% 30% at 20% 20%, rgba(34,197,94,0.05) 0%, transparent 60%),
                    radial-gradient(ellipse 40% 30% at 80% 80%, rgba(74,173,160,0.04) 0%, transparent 60%)
                `,
                pointerEvents: 'none',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                style={{ width: '100%', maxWidth: '680px', position: 'relative', zIndex: 1 }}
            >
                <div style={{
                    background: 'var(--modal-gradient)',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    padding: '1.3rem 2.2rem',
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    {/* Back button */}
                    <button
                        id="reg-back-btn"
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            color: 'var(--text-muted)', fontSize: '0.78rem',
                            fontWeight: 600, marginBottom: '0.7rem',
                            padding: 0, transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <ArrowLeft size={13} /> Back
                    </button>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
                        <h1 style={{
                            fontSize: '1.4rem', fontWeight: 800,
                            color: 'var(--text)', marginBottom: '0.1rem',
                            letterSpacing: '-0.02em',
                        }}>
                            Create Account
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Join Vithartha as a business partner
                        </p>
                    </div>

                    {/* Role Selector */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-card)',
                        padding: '0.2rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        marginBottom: '0.8rem',
                    }}>
                        {['user', 'admin'].map(role => (
                            <button key={role}
                                type="button"
                                onClick={() => handleRoleChange(role)}
                                style={{
                                    flex: 1, padding: '0.6rem', borderRadius: '7px',
                                    border: 'none', fontSize: '0.82rem', fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.25s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                    background: regRole === role ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'transparent',
                                    color: regRole === role ? 'white' : 'var(--text-muted)',
                                    boxShadow: regRole === role ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                                }}
                            >
                                {role === 'user' ? <User size={13} /> : <ShieldCheck size={13} />}
                                {role === 'user' ? 'User Account' : 'Admin Account'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {/* Name + Company Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Full Name *
                                </label>
                                <div style={inputStyle}>
                                    <User size={14} color="rgba(255,255,255,0.3)" />
                                    <input
                                        id="reg-name" type="text" name="name"
                                        placeholder="Full Name" required
                                        value={formData.name} onChange={handleChange}
                                        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                                        onFocus={e => e.currentTarget.parentElement.style.borderColor = '#22c55e'}
                                        onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Company
                                </label>
                                <div style={inputStyle}>
                                    <Building size={14} color="rgba(255,255,255,0.3)" />
                                    <input
                                        id="reg-company" type="text" name="company"
                                        placeholder="Optional"
                                        value={formData.company} onChange={handleChange}
                                        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                                        onFocus={e => e.currentTarget.parentElement.style.borderColor = '#22c55e'}
                                        onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Email Address *
                            </label>
                            <div style={inputStyle}>
                                <Mail size={14} color="rgba(255,255,255,0.3)" />
                                <input
                                    id="reg-email" type="email" name="email"
                                    placeholder="you@company.com" required
                                    value={formData.email} onChange={handleChange}
                                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                                    onFocus={e => e.currentTarget.parentElement.style.borderColor = '#22c55e'}
                                    onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Password *
                            </label>
                            <div style={inputStyle}>
                                <Lock size={14} color="rgba(255,255,255,0.3)" />
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Min 8 characters" required
                                    value={formData.password} onChange={handleChange}
                                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem', flex: 1 }}
                                    onFocus={e => e.currentTarget.parentElement.style.borderColor = '#22c55e'}
                                    onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Agree checkbox */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                            <input
                                type="checkbox" id="reg-agree"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                style={{ accentColor: '#22c55e', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                                I agree to the{' '}
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>Terms of Service</span>
                                {' '}and{' '}
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>Privacy Policy</span>.
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            id="reg-submit-btn"
                            type="submit"
                            disabled={loading || !agreed}
                            style={{
                                width: '100%', padding: '0.75rem',
                                borderRadius: '8px',
                                background: (!agreed || loading) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                color: 'white', fontWeight: 800, border: 'none',
                                fontSize: '0.85rem',
                                cursor: (!agreed || loading) ? 'not-allowed' : 'pointer',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                boxShadow: agreed ? '0 6px 20px rgba(34,197,94,0.3)' : 'none',
                                transition: 'all 0.3s ease',
                                marginTop: '0.1rem',
                            }}
                            onMouseEnter={e => { if (agreed && !loading) e.currentTarget.style.boxShadow = '0 12px 32px rgba(34,197,94,0.45)'; }}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = agreed ? '0 8px 24px rgba(34,197,94,0.3)' : 'none'}
                        >
                            {loading ? (
                                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            ) : 'Get Started Now'}
                        </button>
                    </form>

                    {/* Sign in link */}
                    <div style={{ marginTop: '0.9rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            Already registered?{' '}
                            <Link to="/login" id="reg-login-link"
                                style={{ color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
