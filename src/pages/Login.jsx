import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Login() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background"></div>

            <div className="auth-content">
                <div className="auth-card glass-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <span className="logo-icon">⚡</span>
                            <h1 className="logo-text">Evolentra</h1>
                        </div>
                        <h2>Welcome Back</h2>
                        <p className="auth-subtitle">Sign in to your account to continue</p>
                    </div>

                    {searchParams.get('registered') && (
                        <div className="alert alert-success">
                            Registration successful! Please login to continue.
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Don't have an account? <Link to="/register" className="auth-link">Create one</Link></p>
                    </div>
                </div>

                <div className="auth-info">
                    <div className="info-card glass-card">
                        <h3>🚀 Start Investing Today</h3>
                        <p>Join thousands of investors earning daily ROI with Evolentra's proven investment platform.</p>
                    </div>
                    <div className="info-card glass-card">
                        <h3>💰 Multiple Income Streams</h3>
                        <p>Earn through ROI, referral commissions, and binary matching bonuses.</p>
                    </div>
                    <div className="info-card glass-card">
                        <h3>🔒 Secure & Transparent</h3>
                        <p>Your investments are protected with industry-leading security measures.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
