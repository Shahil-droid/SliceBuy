import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Plus, Users, Clock, Hash, ArrowRight, DoorOpen,
    ShoppingBag, Zap, SplitSquareVertical, CheckCircle,
    XCircle, AlertTriangle,
} from 'lucide-react';
import './OrderRooms.css';

/* ── Status Badge ────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
    const config = {
        open: { icon: DoorOpen, color: '#55efc4', label: 'Open' },
        locked: { icon: Clock, color: '#fdcb6e', label: 'Locked' },
        payment_pending: { icon: Zap, color: '#a29bfe', label: 'Payment Pending' },
        confirmed: { icon: CheckCircle, color: '#55efc4', label: 'Confirmed' },
        cancelled: { icon: XCircle, color: '#e74c3c', label: 'Cancelled' },
        expired: { icon: AlertTriangle, color: '#e17055', label: 'Expired' },
    };
    const { icon: Icon, color, label } = config[status] || config.open;
    return (
        <span className="status-badge" style={{ '--badge-color': color }}>
            <Icon size={14} /> {label}
        </span>
    );
};

/* ── Create Room Modal ───────────────────────────────────── */
const CreateRoomModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '',
        split_mode: 'individual',
        is_private: false,
        room_password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { setError('Room name is required.'); return; }
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                split_mode: form.split_mode,
                is_private: form.is_private,
            };
            if (form.is_private) payload.room_password = form.room_password;

            const res = await api.post('/orders/rooms/', payload);
            onCreated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create room.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">Create Order Room</h2>
                    <button className="modal__close" onClick={onClose}>×</button>
                </div>
                <form className="modal__form" onSubmit={handleSubmit}>
                    {error && <div className="auth-form__error">{error}</div>}

                    <div className="auth-form__group">
                        <label className="auth-form__label">Room Name *</label>
                        <input
                            type="text"
                            className="auth-form__input"
                            placeholder="e.g. Weekend Shopping with Friends"
                            value={form.name}
                            onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }}
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Split Mode</label>
                        <div className="split-mode-picker">
                            <button
                                type="button"
                                className={`split-mode-option ${form.split_mode === 'individual' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, split_mode: 'individual' })}
                            >
                                <SplitSquareVertical size={20} />
                                <strong>Individual</strong>
                                <span>Each pays for their items + shared delivery</span>
                            </button>
                            <button
                                type="button"
                                className={`split-mode-option ${form.split_mode === 'equal' ? 'active' : ''}`}
                                onClick={() => setForm({ ...form, split_mode: 'equal' })}
                            >
                                <Users size={20} />
                                <strong>Equal</strong>
                                <span>Total split equally among all</span>
                            </button>
                        </div>
                    </div>

                    <div className="auth-form__group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="is_private"
                            checked={form.is_private}
                            onChange={(e) => setForm({ ...form, is_private: e.target.checked })}
                            style={{ width: 'auto', marginBottom: 0 }}
                        />
                        <label htmlFor="is_private" className="auth-form__label" style={{ marginBottom: 0 }}>
                            Private Room (Requires Password)
                        </label>
                    </div>

                    {form.is_private && (
                        <div className="auth-form__group">
                            <label className="auth-form__label">Room Password *</label>
                            <input
                                type="password"
                                className="auth-form__input"
                                placeholder="Enter a secure password"
                                value={form.room_password}
                                onChange={(e) => setForm({ ...form, room_password: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="delivery-fee-note">
                        <span className="delivery-fee-note__icon">🚚</span>
                        <span>A standard delivery fee of <strong>₹99</strong> applies and will be <strong>split among all members</strong> — the more people, the less each pays!</span>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-form__submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Room'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ── Join Room Modal ─────────────────────────────────────── */
const JoinRoomModal = ({ onClose, onJoined }) => {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [requirePassword, setRequirePassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!code.trim()) { setError('Room code is required.'); return; }
        setLoading(true);
        try {
            const payload = { room_code: code.trim() };
            if (password) payload.room_password = password;
            const res = await api.post('/orders/join/', payload);
            onJoined(res.data.room_code);
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to join room.';
            setError(errorMsg);
            if (errorMsg === 'Incorrect room password.') {
                setRequirePassword(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">Join Room</h2>
                    <button className="modal__close" onClick={onClose}>×</button>
                </div>
                <form className="modal__form" onSubmit={handleSubmit}>
                    {error && <div className="auth-form__error">{error}</div>}
                    <div className="auth-form__group">
                        <label className="auth-form__label">Room Code</label>
                        <input
                            type="text"
                            className="auth-form__input room-code-input"
                            placeholder="Enter 8-character code"
                            value={code}
                            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                            maxLength={8}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, textAlign: 'center', fontSize: '1.2rem' }}
                        />
                    </div>
                    {requirePassword && (
                        <div className="auth-form__group">
                            <label className="auth-form__label">Room Password</label>
                            <input
                                type="password"
                                className="auth-form__input"
                                placeholder="Enter room password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            />
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-lg auth-form__submit" disabled={loading}>
                        {loading ? 'Joining...' : 'Join Room'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ── Room Card ───────────────────────────────────────────── */
const RoomCard = ({ room, onClick }) => (
    <div className="room-card" onClick={onClick}>
        <div className="room-card__header">
            <StatusBadge status={room.status} />
            <span className="room-card__code">
                <Hash size={14} /> {room.room_code}
            </span>
        </div>
        <h3 className="room-card__name">{room.name}</h3>
        <div className="room-card__meta">
            <span><Users size={14} /> {room.member_count} member{room.member_count !== 1 ? 's' : ''}</span>
            <span><ShoppingBag size={14} /> {room.item_count} item{room.item_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="room-card__footer">
            <span className="room-card__split">
                {room.split_mode === 'individual' ? '🧩 Individual' : '⚖️ Equal'} Split
            </span>
            {room.total_order_value > 0 && (
                <span className="room-card__total">₹{Number(room.total_order_value).toLocaleString()}</span>
            )}
        </div>
        <div className="room-card__arrow"><ArrowRight size={18} /></div>
    </div>
);

/* ── Main Order Rooms Page ───────────────────────────────── */
const OrderRooms = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/orders/rooms/');
            setRooms(res.data);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchRooms();
    }, [isAuthenticated]);

    const handleCreated = (room) => {
        fetchRooms();
        navigate(`/orders/${room.room_code}`);
    };

    const handleJoined = (roomCode) => {
        fetchRooms();
        navigate(`/orders/${roomCode}`);
    };

    return (
        <div className="order-rooms-page" id="order-rooms-page">
            <section className="order-rooms-header">
                <div className="container">
                    <div className="order-rooms-header__content">
                        <div>
                            <h1 className="order-rooms-header__title">
                                <Users size={36} className="order-rooms-header__icon" />
                                Order Rooms
                            </h1>
                            <p className="order-rooms-header__subtitle">
                                Create or join collaborative shopping rooms and split payments with friends
                            </p>
                        </div>
                        <div className="order-rooms-header__actions">
                            <button className="btn btn-secondary btn-lg" onClick={() => setShowJoin(true)}>
                                <DoorOpen size={20} /> Join Room
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                                <Plus size={20} /> Create Room
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="order-rooms-grid-section">
                <div className="container">
                    {loading ? (
                        <div className="products-loading">
                            <div className="products-loading__spinner" />
                            <p>Loading rooms...</p>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="products-empty">
                            <Users size={56} />
                            <h3>No Order Rooms Yet</h3>
                            <p>Create a room and invite friends to start shopping collaboratively!</p>
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                                <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                                    <DoorOpen size={18} /> Join Room
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                                    <Plus size={18} /> Create Room
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rooms-grid">
                            {rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    onClick={() => navigate(`/orders/${room.room_code}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
            {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
        </div>
    );
};

export default OrderRooms;
