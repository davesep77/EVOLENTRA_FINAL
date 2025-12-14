import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData } from '../services/dashboardService';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalInvested: 0,
        totalROI: 0,
        referralEarnings: 0,
        binaryEarnings: 0,
        walletBalance: 0,
    });
    const [recentInvestments, setRecentInvestments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const data = await getDashboardData(user.id);
            setStats({
                totalInvested: data.totalInvested,
                totalROI: data.totalROI,
                referralEarnings: data.referralEarnings,
                binaryEarnings: data.binaryEarnings,
                walletBalance: data.walletBalance,
            });
            setRecentInvestments(data.recentInvestments);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div className="glass-card text-center">
                        <h3>Loading dashboard...</h3>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <div className="container">
                    <div className="dashboard-header fade-in">
                        <h1>Dashboard</h1>
                        <p className="text-muted">Welcome back! Here's your investment overview.</p>
                    </div>

                    <div className="stats-grid fade-in">
                        <div className="stat-card">
                            <div className="stat-icon">💰</div>
                            <div className="stat-value">${stats.totalInvested.toFixed(2)}</div>
                            <div className="stat-label">Total Invested</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">📈</div>
                            <div className="stat-value">${stats.totalROI.toFixed(2)}</div>
                            <div className="stat-label">ROI Earnings</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">👥</div>
                            <div className="stat-value">${stats.referralEarnings.toFixed(2)}</div>
                            <div className="stat-label">Referral Income</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">🌳</div>
                            <div className="stat-value">${stats.binaryEarnings.toFixed(2)}</div>
                            <div className="stat-label">Binary Income</div>
                        </div>

                        <div className="stat-card highlight">
                            <div className="stat-icon">💳</div>
                            <div className="stat-value">${stats.walletBalance.toFixed(2)}</div>
                            <div className="stat-label">Wallet Balance</div>
                        </div>
                    </div>

                    <div className="dashboard-content">
                        <div className="glass-card fade-in">
                            <div className="card-header">
                                <h3>Recent Investments</h3>
                                <a href="/investments" className="btn btn-outline btn-sm">View All</a>
                            </div>

                            {recentInvestments.length === 0 ? (
                                <div className="empty-state">
                                    <p>No investments yet</p>
                                    <a href="/investments" className="btn btn-primary">Start Investing</a>
                                </div>
                            ) : (
                                <div className="investments-list">
                                    {recentInvestments.map((investment) => (
                                        <div key={investment.id} className="investment-item">
                                            <div className="investment-info">
                                                <div className="investment-plan">{investment.plan_name}</div>
                                                <div className="investment-amount">${investment.amount.toFixed(2)}</div>
                                            </div>
                                            <div className="investment-stats">
                                                <div className="stat-small">
                                                    <span className="label">ROI Rate:</span>
                                                    <span className="value">{investment.roi_rate}%</span>
                                                </div>
                                                <div className="stat-small">
                                                    <span className="label">Earned:</span>
                                                    <span className="value text-success">${investment.total_roi_earned.toFixed(2)}</span>
                                                </div>
                                                <div className="stat-small">
                                                    <span className="label">Days:</span>
                                                    <span className="value">{investment.days_elapsed} / {investment.days_elapsed + investment.days_remaining}</span>
                                                </div>
                                            </div>
                                            <div className={`investment-status status-${investment.status}`}>
                                                {investment.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="glass-card fade-in">
                            <h3>Quick Actions</h3>
                            <div className="quick-actions">
                                <a href="/investments" className="action-card">
                                    <span className="action-icon">💰</span>
                                    <span className="action-title">New Investment</span>
                                    <span className="action-desc">Start earning ROI today</span>
                                </a>
                                <a href="/wallet" className="action-card">
                                    <span className="action-icon">💸</span>
                                    <span className="action-title">Withdraw</span>
                                    <span className="action-desc">Request withdrawal</span>
                                </a>
                                <a href="/referrals" className="action-card">
                                    <span className="action-icon">🔗</span>
                                    <span className="action-title">Refer Friends</span>
                                    <span className="action-desc">Earn 9% commission</span>
                                </a>
                                <a href="/binary" className="action-card">
                                    <span className="action-icon">🌳</span>
                                    <span className="action-title">Binary Tree</span>
                                    <span className="action-desc">View your network</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
