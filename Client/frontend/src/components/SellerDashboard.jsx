import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Package, TrendingUp, DollarSign, AlertTriangle,
    ShoppingBag, BarChart3, Truck, Eye, Pencil, Trash2,
    Plus, Archive, Layers, ArrowRight, CheckCircle,
    Clock, Box,
} from 'lucide-react';
import './SellerDashboard.css';

/* ── Stat Card ───────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, accent, sub }) => (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ''}`}>
        <div className="stat-card__icon">
            <Icon size={22} />
        </div>
        <div className="stat-card__info">
            <span className="stat-card__value">{value}</span>
            <span className="stat-card__label">{label}</span>
            {sub && <span className="stat-card__sub">{sub}</span>}
        </div>
    </div>
);

/* ── Sub-Order Status Badge ──────────────────────────────── */
const SubStatus = ({ status }) => {
    const map = {
        pending: { color: '#fdcb6e', icon: Clock },
        processing: { color: '#a29bfe', icon: Package },
        shipped: { color: '#74b9ff', icon: Truck },
        delivered: { color: '#55efc4', icon: CheckCircle },
    };
    const { color, icon: SIcon } = map[status] || map.pending;
    return (
        <span className="sub-status" style={{ '--sub-color': color }}>
            <SIcon size={14} /> {status}
        </span>
    );
};

/* ── Product Row ─────────────────────────────────────────── */
const ProductRow = ({ product, onEdit, onDelete }) => (
    <div className="product-row">
        <div className="product-row__image">
            {product.image ? (
                <img src={product.image} alt={product.name} />
            ) : (
                <Box size={24} />
            )}
        </div>
        <div className="product-row__info">
            <span className="product-row__name">{product.name}</span>
            <span className="product-row__meta">
                ₹{Number(product.price).toLocaleString()} · {product.stock} in stock
            </span>
        </div>
        <div className="product-row__stock-indicator">
            {product.stock === 0 ? (
                <span className="stock-badge stock-badge--out">Out of stock</span>
            ) : product.stock <= 5 ? (
                <span className="stock-badge stock-badge--low">Low stock</span>
            ) : (
                <span className="stock-badge stock-badge--ok">In stock</span>
            )}
        </div>
        <div className="product-row__actions">
            <button className="product-row__btn" onClick={() => onEdit(product)} title="Edit">
                <Pencil size={16} />
            </button>
            <button className="product-row__btn product-row__btn--danger" onClick={() => onDelete(product.id)} title="Delete">
                <Trash2 size={16} />
            </button>
        </div>
    </div>
);

/* ── Add/Edit Product Modal ──────────────────────────────── */
const ProductModal = ({ product, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        stock: product?.stock ?? '',
        image: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) { setError('Name and price are required.'); return; }
        setLoading(true);

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('description', form.description);
        formData.append('price', form.price);
        formData.append('stock', form.stock || 0);
        if (form.image) formData.append('image', form.image);

        try {
            if (product?.id) {
                await api.patch(`/products/${product.id}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/products/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button className="modal__close" onClick={onClose}>×</button>
                </div>
                <form className="modal__form" onSubmit={handleSubmit}>
                    {error && <div className="auth-form__error">{error}</div>}

                    <div className="auth-form__group">
                        <label className="auth-form__label">Product Name *</label>
                        <input type="text" className="auth-form__input" value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Headphones" />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Description</label>
                        <textarea className="auth-form__input" rows={3} value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="auth-form__group">
                            <label className="auth-form__label">Price (₹) *</label>
                            <input type="number" className="auth-form__input" value={form.price} min="0" step="0.01"
                                onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                        </div>
                        <div className="auth-form__group">
                            <label className="auth-form__label">Stock</label>
                            <input type="number" className="auth-form__input" value={form.stock} min="0"
                                onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Product Image</label>
                        <input type="file" accept="image/*" className="auth-form__input"
                            onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-form__submit" disabled={loading}>
                        {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ── Main Seller Dashboard ───────────────────────────────── */
const SellerDashboard = () => {
    const { user, isSeller } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [showProductModal, setShowProductModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/products/dashboard/');
            setData(res.data);
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isSeller) {
            navigate('/');
            return;
        }
        fetchDashboard();
    }, [isSeller]);

    const handleDeleteProduct = async (id) => {
        if (!confirm('Delete this product?')) return;
        try {
            await api.delete(`/products/${id}/`);
            fetchDashboard();
        } catch (err) {
            alert('Failed to delete product.');
        }
    };

    const handleEdit = (product) => {
        setEditProduct(product);
        setShowProductModal(true);
    };

    if (loading) {
        return (
            <div className="seller-dashboard">
                <div className="products-loading" style={{ minHeight: '60vh' }}>
                    <div className="products-loading__spinner" />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;
    const { stats, recent_sub_orders, products } = data;

    return (
        <div className="seller-dashboard" id="seller-dashboard">
            {/* Header */}
            <section className="seller-dashboard__header">
                <div className="container">
                    <div className="seller-dashboard__header-content">
                        <div>
                            <h1 className="seller-dashboard__title">
                                <BarChart3 size={32} className="seller-dashboard__title-icon" />
                                Seller Dashboard
                            </h1>
                            <p className="seller-dashboard__subtitle">
                                Welcome back, <strong>{user?.username}</strong> — here's your store at a glance
                            </p>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={() => { setEditProduct(null); setShowProductModal(true); }}>
                            <Plus size={20} /> Add Product
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="seller-dashboard__stats">
                <div className="container">
                    <div className="stats-grid">
                        <StatCard icon={Package} label="Products" value={stats.product_count} accent="primary" />
                        <StatCard icon={Layers} label="Total Stock" value={stats.total_stock}
                            sub={stats.low_stock > 0 ? `${stats.low_stock} low stock` : null} />
                        <StatCard icon={ShoppingBag} label="Orders" value={stats.total_orders} accent="accent" />
                        <StatCard icon={TrendingUp} label="Revenue" value={`₹${Number(stats.revenue).toLocaleString()}`} accent="success" />
                        <StatCard icon={DollarSign} label="Net Earnings" value={`₹${Number(stats.net_earnings).toLocaleString()}`} accent="accent"
                            sub={`Commission: ₹${Number(stats.commission_paid).toLocaleString()}`} />
                        {stats.out_of_stock > 0 && (
                            <StatCard icon={AlertTriangle} label="Out of Stock" value={stats.out_of_stock} accent="danger" />
                        )}
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <section className="seller-dashboard__content">
                <div className="container">
                    <div className="dashboard-tabs">
                        <button className={`dashboard-tab ${tab === 'overview' ? 'dashboard-tab--active' : ''}`}
                            onClick={() => setTab('overview')}>
                            <BarChart3 size={18} /> Overview
                        </button>
                        <button className={`dashboard-tab ${tab === 'products' ? 'dashboard-tab--active' : ''}`}
                            onClick={() => setTab('products')}>
                            <Package size={18} /> Products ({stats.product_count})
                        </button>
                        <button className={`dashboard-tab ${tab === 'orders' ? 'dashboard-tab--active' : ''}`}
                            onClick={() => setTab('orders')}>
                            <Truck size={18} /> Orders ({stats.total_orders})
                        </button>
                    </div>

                    {/* Overview Tab */}
                    {tab === 'overview' && (
                        <div className="dashboard-overview">
                            <div className="dashboard-section">
                                <h2 className="dashboard-section__title">
                                    <Truck size={22} /> Recent Orders
                                </h2>
                                {recent_sub_orders.length === 0 ? (
                                    <div className="dashboard-empty">
                                        <ShoppingBag size={40} />
                                        <p>No orders yet. Products from your store will appear here when ordered through rooms.</p>
                                    </div>
                                ) : (
                                    <div className="sub-orders-list">
                                        {recent_sub_orders.slice(0, 5).map((so) => (
                                            <div key={so.id} className="sub-order-row">
                                                <div className="sub-order-row__info">
                                                    <span className="sub-order-row__room">
                                                        Room: <strong>{so.room_name}</strong>
                                                        <span className="sub-order-row__code">#{so.room_code}</span>
                                                    </span>
                                                    <span className="sub-order-row__items">
                                                        {so.items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
                                                    </span>
                                                </div>
                                                <div className="sub-order-row__right">
                                                    <SubStatus status={so.status} />
                                                    <span className="sub-order-row__amount">₹{Number(so.net_amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="dashboard-section">
                                <h2 className="dashboard-section__title">
                                    <AlertTriangle size={22} /> Stock Alerts
                                </h2>
                                {products.filter(p => p.stock <= 5).length === 0 ? (
                                    <div className="dashboard-empty dashboard-empty--sm">
                                        <CheckCircle size={28} color="var(--color-accent)" />
                                        <p>All products are well-stocked!</p>
                                    </div>
                                ) : (
                                    <div className="stock-alerts-list">
                                        {products.filter(p => p.stock <= 5).map(p => (
                                            <div key={p.id} className="stock-alert-row">
                                                <span className="stock-alert-row__name">{p.name}</span>
                                                <span className={`stock-badge ${p.stock === 0 ? 'stock-badge--out' : 'stock-badge--low'}`}>
                                                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                                                </span>
                                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                                    onClick={() => handleEdit(p)}>Restock</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products Tab */}
                    {tab === 'products' && (
                        <div className="dashboard-products">
                            {products.length === 0 ? (
                                <div className="dashboard-empty">
                                    <Package size={48} />
                                    <h3>No products yet</h3>
                                    <p>Add your first product to start selling on SliceBuy.</p>
                                    <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowProductModal(true); }}>
                                        <Plus size={18} /> Add Product
                                    </button>
                                </div>
                            ) : (
                                <div className="products-list-table">
                                    {products.map((product) => (
                                        <ProductRow
                                            key={product.id}
                                            product={product}
                                            onEdit={handleEdit}
                                            onDelete={handleDeleteProduct}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {tab === 'orders' && (
                        <div className="dashboard-orders">
                            {recent_sub_orders.length === 0 ? (
                                <div className="dashboard-empty">
                                    <Truck size={48} />
                                    <h3>No orders yet</h3>
                                    <p>When buyers order your products through Order Rooms, fulfillment details will show here.</p>
                                </div>
                            ) : (
                                <div className="sub-orders-list">
                                    {recent_sub_orders.map((so) => (
                                        <div key={so.id} className="sub-order-card">
                                            <div className="sub-order-card__header">
                                                <div>
                                                    <span className="sub-order-card__room">{so.room_name}</span>
                                                    <span className="sub-order-card__code">#{so.room_code}</span>
                                                </div>
                                                <SubStatus status={so.status} />
                                            </div>
                                            <div className="sub-order-card__items">
                                                {so.items.map((item, i) => (
                                                    <div key={i} className="sub-order-card__item">
                                                        <span>{item.quantity}× {item.product_name}</span>
                                                        <span>₹{Number(item.line_total).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="sub-order-card__footer">
                                                <span>Subtotal: ₹{Number(so.sub_total).toLocaleString()}</span>
                                                <span className="sub-order-card__commission">Commission: -₹{Number(so.commission_amount).toLocaleString()}</span>
                                                <span className="sub-order-card__net">Net: ₹{Number(so.net_amount).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {showProductModal && (
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowProductModal(false); setEditProduct(null); }}
                    onSaved={fetchDashboard}
                />
            )}
        </div>
    );
};

export default SellerDashboard;
