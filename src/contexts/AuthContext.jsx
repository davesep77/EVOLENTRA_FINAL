import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            (async () => {
                if (session?.user) {
                    await fetchUserProfile(session.user.id);
                } else {
                    setUser(null);
                }
            })();
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    const login = async (email, password) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            await fetchUserProfile(authData.user.id);

            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', authData.user.id);

            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const register = async (userData) => {
        try {
            const { email, password, firstName, lastName, phone, referralCode } = userData;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            let referrerId = null;
            if (referralCode) {
                const { data: referrer } = await supabase
                    .from('users')
                    .select('id')
                    .eq('referral_code', referralCode)
                    .maybeSingle();

                if (referrer) {
                    referrerId = referrer.id;
                }
            }

            const newReferralCode = generateReferralCode();

            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone || null,
                    referrer_id: referrerId,
                    referral_code: newReferralCode,
                    role: 'investor',
                    status: 'active',
                    email_verified: true,
                });

            if (profileError) throw profileError;

            await supabase
                .from('binary_tree')
                .insert({
                    user_id: authData.user.id,
                    parent_id: referrerId,
                });

            const currencies = ['BTC', 'ETH', 'USDT', 'TRX', 'XRP'];
            const walletInserts = currencies.map(currency => ({
                user_id: authData.user.id,
                currency,
                balance: 0,
                roi_balance: 0,
                referral_balance: 0,
                binary_balance: 0,
                total_deposited: 0,
                total_withdrawn: 0,
            }));

            await supabase.from('wallets').insert(walletInserts);

            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
