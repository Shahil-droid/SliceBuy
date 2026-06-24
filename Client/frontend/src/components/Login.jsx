import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Store, ShoppingBag } from 'lucide-react';
import './Auth.css';

const Login = () => {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const nextUrl = searchParams.get('next');

    const [role, setRole] = useState('buyer'); // 'buyer' | 'seller'
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.password) {
            setError('Please fill in all fields.');
            return;
        }

        const result = await login(form);
        if (result.success) {
            navigate(nextUrl || '/');
        } else {
            setError(result.error);
        }
    };

    const isSeller = role === 'seller';

    return (
        <div className={`auth-page ${isSeller ? 'auth-page--seller' : ''}`} id="login-page">
            <div className="auth-page__bg-orb auth-page__bg-orb--1" />
            <div className="auth-page__bg-orb auth-page__bg-orb--2" />

            <div className="auth-card">
                <div className="auth-card__logo">
                    <Link to="/">Slice<span className="text-gradient-accent">Buy</span></Link>
                </div>

                {/* Role Picker */}
                <div className="auth-role-picker">
                    <button
                        type="button"
                        className={`auth-role-picker__btn ${role === 'buyer' ? 'auth-role-picker__btn--active' : ''}`}
                        onClick={() => setRole('buyer')}
                    >
                        <ShoppingBag size={20} />
                        <span>Buyer</span>
                    </button>
                    <button
                        type="button"
                        className={`auth-role-picker__btn auth-role-picker__btn--seller ${role === 'seller' ? 'auth-role-picker__btn--active' : ''}`}
                        onClick={() => setRole('seller')}
                    >
                        <Store size={20} />
                        <span>Seller</span>
                    </button>
                </div>

                <h1 className="auth-card__title">
                    {isSeller ? 'Seller Login' : 'Welcome Back'}
                </h1>
                <p className="auth-card__subtitle">
                    {isSeller
                        ? 'Sign in to manage your store and orders'
                        : 'Sign in to shop and join order rooms'}
                </p>

                <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                    {error && <div className="auth-form__error">{error}</div>}

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="login-username">
                            {isSeller ? 'Store / Username' : 'Username'}
                        </label>
                        <div className="auth-form__input-icon-wrapper">
                            {isSeller ? <Store size={18} className="auth-form__input-icon" /> : <Mail size={18} className="auth-form__input-icon" />}
                            <input
                                type="text" id="login-username" name="username"
                                className="auth-form__input"
                                placeholder={isSeller ? 'Your store username' : 'Enter your username'}
                                value={form.username} onChange={handleChange}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="login-password">Password</label>
                        <div className="auth-form__input-icon-wrapper">
                            <Lock size={18} className="auth-form__input-icon" />
                            <input
                                type="password" id="login-password" name="password"
                                className="auth-form__input"
                                placeholder="Enter your password"
                                value={form.password} onChange={handleChange}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <div className="auth-form__links">
                        <div />
                        <Link to="/forgot-password" className="auth-form__link">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-lg auth-form__submit ${isSeller ? 'btn-seller' : 'btn-primary'}`}
                        disabled={loading}
                        id="login-submit-btn"
                    >
                        {loading ? 'Signing in...' : <>{isSeller ? 'Sign In as Seller' : 'Sign In'} <LogIn size={18} /></>}
                    </button>
                </form>

                <div className="auth-card__footer">
                    Don't have an account?{' '}
                    <Link to="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
