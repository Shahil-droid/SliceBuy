import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, CheckCircle } from 'lucide-react';
import './Auth.css';

const ResetPassword = () => {
    const { uidb64, token } = useParams();
    const { confirmPasswordReset, loading } = useAuth();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!password || !confirm) {
            setError('Please fill in both fields.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        const result = await confirmPasswordReset(uidb64, token, password);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-page" id="reset-password-page">
            <div className="auth-page__bg-orb auth-page__bg-orb--1" />
            <div className="auth-page__bg-orb auth-page__bg-orb--2" />

            <div className="auth-card">
                <div className="auth-card__logo">
                    <Link to="/">Slice<span className="text-gradient-accent">Buy</span></Link>
                </div>

                {!success ? (
                    <>
                        <h1 className="auth-card__title">Reset Password</h1>
                        <p className="auth-card__subtitle">Enter your new password below</p>

                        <form className="auth-form" onSubmit={handleSubmit} id="reset-password-form">
                            {error && <div className="auth-form__error">{error}</div>}

                            <div className="auth-form__group">
                                <label className="auth-form__label" htmlFor="new-password">New Password</label>
                                <div className="auth-form__input-icon-wrapper">
                                    <Lock size={18} className="auth-form__input-icon" />
                                    <input
                                        type="password"
                                        id="new-password"
                                        className="auth-form__input"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="auth-form__group">
                                <label className="auth-form__label" htmlFor="confirm-password">Confirm Password</label>
                                <div className="auth-form__input-icon-wrapper">
                                    <Lock size={18} className="auth-form__input-icon" />
                                    <input
                                        type="password"
                                        id="confirm-password"
                                        className="auth-form__input"
                                        placeholder="Re-enter your password"
                                        value={confirm}
                                        onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-form__submit"
                                disabled={loading}
                                id="reset-password-submit-btn"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(0,206,201,0.12)', border: '1px solid rgba(0,206,201,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)'
                        }}>
                            <CheckCircle size={28} color="var(--color-accent)" />
                        </div>
                        <h1 className="auth-card__title">Password Reset!</h1>
                        <p className="auth-card__subtitle">
                            Your password has been updated successfully. Redirecting you to login...
                        </p>
                    </div>
                )}

                <div className="auth-card__footer">
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
