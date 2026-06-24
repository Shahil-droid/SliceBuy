import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Users, Loader, CheckCircle, XCircle, LogIn } from 'lucide-react';
import './Auth.css';

const JoinRoom = () => {
    const { roomCode } = useParams();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error | login | password
    const [message, setMessage] = useState('');
    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setStatus('login');
            return;
        }

        const joinRoom = async (pwd = '') => {
            setIsJoining(true);
            try {
                const payload = { room_code: roomCode };
                if (pwd) payload.room_password = pwd;

                const res = await api.post('/orders/join/', payload);
                setMessage(res.data.message);
                setRoomName(res.data.room_code);
                setStatus('success');
                // Redirect to room after 1.5s
                setTimeout(() => navigate(`/orders/${res.data.room_code}`), 1500);
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Failed to join room.';
                if (errorMsg === 'Incorrect room password.') {
                    setStatus('password');
                    if (pwd) setMessage('Incorrect password. Please try again.');
                } else {
                    setMessage(errorMsg);
                    setStatus('error');
                }
            } finally {
                setIsJoining(false);
            }
        };

        if (status === 'loading') {
             joinRoom(password);
        }
    }, [roomCode, isAuthenticated, navigate, status]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        setStatus('loading');
    };

    return (
        <div className="auth-page">
            <div className="auth-page__bg-orb auth-page__bg-orb--1" />
            <div className="auth-page__bg-orb auth-page__bg-orb--2" />

            <div className="auth-card" style={{ textAlign: 'center' }}>
                <div className="auth-card__logo">
                    <Link to="/">Slice<span className="text-gradient-accent">Buy</span></Link>
                </div>

                {status === 'loading' && (
                    <>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)', animation: 'pulse 1.5s infinite',
                        }}>
                            <Loader size={28} color="var(--color-primary-light)" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                        <h1 className="auth-card__title">Joining Room...</h1>
                        <p className="auth-card__subtitle">Room code: <strong>{roomCode}</strong></p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(0,206,201,0.12)', border: '1px solid rgba(0,206,201,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                        }}>
                            <CheckCircle size={28} color="var(--color-accent)" />
                        </div>
                        <h1 className="auth-card__title">Joined!</h1>
                        <p className="auth-card__subtitle">{message}</p>
                        <p className="auth-card__subtitle" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            Redirecting to room...
                        </p>
                    </>
                )}

                {status === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(253,203,110,0.12)', border: '1px solid rgba(253,203,110,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                        }}>
                            <Users size={28} color="#fdcb6e" />
                        </div>
                        <h1 className="auth-card__title">Private Room</h1>
                        <p className="auth-card__subtitle">
                            Room <strong>{roomCode}</strong> is private. Please enter the password to join.
                        </p>
                        {message && <p style={{color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem'}}>{message}</p>}
                        
                        <div className="auth-form__group" style={{ textAlign: 'left' }}>
                            <label className="auth-form__label">Room Password</label>
                            <input
                                type="password"
                                className="auth-form__input"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isJoining || !password}>
                            {isJoining ? 'Joining...' : 'Join Private Room'}
                        </button>
                        <div style={{ marginTop: '1rem' }}>
                            <Link to="/orders" className="btn btn-secondary" style={{ width: '100%' }}>Cancel</Link>
                        </div>
                    </form>
                )}

                {status === 'error' && (
                    <>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                        }}>
                            <XCircle size={28} color="#e74c3c" />
                        </div>
                        <h1 className="auth-card__title">Couldn't Join</h1>
                        <p className="auth-card__subtitle">{message}</p>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
                            <Link to="/orders" className="btn btn-secondary">My Rooms</Link>
                            <Link to="/" className="btn btn-primary">Home</Link>
                        </div>
                    </>
                )}

                {status === 'login' && (
                    <>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                        }}>
                            <Users size={28} color="var(--color-primary-light)" />
                        </div>
                        <h1 className="auth-card__title">Join Order Room</h1>
                        <p className="auth-card__subtitle">
                            You've been invited to join room <strong>{roomCode}</strong>.
                            Please log in or create an account to continue.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
                            <Link to={`/login?next=/join/${roomCode}`} className="btn btn-primary btn-lg">
                                <LogIn size={18} /> Login to Join
                            </Link>
                            <Link to={`/register?next=/join/${roomCode}`} className="btn btn-secondary btn-lg">
                                Sign Up
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinRoom;
