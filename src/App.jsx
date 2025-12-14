import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Investments from './pages/Investments';
import Binary from './pages/Binary';
import Wallet from './pages/Wallet';
import Referrals from './pages/Referrals';
import Admin from './pages/Admin';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="glass-card">
                    <h3>Loading...</h3>
                </div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="glass-card">
                    <h3>Loading...</h3>
                </div>
            </div>
        );
    }

    return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />
            <Route path="/register" element={
                <PublicRoute>
                    <Register />
                </PublicRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            <Route path="/investments" element={
                <ProtectedRoute>
                    <Investments />
                </ProtectedRoute>
            } />
            <Route path="/binary" element={
                <ProtectedRoute>
                    <Binary />
                </ProtectedRoute>
            } />
            <Route path="/wallet" element={
                <ProtectedRoute>
                    <Wallet />
                </ProtectedRoute>
            } />
            <Route path="/referrals" element={
                <ProtectedRoute>
                    <Referrals />
                </ProtectedRoute>
            } />
            <Route path="/admin" element={
                <ProtectedRoute>
                    <Admin />
                </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
