import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import InvestmentCalculator from '../components/InvestmentCalculator';
import MultiCurrencyDisplay from '../components/MultiCurrencyDisplay';
import './Investments.css';

export default function Investments() {
    const [plans, setPlans] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansRes, investRes] = await Promise.all([
                fetch('/api/investments/plans.php'),
                fetch('/api/investments/user_investments.php')
            ]);

            const plansData = await plansRes.json();
            const investData = await investRes.json();

            if (plansData.success) {
                setPlans(plansData.data.plans);
            }

            if (investData.success) {
                setInvestments(investData.data.investments);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvest = (plan) => {
        setSelectedPlan(plan);
        setAmount('');
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const investAmount = parseFloat(amount);

        if (investAmount < selectedPlan.min_amount || investAmount > selectedPlan.max_amount) {
            setError(`Amount must be between $${selectedPlan.min_amount} and $${selectedPlan.max_amount}`);
            return;
        }

        try {
            const response = await fetch('/api/investments/create.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan_id: selectedPlan.id,
                    amount: investAmount,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Investment failed');
            }

            setSuccess('Investment created successfully!');
            setShowModal(false);
            fetchData(); // Refresh data
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div className="glass-card text-center">
                        <h3>Loading...</h3>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="investments-container">
                <div className="container">
                    <div className="page-header fade-in">
                        <h1>Investment Plans</h1>
                        <p className="text-muted">Choose a plan and start earning daily ROI</p>
                    </div>

                    {success && (
                        <div className="alert alert-success fade-in">
                            {success}
                        </div>
                    )}

                    {/* Interactive ROI Calculator */}
                    <InvestmentCalculator
                        plans={plans}
                        onInvest={(plan, amount) => {
                            setSelectedPlan(plan);
                            setAmount(amount.toString());
                            setShowModal(true);
                        }}
                    />

                    <div className="plans-grid fade-in">
                        {plans.map((plan) => (
                            <div key={plan.id} className={`plan-card glass-card ${plan.name.toLowerCase()}`}>
                                <div className="plan-badge">{plan.name}</div>
                                <div className="plan-roi">
                                    <span className="roi-value">{plan.roi_rate_min}% - {plan.roi_rate_max}%</span>
                                    <span className="roi-label">Daily ROI</span>
                                </div>
                                <div className="plan-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Investment Range</span>
                                        <span className="detail-value">${plan.min_amount.toLocaleString()} - ${plan.max_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Duration</span>
                                        <span className="detail-value">{plan.duration_days} days</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Referral Commission</span>
                                        <span className="detail-value">{plan.referral_commission}%</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Binary Commission</span>
                                        <span className="detail-value">{plan.binary_commission}%</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Capital Return</span>
                                        <span className="detail-value">{plan.capital_return ? '✓ Yes' : '✗ No'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleInvest(plan)} className="btn btn-primary btn-block">
                                    Invest Now
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card mt-4 fade-in">
                        <h3>My Investments</h3>
                        {investments.length === 0 ? (
                            <div className="empty-state">
                                <p>No investments yet. Start investing to earn daily ROI!</p>
                            </div>
                        ) : (
                            <div className="investments-table">
                                {investments.map((investment) => (
                                    <div key={investment.id} className="investment-row">
                                        <div className="inv-col">
                                            <span className="col-label">Plan</span>
                                            <span className="col-value plan-name">{investment.plan_name}</span>
                                        </div>
                                        <div className="inv-col">
                                            <span className="col-label">Amount</span>
                                            <span className="col-value">${investment.amount.toFixed(2)}</span>
                                        </div>
                                        <div className="inv-col">
                                            <span className="col-label">ROI Rate</span>
                                            <span className="col-value">{investment.roi_rate}%</span>
                                        </div>
                                        <div className="inv-col">
                                            <span className="col-label">Total Earned</span>
                                            <span className="col-value text-success">${investment.total_roi_earned.toFixed(2)}</span>
                                        </div>
                                        <div className="inv-col">
                                            <span className="col-label">Progress</span>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${(investment.days_elapsed / (investment.days_elapsed + investment.days_remaining)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="col-value-sm">{investment.days_elapsed} / {investment.days_elapsed + investment.days_remaining} days</span>
                                        </div>
                                        <div className="inv-col">
                                            <span className={`status-badge status-${investment.status}`}>
                                                {investment.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Invest in {selectedPlan.name}</h3>
                        <p className="text-muted">Choose amount and start earning daily ROI</p>

                        {error && (
                            <div className="alert alert-error">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Quick Amount Buttons */}
                            <div className="quick-amounts-modal">
                                {[100, 500, 1000, 5000, 10000].map((value) => (
                                    value >= selectedPlan.min_amount && value <= selectedPlan.max_amount && (
                                        <button
                                            key={value}
                                            type="button"
                                            className={`quick-amount-btn ${parseFloat(amount) === value ? 'active' : ''}`}
                                            onClick={() => setAmount(value.toString())}
                                        >
                                            ${value.toLocaleString()}
                                        </button>
                                    )
                                ))}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Investment Amount</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder={`Min: $${selectedPlan.min_amount} - Max: $${selectedPlan.max_amount}`}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    step="0.01"
                                    required
                                />
                            </div>

                            {/* ROI Preview */}
                            {amount && parseFloat(amount) >= selectedPlan.min_amount && parseFloat(amount) <= selectedPlan.max_amount && (
                                <div className="roi-preview">
                                    <h4>Expected Earnings</h4>
                                    <div className="preview-grid">
                                        <div className="preview-item">
                                            <span className="preview-label">Daily ROI</span>
                                            <span className="preview-value">
                                                ${((parseFloat(amount) * selectedPlan.roi_rate_min) / 100).toFixed(2)} -
                                                ${((parseFloat(amount) * selectedPlan.roi_rate_max) / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="preview-item">
                                            <span className="preview-label">Monthly ROI (30 days)</span>
                                            <span className="preview-value">
                                                ${((parseFloat(amount) * ((selectedPlan.roi_rate_min + selectedPlan.roi_rate_max) / 2) / 100) * 30).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="preview-item">
                                            <span className="preview-label">Total ROI ({selectedPlan.duration_days} days)</span>
                                            <span className="preview-value text-success">
                                                ${((parseFloat(amount) * ((selectedPlan.roi_rate_min + selectedPlan.roi_rate_max) / 2) / 100) * selectedPlan.duration_days).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="preview-item highlight">
                                            <span className="preview-label">Total Return</span>
                                            <span className="preview-value text-primary">
                                                ${(parseFloat(amount) + ((parseFloat(amount) * ((selectedPlan.roi_rate_min + selectedPlan.roi_rate_max) / 2) / 100) * selectedPlan.duration_days)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Multi-Currency Display in Modal */}
                                    <div className="modal-currency-section">
                                        <h5>Total Return in Crypto</h5>
                                        <MultiCurrencyDisplay
                                            usdAmount={parseFloat(amount) + ((parseFloat(amount) * ((selectedPlan.roi_rate_min + selectedPlan.roi_rate_max) / 2) / 100) * selectedPlan.duration_days)}
                                            showRates={false}
                                        />
                                    </div>

                                    <div className="wallet-notice">
                                        <span className="notice-icon">💰</span>
                                        <span>Investment amount will be credited to your wallet immediately</span>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Confirm Investment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
