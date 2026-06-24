import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, Lock, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';
import './Auth.css';

/*
 * ForgotPassword — 3-step OTP password reset
 *
 * Step 1 — Email: User enters email → OTP sent
 * Step 2 — OTP + New password: User types 6-digit OTP + sets password
 * Step 3 — Success: redirect countdown to login
 */
const STEP = { EMAIL: 1, OTP: 2, SUCCESS: 3 };

const ForgotPassword = () => {
    const { requestPasswordReset, confirmPasswordReset, loading } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(STEP.EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // Refs for OTP boxes — autofocus & navigation
    const otpRefs = useRef([]);

    // Redirect countdown after success
    useEffect(() => {
        if (step !== STEP.SUCCESS) return;
        const t = setTimeout(() => navigate('/login'), 4000);
        return () => clearTimeout(t);
    }, [step, navigate]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    /* ── Step 1: Send OTP ── */
    const handleSendOtp = async (e) => {
        e?.preventDefault();
        setError('');
        if (!email) { setError('Please enter your email address.'); return; }

        const result = await requestPasswordReset(email);
        if (result.success) {
            setStep(STEP.OTP);
            setResendCooldown(60);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } else {
            setError(result.error);
        }
    };

    /* ── OTP box input logic ── */
    const handleOtpChange = (index, value) => {
        const cleaned = value.replace(/\D/g, '').slice(-1);
        const next = [...otp];
        next[index] = cleaned;
        setOtp(next);
        if (cleaned && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    /* ── Step 2: Verify OTP + reset password ── */
    const handleVerify = async (e) => {
        e?.preventDefault();
        setError('');
        const otpString = otp.join('');
        if (otpString.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
        if (!password) { setError('Please enter a new password.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }

        const result = await confirmPasswordReset(email, otpString, password);
        if (result.success) {
            setStep(STEP.SUCCESS);
        } else {
            setError(result.error);
        }
    };

    /* ── Resend OTP ── */
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setOtp(['', '', '', '', '', '']);
        const result = await requestPasswordReset(email);
        if (result.success) {
            setResendCooldown(60);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-page" id="forgot-password-page">
            <div className="auth-page__bg-orb auth-page__bg-orb--1" />
            <div className="auth-page__bg-orb auth-page__bg-orb--2" />

            <div className="auth-card" style={{ maxWidth: step === STEP.OTP ? 480 : 460 }}>
                <div className="auth-card__logo">
                    <Link to="/">Slice<span className="text-gradient-accent">Buy</span></Link>
                </div>

                {/* ── STEP 1: Email ── */}
                {step === STEP.EMAIL && (
                    <>
                        <h1 className="auth-card__title">Forgot Password</h1>
                        <p className="auth-card__subtitle">
                            Enter your email and we'll send you a 6-digit OTP
                        </p>

                        <form className="auth-form" onSubmit={handleSendOtp} id="forgot-password-form">
                            {error && <div className="auth-form__error">{error}</div>}

                            <div className="auth-form__group">
                                <label className="auth-form__label" htmlFor="reset-email">Email Address</label>
                                <div className="auth-form__input-icon-wrapper">
                                    <Mail size={18} className="auth-form__input-icon" />
                                    <input
                                        type="email"
                                        id="reset-email"
                                        className="auth-form__input"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-form__submit"
                                disabled={loading}
                                id="send-otp-btn"
                            >
                                {loading ? 'Sending...' : <><Send size={18} /> Send OTP</>}
                            </button>
                        </form>
                    </>
                )}

                {/* ── STEP 2: OTP + New Password ── */}
                {step === STEP.OTP && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-md)',
                            }}>
                                <KeyRound size={26} color="var(--color-primary-light)" />
                            </div>
                            <h1 className="auth-card__title">Enter OTP</h1>
                            <p className="auth-card__subtitle" style={{ marginBottom: 0 }}>
                                We sent a 6-digit code to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>
                            </p>
                        </div>

                        <form className="auth-form" onSubmit={handleVerify} id="otp-reset-form">
                            {error && <div className="auth-form__error">{error}</div>}

                            {/* OTP Boxes */}
                            <div style={{
                                display: 'flex', gap: '10px', justifyContent: 'center',
                                margin: 'var(--space-lg) 0',
                            }}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => otpRefs.current[i] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        onPaste={handleOtpPaste}
                                        id={`otp-box-${i}`}
                                        style={{
                                            width: 52, height: 60,
                                            textAlign: 'center',
                                            fontSize: '1.6rem',
                                            fontWeight: 800,
                                            borderRadius: 12,
                                            border: digit
                                                ? '2px solid var(--color-primary)'
                                                : '2px solid var(--color-border)',
                                            background: 'var(--color-bg-primary)',
                                            color: 'var(--color-text-primary)',
                                            outline: 'none',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                            boxShadow: digit ? '0 0 0 3px rgba(108, 92, 231, 0.2)' : 'none',
                                            caretColor: 'var(--color-primary)',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* New Password */}
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
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
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
                                        onChange={e => { setConfirm(e.target.value); setError(''); }}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-form__submit"
                                disabled={loading}
                                id="verify-otp-btn"
                            >
                                {loading ? 'Verifying...' : 'Reset Password'}
                            </button>

                            {/* Resend */}
                            <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                                Didn't receive the code?{' '}
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0 || loading}
                                    style={{
                                        background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                        color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary-light)',
                                        fontWeight: 600, fontSize: '0.88rem',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                    }}
                                >
                                    <RefreshCw size={13} />
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* ── STEP 3: Success ── */}
                {step === STEP.SUCCESS && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(0,206,201,0.12)', border: '1px solid rgba(0,206,201,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                            animation: 'scaleIn 0.4s ease',
                        }}>
                            <CheckCircle size={36} color="var(--color-accent)" />
                        </div>
                        <h1 className="auth-card__title">Password Reset!</h1>
                        <p className="auth-card__subtitle">
                            Your password has been updated successfully.
                            Redirecting you to login...
                        </p>
                    </div>
                )}

                <div className="auth-card__footer">
                    {step === STEP.OTP ? (
                        <button
                            onClick={() => { setStep(STEP.EMAIL); setError(''); setOtp(['','','','','','']); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-light)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}
                        >
                            <ArrowLeft size={15} /> Change Email
                        </button>
                    ) : (
                        <Link to="/login" className="auth-form__link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
