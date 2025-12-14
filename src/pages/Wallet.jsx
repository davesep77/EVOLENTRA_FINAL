import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Wallet() {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({
        currency: 'USDT',
        amount: '',
        wallet_address: ''
    });

    useEffect(() => {
        fetchWalletBalance();
    }, []);

    const fetchWalletBalance = async () => {
        try {
            const response = await fetch('/api/wallet/balance.php', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                setWallets(data.data.wallets || []);
            }
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setWithdrawing(true);

        try {
            const response = await fetch('/api/wallet/withdraw.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(withdrawForm)
            });

            const data = await response.json();

            if (data.success) {
                alert('Withdrawal request submitted successfully! It will be processed within 24-48 hours.');
                setShowWithdrawModal(false);
                setWithdrawForm({ currency: 'USDT', amount: '', wallet_address: '' });
                fetchWalletBalance();
            } else {
                alert(data.message || 'Failed to submit withdrawal request');
            }
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setWithdrawing(false);
        }
    };

    const getTotalBalance = () => {
        return wallets.reduce((sum, wallet) => sum + parseFloat(wallet.balance || 0), 0);
    };

    const getCurrencyIcon = (currency) => {
        const icons = {
            'BTC': '₿',
            'ETH': 'Ξ',
            'USDT': '₮',
            'TRX': 'T',
            'XRP': 'X'
        };
        return icons[currency] || currency;
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div className="glass-card fade-in">
                        <h1>Loading...</h1>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '3rem 0' }}>
                {/* Header */}
                <div className="fade-in" style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰 Wallet</h1>
                    <p className="text-muted">Manage your crypto wallets and withdrawals</p>
                </div>

                {/* Total Balance Card */}
                <div className="glass-card fade-in" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, hsl(250, 70%, 25%) 0%, hsl(280, 70%, 30%) 100%)' }}>
                    <h2 style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '0.5rem' }}>Total Balance</h2>
                    <h1 style={{ fontSize: '3rem', margin: '0' }}>${getTotalBalance().toFixed(2)}</h1>
                    <button
                        className="btn-primary"
                        style={{ marginTop: '1.5rem' }}
                        onClick={() => setShowWithdrawModal(true)}
                    >
                        💸 Request Withdrawal
                    </button>
                </div>

                {/* Wallet Balances Grid */}
                <div className="stats-grid fade-in" style={{ animationDelay: '0.1s' }}>
                    {wallets.map((wallet, index) => (
                        <div key={wallet.currency} className="glass-card" style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    fontSize: '2rem',
                                    width: '50px',
                                    height: '50px',
                                    background: 'hsl(250, 70%, 30%)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {getCurrencyIcon(wallet.currency)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0 }}>{wallet.currency}</h3>
                                    <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                                        {wallet.currency === 'BTC' ? 'Bitcoin' :
                                            wallet.currency === 'ETH' ? 'Ethereum' :
                                                wallet.currency === 'USDT' ? 'Tether' :
                                                    wallet.currency === 'TRX' ? 'Tron' :
                                                        wallet.currency === 'XRP' ? 'Ripple' : wallet.currency}
                                    </p>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-muted">Total Balance</span>
                                    <span style={{ fontWeight: 'bold' }}>${parseFloat(wallet.balance || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-muted">ROI Balance</span>
                                    <span>${parseFloat(wallet.roi_balance || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-muted">Referral</span>
                                    <span>${parseFloat(wallet.referral_balance || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Binary</span>
                                    <span>${parseFloat(wallet.binary_balance || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Withdrawal Info */}
                <div className="glass-card fade-in" style={{ marginTop: '2rem', animationDelay: '0.3s' }}>
                    <h3>📋 Withdrawal Information</h3>
                    <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
                        <li>Minimum withdrawal: $15</li>
                        <li>Withdrawal fee: 7%</li>
                        <li>ROI withdrawals: Only on Saturdays</li>
                        <li>Commission withdrawals: Daily</li>
                        <li>Supported currencies: USDT, TRX</li>
                        <li>Processing time: 24-48 hours</li>
                    </ul>
                </div>

                {/* Withdrawal Modal */}
                {showWithdrawModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }}>
                        <div className="glass-card" style={{ maxWidth: '500px', width: '100%' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>💸 Request Withdrawal</h2>

                            <form onSubmit={handleWithdraw}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Currency</label>
                                    <select
                                        value={withdrawForm.currency}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, currency: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'hsl(250, 30%, 15%)',
                                            border: '1px solid hsl(250, 30%, 25%)',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                        required
                                    >
                                        <option value="USDT">USDT</option>
                                        <option value="TRX">TRX</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Amount (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="15"
                                        value={withdrawForm.amount}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'hsl(250, 30%, 15%)',
                                            border: '1px solid hsl(250, 30%, 25%)',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                        placeholder="Minimum $15"
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Wallet Address</label>
                                    <input
                                        type="text"
                                        value={withdrawForm.wallet_address}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, wallet_address: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'hsl(250, 30%, 15%)',
                                            border: '1px solid hsl(250, 30%, 25%)',
                                            borderRadius: '8px',
                                            color: 'white'
                                        }}
                                        placeholder="Your wallet address"
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowWithdrawModal(false)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            background: 'hsl(250, 30%, 25%)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={withdrawing}
                                        className="btn-primary"
                                        style={{ flex: 1 }}
                                    >
                                        {withdrawing ? 'Processing...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
