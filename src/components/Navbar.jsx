import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar">
            <div className="container">
                <div className="navbar-content">
                    <Link to="/dashboard" className="navbar-brand">
                        <span className="brand-icon">⚡</span>
                        <span className="brand-text">Evolentra</span>
                    </Link>

                    <div className="navbar-menu">
                        <Link to="/dashboard" className="nav-link">
                            <span className="nav-icon">📊</span>
                            Dashboard
                        </Link>
                        <Link to="/investments" className="nav-link">
                            <span className="nav-icon">💰</span>
                            Investments
                        </Link>
                        <Link to="/referrals" className="nav-link">
                            <span className="nav-icon">👥</span>
                            Referrals
                        </Link>
                        <Link to="/binary" className="nav-link">
                            <span className="nav-icon">🌳</span>
                            Binary Tree
                        </Link>
                        <Link to="/wallet" className="nav-link">
                            <span className="nav-icon">💳</span>
                            Wallet
                        </Link>
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="nav-link">
                                <span className="nav-icon">⚙️</span>
                                Admin
                            </Link>
                        )}
                    </div>

                    <div className="navbar-actions">
                        <div className="user-info">
                            <span className="user-name">{user?.first_name} {user?.last_name}</span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                        <button onClick={logout} className="btn btn-outline btn-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
