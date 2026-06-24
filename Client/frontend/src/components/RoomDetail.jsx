import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Users, Hash, Clock, Lock, Package, Plus, Trash2,
    CreditCard, CheckCircle, XCircle, ArrowLeft, Copy,
    ShoppingBag, DollarSign, AlertTriangle, SplitSquareVertical,
    Link2, Share2,
} from 'lucide-react';
import RoomChat from './RoomChat';
import './OrderRooms.css';

/* ── Status Badge (reuse) ────────────────────────────────── */
const StatusBadge = ({ status }) => {
    const config = {
        open: { icon: ShoppingBag, color: '#55efc4', label: 'Open' },
        locked: { icon: Lock, color: '#fdcb6e', label: 'Locked' },
        payment_pending: { icon: Clock, color: '#a29bfe', label: 'Payment Pending' },
        confirmed: { icon: CheckCircle, color: '#55efc4', label: 'Confirmed' },
        cancelled: { icon: XCircle, color: '#e74c3c', label: 'Cancelled' },
        expired: { icon: AlertTriangle, color: '#e17055', label: 'Expired' },
    };
    const { icon: Icon, color, label } = config[status] || config.open;
    return (
        <span className="status-badge status-badge--lg" style={{ '--badge-color': color }}>
            <Icon size={16} /> {label}
        </span>
    );
};

/* ── Add Item Modal ──────────────────────────────────────── */
const AddItemModal = ({ roomCode, onClose, onAdded }) => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/products/').then((res) => {
            setProducts(res.data);
            setLoading(false);
        });
    }, []);

    const handleAdd = async (productId) => {
        try {
            await api.post(`/orders/rooms/${roomCode}/add_item/`, {
                product_id: productId,
                quantity: 1,
            });
            onAdded();
            onClose();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add item.');
        }
    };

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <div className="modal__header">
                    <h2 className="modal__title">Add Product to Room</h2>
                    <button className="modal__close" onClick={onClose}>×</button>
                </div>

                <input
                    type="text"
                    className="auth-form__input"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ marginBottom: 'var(--space-md)' }}
                />

                <div className="add-item-list">
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>Loading products...</p>
                    ) : filtered.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No products found.</p>
                    ) : (
                        filtered.map((product) => (
                            <div key={product.id} className="add-item-row">
                                <div className="add-item-row__info">
                                    <span className="add-item-row__name">{product.name}</span>
                                    <span className="add-item-row__price">₹{Number(product.price).toLocaleString()}</span>
                                    <span className="add-item-row__stock">{product.stock} in stock</span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                                    onClick={() => handleAdd(product.id)}
                                    disabled={product.stock === 0}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Room Detail Page ────────────────────────────────────── */
const RoomDetail = () => {
    const { roomCode } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(false);
    const [paying, setPaying] = useState(false);
    const [locking, setLocking] = useState(false);
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const fetchRoom = async () => {
        try {
            const res = await api.get(`/orders/rooms/${roomCode}/`);
            setRoom(res.data);
        } catch (err) {
            console.error('Failed to fetch room:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRoom(); }, [roomCode]);

    const isCreator = room?.creator === user?.id;
    const myMembership = room?.members_list?.find((m) => m.user_id === user?.id);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(room.room_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLink = `${window.location.origin}/join/${room?.room_code}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleRemoveItem = async (itemId) => {
        try {
            await api.delete(`/orders/rooms/${roomCode}/remove_item/${itemId}/`);
            fetchRoom();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to remove item.');
        }
    };

    const handleLockRoom = async () => {
        setLocking(true);
        try {
            await api.post(`/orders/rooms/${roomCode}/lock/`, { deadline_hours: 24 });
            fetchRoom();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to lock room.');
        } finally {
            setLocking(false);
        }
    };

    const handlePay = () => {
        navigate(`/room-checkout/${roomCode}`);
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this room?')) return;
        try {
            await api.post(`/orders/rooms/${roomCode}/cancel/`);
            fetchRoom();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to cancel.');
        }
    };

    if (loading) {
        return (
            <div className="room-detail-page">
                <div className="products-loading" style={{ minHeight: '60vh' }}>
                    <div className="products-loading__spinner" />
                    <p>Loading room...</p>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="room-detail-page">
                <div className="products-empty" style={{ minHeight: '60vh' }}>
                    <XCircle size={56} />
                    <h3>Room Not Found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/orders')}>
                        <ArrowLeft size={18} /> Back to Rooms
                    </button>
                </div>
            </div>
        );
    }

    const deadline = room.payment_deadline
        ? new Date(room.payment_deadline).toLocaleString()
        : null;

    return (
        <div className="room-detail-page" id="room-detail-page">
            {/* Header */}
            <section className="room-detail-header">
                <div className="container">
                    <button className="room-detail-back" onClick={() => navigate('/orders')}>
                        <ArrowLeft size={18} /> All Rooms
                    </button>

                    <div className="room-detail-header__top">
                        <div>
                            <div className="room-detail-header__meta">
                                <StatusBadge status={room.status} />
                                <span className="room-detail-header__split">
                                    <SplitSquareVertical size={14} />
                                    {room.split_mode === 'individual' ? 'Individual' : 'Equal'} Split
                                </span>
                            </div>
                            <h1 className="room-detail-header__title">{room.name}</h1>
                        </div>

                        <div className="room-code-display" onClick={handleCopyCode}>
                            <Hash size={18} />
                            <span className="room-code-display__code">{room.room_code}</span>
                            <Copy size={16} />
                            {copied && <span className="room-code-display__copied">Copied!</span>}
                        </div>
                    </div>

                    {/* Summary row */}
                    <div className="room-detail-summary">
                        <div className="room-detail-summary__item">
                            <span className="room-detail-summary__value">₹{Number(room.total_items_cost).toLocaleString()}</span>
                            <span className="room-detail-summary__label">Items Total</span>
                        </div>
                        <div className="room-detail-summary__item">
                            <span className="room-detail-summary__value">₹{Number(room.delivery_fee).toLocaleString()}</span>
                            <span className="room-detail-summary__label">Delivery</span>
                        </div>
                        <div className="room-detail-summary__item room-detail-summary__item--highlight">
                            <span className="room-detail-summary__value">₹{Number(room.total_order_value).toLocaleString()}</span>
                            <span className="room-detail-summary__label">Grand Total</span>
                        </div>
                        {myMembership && room.status !== 'open' && (
                            <div className="room-detail-summary__item room-detail-summary__item--accent">
                                <span className="room-detail-summary__value">₹{Number(myMembership.amount_owed).toLocaleString()}</span>
                                <span className="room-detail-summary__label">Your Share</span>
                            </div>
                        )}
                    </div>

                    {deadline && (
                        <div className="room-detail-deadline">
                            <Clock size={16} /> Payment deadline: <strong>{deadline}</strong>
                        </div>
                    )}
                </div>
            </section>

            <div className="room-detail-body container">
                <div className="room-detail-grid">
                    {/* Left: Items */}
                    <div className="room-detail-items">
                        <div className="room-detail-section-header">
                            <h2><Package size={22} /> Items ({room.items.length})</h2>
                            {room.status === 'open' && (
                                <button className="btn btn-primary" onClick={() => setShowAddItem(true)}>
                                    <Plus size={16} /> Add Item
                                </button>
                            )}
                        </div>

                        {room.items.length === 0 ? (
                            <div className="room-detail-empty">
                                <ShoppingBag size={40} />
                                <p>No items yet. Add products to get started!</p>
                            </div>
                        ) : (
                            <div className="room-items-list">
                                {room.items.map((item) => {
                                    const imgUrl = item.product_image ? (item.product_image.startsWith('http') ? item.product_image : `${import.meta.env.VITE_API_URL}${item.product_image}`) : null;
                                    return (
                                        <div key={item.id} className="room-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {imgUrl ? (
                                                    <img src={imgUrl} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Package size={20} color="var(--color-text-muted)" />
                                                )}
                                            </div>
                                            <div className="room-item__info" style={{ flex: 1 }}>
                                                <span className="room-item__name">{item.product_name}</span>
                                                <span className="room-item__details">
                                                    by {item.seller_username} · added by <strong>{item.added_by_username}</strong>
                                                </span>
                                            </div>
                                        <div className="room-item__numbers">
                                            <span className="room-item__qty">{item.quantity}x</span>
                                            <span className="room-item__price">₹{Number(item.line_total).toLocaleString()}</span>
                                        </div>
                                        {room.status === 'open' && (item.added_by === user?.id || isCreator) && (
                                            <button
                                                className="room-item__remove"
                                                onClick={() => handleRemoveItem(item.id)}
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Chat */}
                    <RoomChat roomCode={roomCode} />

                    {/* Right: Members & Actions */}
                    <div className="room-detail-sidebar">
                        {/* Members */}
                        <div className="room-detail-members">
                            <h3><Users size={20} /> Members ({room.member_count})</h3>
                            <div className="members-list">
                                {room.members_list.map((member) => (
                                    <div key={member.id} className="member-row">
                                        <div className="member-row__avatar">
                                            {member.username[0].toUpperCase()}
                                        </div>
                                        <div className="member-row__info">
                                            <span className="member-row__name">
                                                {member.username}
                                                {member.user_id === room.creator && (
                                                    <span className="member-row__creator">Creator</span>
                                                )}
                                            </span>
                                            {room.status !== 'open' && (
                                                <span className="member-row__amount">
                                                    ₹{Number(member.amount_owed).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`member-row__status member-row__status--${member.payment_status}`}>
                                            {member.payment_status === 'paid' && <CheckCircle size={16} />}
                                            {member.payment_status === 'pending' && <Clock size={16} />}
                                            {member.payment_status === 'failed' && <XCircle size={16} />}
                                            {member.payment_status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Share Invite Link */}
                        {room.status === 'open' && (
                            <div className="room-detail-members" style={{ borderColor: 'var(--color-primary)' }}>
                                <h3><Share2 size={20} /> Invite Friends</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                                    Share this link with friends to invite them to this order room:
                                </p>
                                <div className="share-link-box" onClick={handleCopyLink}>
                                    <Link2 size={16} className="share-link-box__icon" />
                                    <span className="share-link-box__url">{shareLink}</span>
                                    <Copy size={16} />
                                    {linkCopied && <span className="room-code-display__copied">Copied!</span>}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="room-detail-actions">
                            {room.status === 'open' && isCreator && room.items.length > 0 && (
                                <button className="btn btn-accent btn-lg" onClick={handleLockRoom} disabled={locking} style={{ width: '100%' }}>
                                    <Lock size={18} /> {locking ? 'Locking...' : 'Lock Room & Set Deadline'}
                                </button>
                            )}

                            {(room.status === 'locked' || room.status === 'payment_pending') &&
                                myMembership?.payment_status === 'pending' && (
                                    <button className="btn btn-primary btn-lg" onClick={handlePay} disabled={paying} style={{ width: '100%' }}>
                                        <CreditCard size={18} /> {paying ? 'Processing...' : `Pay ₹${Number(myMembership.amount_owed).toLocaleString()}`}
                                    </button>
                                )}

                            {myMembership?.payment_status === 'paid' && room.status !== 'confirmed' && (
                                <div className="room-detail-paid-badge">
                                    <CheckCircle size={20} /> You've paid — waiting for others
                                </div>
                            )}

                            {room.status === 'confirmed' && (
                                <div className="room-detail-confirmed-badge">
                                    <CheckCircle size={24} />
                                    <div>
                                        <strong>Order Confirmed!</strong>
                                        <p>All payments received. Sub-orders generated for sellers.</p>
                                    </div>
                                </div>
                            )}

                            {isCreator && !['confirmed', 'cancelled', 'expired'].includes(room.status) && (
                                <button
                                    className="btn btn-lg"
                                    onClick={handleCancel}
                                    style={{
                                        width: '100%', marginTop: 'var(--space-sm)',
                                        background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
                                        border: '1px solid rgba(231,76,60,0.3)',
                                    }}
                                >
                                    <XCircle size={18} /> Cancel Room
                                </button>
                            )}
                        </div>

                        {/* Sub-orders (after confirmation) */}
                        {room.sub_orders && room.sub_orders.length > 0 && (
                            <div className="room-detail-suborders">
                                <h3><DollarSign size={20} /> Seller Sub-Orders</h3>
                                {room.sub_orders.map((so) => (
                                    <div key={so.id} className="suborder-card">
                                        <div className="suborder-card__header">
                                            <span>Seller: <strong>{so.seller_username}</strong></span>
                                            <span className="suborder-card__status">{so.status}</span>
                                        </div>
                                        <div className="suborder-card__details">
                                            <span>Subtotal: ₹{Number(so.sub_total).toLocaleString()}</span>
                                            <span>Commission ({so.commission_rate}%): -₹{Number(so.commission_amount).toLocaleString()}</span>
                                            <span className="suborder-card__net">Net: ₹{Number(so.net_amount).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showAddItem && (
                <AddItemModal roomCode={roomCode} onClose={() => setShowAddItem(false)} onAdded={fetchRoom} />
            )}
        </div>
    );
};

export default RoomDetail;
