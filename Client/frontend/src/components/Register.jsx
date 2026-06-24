import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, UserPlus, Store, ShoppingBag } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const { register, loading } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('buyer'); // 'buyer' | 'seller'
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.email || !form.password) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        const result = await register({ ...form, is_seller: role === 'seller' });
        if (result.success) {
            navigate(role === 'seller' ? '/seller/dashboard' : '/');
        } else {
            setError(result.error);
        }
    };

    const isSeller = role === 'seller';

    return (
        <div className={`auth-page ${isSeller ? 'auth-page--seller' : ''}`} id="register-page">
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
                    {isSeller ? 'Start Selling' : 'Join SliceBuy'}
                </h1>
                <p className="auth-card__subtitle">
                    {isSeller
                        ? 'Create a seller account to list products and grow your business'
                        : 'Create a buyer account to shop and split orders with friends'}
                </p>

                <form className="auth-form" onSubmit={handleSubmit} id="register-form">
                    {error && <div className="auth-form__error">{error}</div>}

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="reg-username">
                            {isSeller ? 'Store Name *' : 'Username *'}
                        </label>
                        <div className="auth-form__input-icon-wrapper">
                            {isSeller ? <Store size={18} className="auth-form__input-icon" /> : <User size={18} className="auth-form__input-icon" />}
                            <input
                                type="text" id="reg-username" name="username"
                                className="auth-form__input"
                                placeholder={isSeller ? 'Your store or brand name' : 'Choose a username'}
                                value={form.username} onChange={handleChange}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="reg-email">Email *</label>
                        <div className="auth-form__input-icon-wrapper">
                            <Mail size={18} className="auth-form__input-icon" />
                            <input
                                type="email" id="reg-email" name="email"
                                className="auth-form__input"
                                placeholder="Enter your email"
                                value={form.email} onChange={handleChange}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="reg-password">Password *</label>
                        <div className="auth-form__input-icon-wrapper">
                            <Lock size={18} className="auth-form__input-icon" />
                            <input
                                type="password" id="reg-password" name="password"
                                className="auth-form__input"
                                placeholder="Min. 8 characters"
                                value={form.password} onChange={handleChange}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="reg-phone">Phone (optional)</label>
                        <div className="auth-form__input-icon-wrapper">
                            <Phone size={18} className="auth-form__input-icon" />
                            <input
                                type="tel" id="reg-phone" name="phone"
                                className="auth-form__input"
                                placeholder="Your phone number"
                                value={form.phone} onChange={handleChange}
                            />
                        </div>
                    </div>

                    {isSeller && (
                        <div className="auth-role-info">
                            <Store size={16} />
                            <span>You'll get access to the <strong>Seller Dashboard</strong> to manage products, track orders, and view revenue.</span>
                        </div>
                    )}

                    {!isSeller && (
                        <div className="auth-role-info auth-role-info--buyer">
                            <ShoppingBag size={16} />
                            <span>You'll be able to create <strong>Order Rooms</strong>, invite friends, and split delivery costs together.</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`btn btn-lg auth-form__submit ${isSeller ? 'btn-seller' : 'btn-primary'}`}
                        disabled={loading}
                        id="register-submit-btn"
                    >
                        {loading
                            ? 'Creating account...'
                            : <>{isSeller ? 'Create Seller Account' : 'Create Account'} <UserPlus size={18} /></>}
                    </button>
                </form>

                <div className="auth-card__footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
