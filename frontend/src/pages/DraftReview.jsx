import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, Check, X, FileText, ExternalLink, 
    AlertCircle, ShieldCheck, Clock, Download,
    ArrowRight, Info, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Loader from '../components/Loader';

const DraftReview = () => {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchLeadDetails = useCallback(async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.get(`${apiUrl}/leads/${leadId}`);
            if (response.data) {
                setLead(response.data);
                // Find the latest draft
                const draftDocs = response.data.documents?.filter(d => d.type === 'Draft');
                if (draftDocs && draftDocs.length > 0) {
                    setSelectedDoc(draftDocs[draftDocs.length - 1]);
                } else if (response.data.documents?.length > 0) {
                    setSelectedDoc(response.data.documents[0]);
                }
            } else {
                toast.error("Service request not found");
                navigate('/dashboard');
            }
        } catch (error) {
            console.error("Error fetching lead:", error);
            toast.error("Failed to load details");
        } finally {
            setLoading(false);
        }
    }, [leadId, navigate]);

    useEffect(() => {
        fetchLeadDetails();
    }, [fetchLeadDetails]);

    const handleAcceptDraft = async () => {
        setActionLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.patch(`${apiUrl}/leads/${leadId}`, {
                status: 'UserAccepted',
                userMessage: 'Draft accepted by user. Please upload final return document.'
            });
            toast.success("Draft accepted successfully!");
            navigate('/dashboard');
        } catch (error) {
            toast.error("Failed to accept draft");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectDraft = async () => {
        setActionLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.patch(`${apiUrl}/leads/${leadId}`, { 
                status: 'InProgress',
                userMessage: 'Draft rejected by user. Please revise and re-upload draft.'
            });
            toast.success("Draft rejected. Admin will be notified.");
            navigate('/dashboard');
        } catch (error) {
            toast.error("Failed to reject draft");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Loader minimal={true} />;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--text)',
            paddingTop: 'clamp(80px, 12vw, 100px)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
            
            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Client Approval Portal</span>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Service ID: #{lead._id.slice(-6).toUpperCase()}</span>
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Review Your Service Draft</h1>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.8rem' }}>
                        <button 
                            onClick={handleRejectDraft}
                            disabled={actionLoading}
                            style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                padding: '0.7rem 1.5rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            <X size={18} /> I Reject This Draft
                        </button>
                        <button 
                            onClick={handleAcceptDraft}
                            disabled={actionLoading}
                            style={{
                                background: '#10b981',
                                border: 'none',
                                color: 'white',
                                padding: '0.7rem 1.5rem', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <Check size={18} /> Accept & Approve
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Document View */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden', height: '100vh', maxHeight: '700px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText size={18} color="#10b981" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedDoc?.name || "Draft Document"}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <a href={selectedDoc?.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ExternalLink size={14} /> Full Screen
                                </a>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {selectedDoc?.url ? (
                                <iframe 
                                    src={selectedDoc.url} 
                                    title="Draft Preview" 
                                    style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                                />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
                                    <FileText size={48} color="rgba(255,255,255,0.1)" />
                                    <div>
                                        <h3 style={{ marginBottom: '0.5rem' }}>Draft Ready for Download</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '300px' }}>Your service draft has been prepared. Please download it to review the details.</p>
                                    </div>
                                    <a href={selectedDoc?.url} download style={{ padding: '1rem 2rem', background: '#10b981', color: 'white', borderRadius: '15px', fontWeight: 800, textDecoration: 'none' }}>Download PDF Draft</a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <Sparkles size={20} color="#10b981" />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Advisor Summary</h3>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                                {lead.adminMessage || "Our team has completed the initial draft of your service. Please review the attached document carefully. If everything looks correct, click 'Accept & Approve' to proceed to the final step."}
                            </p>
                        </div>

                        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem' }}>Next Steps</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { icon: Check, text: 'Carefully review all details in the draft', done: true },
                                    { icon: Clock, text: 'Upon approval, we will generate the final return', done: false },
                                    { icon: ShieldCheck, text: 'Final documents will be available for download', done: false }
                                ].map((step, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step.done ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <step.icon size={14} color={step.done ? '#10b981' : 'rgba(255,255,255,0.3)'} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: step.done ? 'white' : 'rgba(255,255,255,0.4)' }}>{step.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(67, 97, 238, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Info size={20} color="#4361ee" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Need Help?</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Contact Support</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DraftReview;
