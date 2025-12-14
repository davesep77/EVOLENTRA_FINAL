import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Register() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        referral_code: searchParams.get('ref') || '',
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

        // Validate passwords match
        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Validate password strength
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            // Prepare data - remove empty referral code
            const submitData = { ...formData };
            if (!submitData.referral_code || submitData.referral_code.trim() === '') {
                delete submitData.referral_code;
            }

            await register(submitData);
            navigate('/login?registered=true');
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
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
                        <h2>Create Account</h2>
                        <p className="auth-subtitle">Join the future of smart investing</p>
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="first_name" className="form-label">First Name</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    className="form-input"
                                    placeholder="John"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="last_name" className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    className="form-input"
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">Phone Number (Optional)</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                className="form-input"
                                placeholder="+1234567890"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="referral_code" className="form-label">Referral Code (Optional)</label>
                            <input
                                type="text"
                                id="referral_code"
                                name="referral_code"
                                className="form-input"
                                placeholder="Enter referral code"
                                value={formData.referral_code}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    className="form-input"
                                    placeholder="Min. 8 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirm_password"
                                    name="confirm_password"
                                    className="form-input"
                                    placeholder="Confirm password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="disclaimer">
                            <p>⚠️ By registering, you acknowledge that investments carry risk. Past performance does not guarantee future results.</p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
