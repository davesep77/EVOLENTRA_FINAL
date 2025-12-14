import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

export default function Referrals() {
    const { user } = useAuth();
    const [referralCode, setReferralCode] = useState('');
    const [referralLink, setReferralLink] = useState('');

    useEffect(() => {
        // In a real app, fetch from API
        const code = user?.referral_code || 'EVO12345678';
        setReferralCode(code);
        setReferralLink(`${window.location.origin}/register?ref=${code}`);
    }, [user]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        alert('Referral link copied to clipboard!');
    };

    return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '3rem 0' }}>
                <div className="page-header fade-in">
                    <h1>Referral Program</h1>
                    <p className="text-muted">Earn 9% commission on every referral investment</p>
                </div>

                <div className="glass-card fade-in">
                    <h3>Your Referral Link</h3>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={referralLink}
                            readOnly
                            style={{ flex: 1 }}
                        />
                        <button onClick={copyToClipboard} className="btn btn-primary">
                            Copy Link
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h4>Your Referral Code</h4>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '800',
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginTop: '1rem'
                        }}>
                            {referralCode}
                        </div>
                    </div>
                </div>

                <div className="glass-card fade-in mt-4">
                    <h3>How It Works</h3>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <strong>1. Share Your Link</strong>
                            <p className="text-muted">Share your unique referral link with friends and family</p>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <strong>2. They Invest</strong>
                            <p className="text-muted">When they register and make an investment using your link</p>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <strong>3. You Earn</strong>
                            <p className="text-muted">Receive 9% commission instantly on their investment amount</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
