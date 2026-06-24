import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    const isAuthenticated = !!user;
    const isSeller = user?.is_seller ?? false;
    const isAdmin = user?.is_staff ?? false;

    // ── Register ──────────────────────────────────────────────
    const register = async (userData) => {
        setLoading(true);
        try {
            const res = await api.post('/users/register/', userData);
            const { user: newUser, tokens } = res.data;
            localStorage.setItem('tokens', JSON.stringify(tokens));
            localStorage.setItem('user', JSON.stringify(newUser));
            setUser(newUser);
            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.username?.[0] ||
                err.response?.data?.email?.[0] ||
                err.response?.data?.password?.[0] ||
                err.response?.data?.detail ||
                'Registration failed. Please try again.';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    // ── Login ─────────────────────────────────────────────────
    const login = async (credentials) => {
        setLoading(true);
        try {
            // SimpleJWT returns access + refresh tokens
            const res = await api.post('/users/login/', credentials);
            const tokens = { access: res.data.access, refresh: res.data.refresh };
            localStorage.setItem('tokens', JSON.stringify(tokens));

            // Fetch real user profile
            const meRes = await api.get('/users/me/');
            const userData = meRes.data;

            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.detail ||
                'Invalid username or password.';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    // ── Bootstrap user on mount (refresh user data) ──────────
    useEffect(() => {
        const refreshUser = async () => {
            const tokens = localStorage.getItem('tokens');
            if (!tokens || !user) return;
            try {
                const res = await api.get('/users/me/');
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
            } catch {
                // Token expired — clear session
                localStorage.removeItem('tokens');
                localStorage.removeItem('user');
                setUser(null);
            }
        };
        refreshUser();
    }, []);

    // ── Logout ────────────────────────────────────────────────
    const logout = () => {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        setUser(null);
    };

    // ── Forgot Password ──────────────────────────────────────
    const requestPasswordReset = async (email) => {
        setLoading(true);
        try {
            await api.post('/users/password-reset/', { email });
            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.email?.[0] ||
                err.response?.data?.detail ||
                'Failed to send reset link.';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    // ── Reset Password Confirm (OTP) ─────────────────────────
    const confirmPasswordReset = async (email, otp, new_password) => {
        setLoading(true);
        try {
            await api.post('/users/password-reset-confirm/', {
                email,
                otp,
                new_password,
            });
            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.non_field_errors?.[0] ||
                err.response?.data?.detail ||
                'Invalid or expired OTP.';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        isAuthenticated,
        isSeller,
        isAdmin,
        loading,
        register,
        login,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
