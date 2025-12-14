import { useState, useEffect } from 'react';
import MultiCurrencyDisplay from './MultiCurrencyDisplay';
import './InvestmentCalculator.css';

export default function InvestmentCalculator({ plans, onInvest }) {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [amount, setAmount] = useState(1000);
    const [calculations, setCalculations] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (plans && plans.length > 0) {
            setSelectedPlan(plans[0]);
        }
    }, [plans]);

    useEffect(() => {
        if (selectedPlan && amount >= selectedPlan.min_amount) {
            calculateROI();
        }
    }, [selectedPlan, amount]);

    const calculateROI = async () => {
        if (!selectedPlan || amount < selectedPlan.min_amount) return;

        setLoading(true);
        try {
            const response = await fetch('/api/investments/calculator.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan_id: selectedPlan.id,
                    amount: amount,
                    referrals: 0,
                    binary_volume: 0
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCalculations(data.data);
            }
        } catch (error) {
            console.error('Calculator error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        setAmount(value);
    };

    const setQuickAmount = (value) => {
        setAmount(value);
    };

    if (!selectedPlan) return null;

    return (
        <div className="calculator-widget glass-card">
            <div className="calculator-header">
                <h3>💰 ROI Calculator</h3>
                <p className="text-muted">Calculate your potential earnings</p>
            </div>

            <div className="calculator-body">
                {/* Plan Selector */}
                <div className="form-group">
                    <label className="form-label">Select Plan</label>
                    <div className="plan-selector">
                        {plans.map((plan) => (
                            <button
                                key={plan.id}
                                className={`plan-btn ${selectedPlan.id === plan.id ? 'active' : ''}`}
                                onClick={() => setSelectedPlan(plan)}
                            >
                                {plan.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Input */}
                <div className="form-group">
                    <label className="form-label">
                        Investment Amount
                        <span className="text-muted ml-2">
                            (${selectedPlan.min_amount.toLocaleString()} - ${selectedPlan.max_amount.toLocaleString()})
                        </span>
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        value={amount}
                        onChange={handleAmountChange}
                        min={selectedPlan.min_amount}
                        max={selectedPlan.max_amount}
                        step="100"
                    />

                    {/* Quick Amount Buttons */}
                    <div className="quick-amounts">
                        {[100, 500, 1000, 5000, 10000].map((value) => (
                            value >= selectedPlan.min_amount && value <= selectedPlan.max_amount && (
                                <button
                                    key={value}
                                    className="quick-btn"
                                    onClick={() => setQuickAmount(value)}
                                >
                                    ${value.toLocaleString()}
                                </button>
                            )
                        ))}
                    </div>
                </div>

                {/* Amount Slider */}
                <div className="form-group">
                    <input
                        type="range"
                        className="amount-slider"
                        min={selectedPlan.min_amount}
                        max={Math.min(selectedPlan.max_amount, 50000)}
                        value={amount}
                        onChange={handleAmountChange}
                        step="100"
                    />
                </div>

                {/* Multi-Currency Display */}
                {amount >= selectedPlan.min_amount && (
                    <MultiCurrencyDisplay
                        usdAmount={amount}
                        label="Investment Amount in Crypto"
                        showRates={true}
                    />
                )}

                {/* Calculations Display */}
                {calculations && !loading && (
                    <div className="calculations-display">
                        <div className="calc-grid">
                            <div className="calc-item highlight">
                                <span className="calc-label">Daily ROI</span>
                                <span className="calc-value">
                                    ${calculations.daily_roi.min.toFixed(2)} - ${calculations.daily_roi.max.toFixed(2)}
                                </span>
                            </div>

                            <div className="calc-item">
                                <span className="calc-label">Weekly ROI</span>
                                <span className="calc-value">
                                    ${calculations.weekly_roi.avg.toFixed(2)}
                                </span>
                            </div>

                            <div className="calc-item">
                                <span className="calc-label">Monthly ROI</span>
                                <span className="calc-value">
                                    ${calculations.monthly_roi.avg.toFixed(2)}
                                </span>
                            </div>

                            <div className="calc-item">
                                <span className="calc-label">Total ROI ({selectedPlan.duration_days} days)</span>
                                <span className="calc-value">
                                    ${calculations.total_roi.avg.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="total-return">
                            <div className="return-breakdown">
                                <div className="breakdown-item">
                                    <span>Investment Amount</span>
                                    <span>${calculations.investment_amount.toFixed(2)}</span>
                                </div>
                                <div className="breakdown-item">
                                    <span>Total ROI Earnings</span>
                                    <span className="text-success">+${calculations.total_roi.avg.toFixed(2)}</span>
                                </div>
                                {calculations.capital_return > 0 && (
                                    <div className="breakdown-item">
                                        <span>Capital Return</span>
                                        <span className="text-success">+${calculations.capital_return.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="breakdown-divider"></div>
                                <div className="breakdown-item total">
                                    <span>Total Return</span>
                                    <span className="text-primary">${calculations.total_return.avg.toFixed(2)}</span>
                                </div>
                                <div className="breakdown-item">
                                    <span>ROI Percentage</span>
                                    <span className="text-success">+{calculations.roi_percentage.avg.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Return in All Currencies */}
                        <div className="multi-currency-section">
                            <h4 className="section-title">Total Return in Crypto</h4>
                            <MultiCurrencyDisplay
                                usdAmount={calculations.total_return.avg}
                                showRates={false}
                            />
                        </div>

                        {/* Invest Button */}
                        {amount >= selectedPlan.min_amount && amount <= selectedPlan.max_amount && (
                            <button
                                className="btn btn-primary btn-block mt-3"
                                onClick={() => onInvest(selectedPlan, amount)}
                            >
                                Invest ${amount.toLocaleString()} in {selectedPlan.name}
                            </button>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="text-center py-3">
                        <p className="text-muted">Calculating...</p>
                    </div>
                )}

                {amount < selectedPlan.min_amount && (
                    <div className="alert alert-warning mt-3">
                        Minimum investment for {selectedPlan.name} is ${selectedPlan.min_amount.toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
