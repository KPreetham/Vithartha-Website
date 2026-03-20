import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Linkedin, Award, Users, Target, Briefcase, CheckCircle2 } from 'lucide-react';

const About = () => {
    const founderDetails = {
        name: 'Vithartha Consulting',
        tagline: 'Precision Compliance. Professional Growth.',
        mission: 'To simplify compliance, finance, and business advisory for startups and growing enterprises across India, delivering expert-led, technology-driven solutions that accelerate growth.',
        vision: 'To become India\'s most trusted partner for startup compliance, financial management, and business consulting.',
    };

    const services = [
        'GST Registration & Filing',
        'Income Tax & TDS Compliance',
        'Company Incorporation & Startup Consulting',
        'Virtual CFO & Accountant Services',
        'Legal & Secretarial Services',
        'Payroll Management (EPF, ESI)',
    ];

    const stats = [
        { label: 'Clients Served', value: '500+', icon: Users },
        { label: 'Services Offered', value: '25+', icon: Briefcase },
        { label: 'Expert Years', value: '10+', icon: Award },
        { label: 'Satisfaction', value: '99%', icon: Target },
    ];

    const cardStyle = {
        background: 'var(--about-card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        padding: '1.5rem',
    };

    const containerStyle = {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 2rem',
    };

    return (
        <div className="home-page-shell about-pad-top" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', paddingTop: 'clamp(140px, 16vw, 180px)', paddingBottom: '5rem', position: 'relative' }}>
            <div className="home-page-backdrop" aria-hidden="true" />
            
            <style>{`
                @media (max-width: 768px) {
                    .about-grid-mission, .about-grid-services, .about-grid-contact {
                        grid-template-columns: 1fr !important;
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
                }
            `}</style>
            
            {/* ── Hero Section ── */}
            <section className="about-section-margin" style={{ marginBottom: '4rem' }}>
                <div className="about-container" style={containerStyle}>
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        style={{ textAlign: 'center' }}
                    >
                        <h1 className="about-hero-title" style={{ 
                            fontSize: '2.8rem', fontWeight: 700, 
                            letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '1rem', 
                            lineHeight: 1.2 
                        }}>
                            {founderDetails.name} <br/>
                            <span className="about-hero-subtitle" style={{ color: '#10b981', fontSize: '2.2rem' }}>Precision Compliance. Professional Growth.</span>
                        </h1>
                        <p className="about-hero-text" style={{ 
                            color: 'var(--text-muted)', fontSize: '1.05rem', 
                            maxWidth: '600px', margin: '0 auto', lineHeight: 1.5, fontWeight: 400 
                        }}>
                            {founderDetails.mission.split(',')[0]}. Simplifying the complexities of financial growth.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── Stats Section ── */}
            <section className="about-section-margin" style={{ marginBottom: '4rem' }}>
                <div className="about-container" style={containerStyle}>
                    <div className="about-grid-stats" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '1rem' 
                    }}>
                        {stats.map((stat, idx) => (
                            <div key={idx} style={{ ...cardStyle, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.2rem' }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--card-content-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Mission & Vision ── */}
            <section className="about-section-margin" style={{ marginBottom: '4rem' }}>
                <div className="about-container" style={containerStyle}>
                    <div className="about-grid-mission" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        <div style={cardStyle}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#10b981', opacity: 0.6 }} />
                            <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Our Mission</h3>
                            <p style={{ fontSize: '0.95rem', color: 'var(--card-content-text)', lineHeight: 1.7 }}>
                                {founderDetails.mission}
                            </p>
                        </div>

                        <div style={cardStyle}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#10b981', opacity: 0.6 }} />
                            <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Our Vision</h3>
                            <p style={{ fontSize: '0.95rem', color: 'var(--card-content-text)', lineHeight: 1.7 }}>
                                {founderDetails.vision}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Offerings ── */}
            <section className="about-section-margin" style={{ marginBottom: '4rem' }}>
                <div className="about-container" style={containerStyle}>
                    <div style={{ ...cardStyle, padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                            Core Expertise
                        </h2>
                        <div className="about-grid-services" style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: '0.8rem' 
                        }}>
                            {services.map((service, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-card-alt)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <CheckCircle2 size={16} color="#10b981" style={{ opacity: 0.6 }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--card-content-text)' }}>{service}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact Section ── */}
            <section className="about-section-margin">
                <div className="about-container" style={containerStyle}>
                    <div className="about-grid-contact" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '1rem' 
                    }}>
                        {[
                            { label: 'Email', value: 'info@vithartha.com', icon: Mail, link: 'mailto:info@vithartha.com' },
                            { label: 'Phone', value: '+91 98765 43210', icon: Phone, link: 'tel:+919876543210' },
                            { label: 'Location', value: 'India', icon: MapPin, link: null },
                            { label: 'LinkedIn', value: 'Vithartha Consulting', icon: Linkedin, link: 'https://linkedin.com/company/vithartha' },
                        ].map((item, idx) => (
                            <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', pointerEvents: item.link ? 'auto' : 'none' }}>
                                <div style={{
                                    ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                                    padding: '1.2rem'
                                }}>
                                    <div style={{ marginBottom: '0.8rem', opacity: 0.5 }}>
                                        <item.icon size={18} color="#10b981" />
                                    </div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--card-content-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--card-content-text)' }}>{item.value}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
