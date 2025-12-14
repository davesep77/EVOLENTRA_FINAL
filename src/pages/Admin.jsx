import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWithdrawalRequests, processWithdrawalRequest } from '../services/adminService';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Admin() {
    const { user } = useAuth();
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });

    useEffect(() => {
        if (user?.id) {
            fetchWithdrawals();
        }
    }, [user]);

    const fetchWithdrawals = async () => {
        try {
            const withdrawalList = await getWithdrawalRequests();
            setWithdrawals(withdrawalList);

            const pending = withdrawalList.filter(w => w.status === 'pending').length;
            const approved = withdrawalList.filter(w => w.status === 'approved' || w.status === 'completed').length;
            const rejected = withdrawalList.filter(w => w.status === 'rejected').length;

            setStats({
                pending,
                approved,
                rejected,
                total: withdrawalList.length
            });
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawal = async (id, action, notes = '') => {
        if (!confirm(`Are you sure you want to ${action} this withdrawal?`)) {
            return;
        }

        setProcessing(id);

        try {
            await processWithdrawalRequest(id, action, user.id, notes);
            alert(`Withdrawal ${action}d successfully!`);
            fetchWithdrawals();
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            alert(error.message || 'An error occurred. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { background: 'hsl(45, 100%, 50%)', color: 'hsl(45, 100%, 10%)' },
            approved: { background: 'hsl(150, 70%, 50%)', color: 'hsl(150, 100%, 10%)' },
            rejected: { background: 'hsl(0, 70%, 50%)', color: 'white' },
            completed: { background: 'hsl(200, 70%, 50%)', color: 'white' }
        };

        return (
            <span style={{
                ...styles[status],
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                textTransform: 'uppercase'
            }}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚙️ Admin Panel</h1>
                    <p className="text-muted">Manage withdrawal requests and platform operations</p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid fade-in" style={{ marginBottom: '2rem' }}>
                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Pending</h3>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'hsl(45, 100%, 60%)' }}>{stats.pending}</h2>
                    </div>

                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Approved</h3>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'hsl(150, 70%, 60%)' }}>{stats.approved}</h2>
                    </div>

                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Rejected</h3>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'hsl(0, 70%, 60%)' }}>{stats.rejected}</h2>
                    </div>

                    <div className="glass-card" style={{ background: 'linear-gradient(135deg, hsl(250, 70%, 25%) 0%, hsl(280, 70%, 30%) 100%)' }}>
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Requests</h3>
                        <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{stats.total}</h2>
                    </div>
                </div>

                {/* Withdrawals Table */}
                <div className="glass-card fade-in" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Withdrawal Requests</h3>

                    {withdrawals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                            <p>No withdrawal requests yet</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid hsl(250, 30%, 30%)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Currency</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Fee</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Net Amount</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Wallet</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawals.map((withdrawal) => (
                                        <tr key={withdrawal.id} style={{ borderBottom: '1px solid hsl(250, 30%, 25%)' }}>
                                            <td style={{ padding: '1rem' }}>#{withdrawal.id}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{withdrawal.user_name}</div>
                                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{withdrawal.user_email}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{withdrawal.currency}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${parseFloat(withdrawal.amount).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', opacity: 0.7 }}>
                                                ${parseFloat(withdrawal.fee).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'hsl(150, 70%, 60%)' }}>
                                                ${parseFloat(withdrawal.net_amount).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                {withdrawal.wallet_address.substring(0, 10)}...
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {getStatusBadge(withdrawal.status)}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                {formatDate(withdrawal.created_at)}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {withdrawal.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleWithdrawal(withdrawal.id, 'approve')}
                                                            disabled={processing === withdrawal.id}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: 'hsl(150, 70%, 40%)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleWithdrawal(withdrawal.id, 'reject')}
                                                            disabled={processing === withdrawal.id}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: 'hsl(0, 70%, 40%)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {withdrawal.status !== 'pending' && (
                                                    <div style={{ textAlign: 'center', opacity: 0.5 }}>—</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Admin Info */}
                <div className="glass-card fade-in" style={{ marginTop: '2rem', animationDelay: '0.2s' }}>
                    <h3>ℹ️ Admin Guidelines</h3>
                    <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>Review each withdrawal request carefully before approval</li>
                        <li>Verify wallet addresses are valid for the selected currency</li>
                        <li>Check user account status and available balance</li>
                        <li>Process approved withdrawals within 24-48 hours</li>
                        <li>Document rejection reasons for user transparency</li>
                        <li>Monitor for suspicious withdrawal patterns</li>
                    </ul>
                </div>
            </div>
        </>
    );
}
