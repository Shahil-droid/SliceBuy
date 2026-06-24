import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ShoppingBag, Package, Clock, IndianRupee,
    Hash, ArrowLeft, Box, TrendingUp, Zap
} from 'lucide-react';
import './PurchaseHistory.css';

/* ── Stat Card ──────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, accent }) => (
    <div className={`ph-stat-card ph-stat-card--${accent}`}>
        <div className="ph-stat-card__icon">
            <Icon size={22} />
        </div>
        <div>
            <span className="ph-stat-card__value">{value}</span>
            <span className="ph-stat-card__label">{label}</span>
        </div>
    </div>
);

/* ── Purchase Item Row ──────────────────────────────────── */
const PurchaseItem = ({ item, onViewProduct }) => {
    const imgUrl = item.product_image
        ? (item.product_image.startsWith('http')
            ? item.product_image
            : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/media/${item.product_image}`)
        : null;

    return (
        <div className="ph-item">
            <div className="ph-item__image">
                {imgUrl ? (
                    <img src={imgUrl} alt={item.product_name} />
                ) : (
                    <div className="ph-item__image-placeholder">
                        <Package size={24} />
                    </div>
                )}
            </div>
            <div className="ph-item__details">
                <h4
                    className="ph-item__name"
                    onClick={() => item.product_id && onViewProduct(item.product_id)}
                    style={item.product_id ? { cursor: 'pointer' } : {}}
                >
                    {item.product_name}
                </h4>
                <div className="ph-item__meta">
                    <span className="ph-item__seller">by {item.seller_name || 'Seller'}</span>
                    {item.room_name && (
                        <span className="ph-item__room">
                            <Hash size={12} /> {item.room_name}
                        </span>
                    )}
                </div>
            </div>
            <div className="ph-item__qty">
                <span className="ph-item__qty-badge">{item.quantity}x</span>
            </div>
            <div className="ph-item__pricing">
                <span className="ph-item__price">₹{Number(item.price_paid).toLocaleString()}</span>
                <span className="ph-item__total">₹{Number(item.line_total).toLocaleString()}</span>
            </div>
            <div className="ph-item__date">
                <Clock size={12} />
                {new Date(item.purchased_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })}
            </div>
        </div>
    );
};

/* ── Main Page ──────────────────────────────────────────── */
const PurchaseHistory = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/orders/purchase-history/');
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch purchase history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="ph-page">
                <div className="products-loading" style={{ minHeight: '60vh' }}>
                    <div className="products-loading__spinner" />
                    <p>Loading purchase history...</p>
                </div>
            </div>
        );
    }

    const { stats, purchases } = data || { stats: {}, purchases: [] };

    // Group purchases by room (direct purchases get their own group)
    const grouped = {};
    purchases.forEach((p) => {
        const key = p.room_code || `direct-${p.id}`;
        if (!grouped[key]) {
            grouped[key] = {
                id: key,
                room_code: p.room_code,
                room_name: p.room_name || 'Direct Purchase',
                date: p.purchased_at,
                items: [],
                total: 0,
                isDirect: !p.room_code,
            };
        }
        grouped[key].items.push(p);
        grouped[key].total += Number(p.line_total);
    });
    const orders = Object.values(grouped).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    return (
        <div className="ph-page" id="purchase-history-page">
            {/* Header */}
            <section className="ph-header">
                <div className="container">
                    <button className="product-detail-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Back
                    </button>

                    <h1 className="ph-header__title">
                        <ShoppingBag size={32} className="ph-header__icon" />
                        Purchase History
                    </h1>
                    <p className="ph-header__subtitle">
                        All your confirmed orders and purchases in one place
                    </p>

                    {/* Stats */}
                    <div className="ph-stats">
                        <StatCard
                            icon={IndianRupee}
                            label="Total Spent"
                            value={`₹${Number(stats.total_spent).toLocaleString()}`}
                            accent="primary"
                        />
                        <StatCard
                            icon={Box}
                            label="Items Purchased"
                            value={stats.total_items}
                            accent="accent"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Orders Completed"
                            value={stats.total_orders}
                            accent="success"
                        />
                    </div>
                </div>
            </section>

            {/* Orders */}
            <section className="ph-orders container">
                {orders.length === 0 ? (
                    <div className="products-empty" style={{ minHeight: '40vh' }}>
                        <ShoppingBag size={56} />
                        <h3>No Purchases Yet</h3>
                        <p>
                            When you buy an item directly or complete a group order, your
                            purchase history will appear here.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/products')}>
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="ph-order-group">
                            <div className="ph-order-group__header">
                                <div className="ph-order-group__info">
                                    <h3 className="ph-order-group__name">
                                        {order.isDirect ? <Zap size={18} /> : <Package size={18} />} {order.room_name}
                                    </h3>
                                    {!order.isDirect && (
                                        <span className="ph-order-group__code">
                                            <Hash size={12} /> {order.room_code}
                                        </span>
                                    )}
                                    <span className="ph-order-group__date">
                                        <Clock size={12} />
                                        {new Date(order.date).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                                <div className="ph-order-group__total">
                                    ₹{order.total.toLocaleString()}
                                </div>
                            </div>

                            <div className="ph-order-group__items">
                                {order.items.map((item) => (
                                    <PurchaseItem
                                        key={item.id}
                                        item={item}
                                        onViewProduct={(id) => navigate(`/products/${id}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
};

export default PurchaseHistory;
