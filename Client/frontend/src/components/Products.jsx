import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Plus, Search, Package, Edit3, Trash2, X, Save,
    DollarSign, BoxSelect, ImagePlus, ShoppingBag, Filter,
    ShoppingCart, CheckCircle, Users, ArrowRight, Star, Zap,
} from 'lucide-react';
import { StarDisplay } from './ProductDetail';
import './Products.css';

/* ── Add / Edit Product Modal ────────────────────────────── */
const ProductModal = ({ product, onClose, onSaved }) => {
    const isEditing = !!product;

    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        stock: product?.stock ?? '',
    });
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name || !form.price) {
            setError('Name and Price are required.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('description', form.description);
            formData.append('price', form.price);
            formData.append('stock', form.stock || 0);
            if (image) formData.append('image', image);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (isEditing) {
                await api.patch(`/products/${product.id}/`, formData, config);
            } else {
                await api.post('/products/', formData, config);
            }

            onSaved();
            onClose();
        } catch (err) {
            setError(
                err.response?.data?.name?.[0] ||
                err.response?.data?.price?.[0] ||
                err.response?.data?.detail ||
                'Something went wrong. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">
                        {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button className="modal__close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form className="modal__form" onSubmit={handleSubmit}>
                    {error && <div className="auth-form__error">{error}</div>}

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="prod-name">Product Name *</label>
                        <div className="auth-form__input-icon-wrapper">
                            <Package size={18} className="auth-form__input-icon" />
                            <input type="text" id="prod-name" name="name" className="auth-form__input"
                                placeholder="e.g. Handmade Leather Bag" value={form.name} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label" htmlFor="prod-desc">Description</label>
                        <textarea id="prod-desc" name="description" className="auth-form__input modal__textarea"
                            placeholder="Describe your product..." value={form.description} onChange={handleChange} rows={3} />
                    </div>

                    <div className="modal__row">
                        <div className="auth-form__group">
                            <label className="auth-form__label" htmlFor="prod-price">Price *</label>
                            <div className="auth-form__input-icon-wrapper">
                                <DollarSign size={18} className="auth-form__input-icon" />
                                <input type="number" id="prod-price" name="price" className="auth-form__input"
                                    placeholder="0.00" min="0" step="0.01" value={form.price} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="auth-form__group">
                            <label className="auth-form__label" htmlFor="prod-stock">Stock</label>
                            <div className="auth-form__input-icon-wrapper">
                                <BoxSelect size={18} className="auth-form__input-icon" />
                                <input type="number" id="prod-stock" name="stock" className="auth-form__input"
                                    placeholder="0" min="0" value={form.stock} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Product Image</label>
                        <label className="modal__file-input" htmlFor="prod-image">
                            <ImagePlus size={20} />
                            <span>{image ? image.name : 'Choose an image...'}</span>
                            <input type="file" id="prod-image" accept="image/*"
                                onChange={(e) => setImage(e.target.files[0])} hidden />
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg auth-form__submit" disabled={loading}>
                        {loading ? 'Saving...' : <>{isEditing ? 'Update' : 'Create'} Product <Save size={18} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ── Delete Confirmation Modal ───────────────────────────── */
const DeleteModal = ({ product, onClose, onDeleted }) => {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await api.delete(`/products/${product.id}/`);
            onDeleted();
            onClose();
        } catch {
            alert('Failed to delete product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">Delete Product</h2>
                    <button className="modal__close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
                    Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>{product.name}</strong>?
                    This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn btn-lg" onClick={handleDelete} disabled={loading}
                        style={{ flex: 1, background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)' }}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Product Card ────────────────────────────────────────── */
const ProductCard = ({ product, isOwner, isBuyer, onEdit, onDelete, activeRoom, onAddToRoom, onBuyNow, addingId, buyingId, onViewDetail }) => {
    const imgUrl = product.image
        ? (product.image.startsWith('http') ? product.image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image}`)
        : null;

    const isAdding = addingId === product.id;
    const isBuying = buyingId === product.id;

    return (
        <div className="product-card" id={`product-${product.id}`}>
            <div className="product-card__image" onClick={() => onViewDetail(product.id)} style={{ cursor: 'pointer' }}>
                {imgUrl ? (
                    <img src={imgUrl} alt={product.name} />
                ) : (
                    <div className="product-card__image-placeholder">
                        <Package size={40} />
                    </div>
                )}
                {product.stock === 0 && (
                    <div className="product-card__badge product-card__badge--out">Out of Stock</div>
                )}
                {product.stock > 0 && product.stock <= 5 && (
                    <div className="product-card__badge product-card__badge--low">Low Stock</div>
                )}
            </div>

            <div className="product-card__body">
                <h3 className="product-card__name" onClick={() => onViewDetail(product.id)} style={{ cursor: 'pointer' }}>
                    {product.name}
                </h3>
                <p className="product-card__seller">by {product.seller_username || 'Seller'}</p>

                {/* Rating */}
                {product.average_rating ? (
                    <div className="product-card__rating" onClick={() => onViewDetail(product.id)} style={{ cursor: 'pointer' }}>
                        <StarDisplay rating={product.average_rating} size={14} />
                        <span className="product-card__rating-text">
                            {product.average_rating} ({product.review_count})
                        </span>
                    </div>
                ) : (
                    <div className="product-card__rating">
                        <span className="product-card__rating-text" style={{ color: 'var(--color-text-muted)' }}>No reviews yet</span>
                    </div>
                )}

                {product.description && (
                    <p className="product-card__desc">
                        {product.description.length > 80
                            ? product.description.substring(0, 80) + '...'
                            : product.description}
                    </p>
                )}
                <div className="product-card__footer">
                    <span className="product-card__price">₹{Number(product.price).toLocaleString()}</span>
                    <span className="product-card__stock">
                        {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}
                    </span>
                </div>

                {/* Seller: Edit/Delete */}
                {isOwner && (
                    <div className="product-card__actions">
                        <button className="product-card__action-btn" onClick={() => onEdit(product)} title="Edit">
                            <Edit3 size={16} /> Edit
                        </button>
                        <button className="product-card__action-btn product-card__action-btn--danger" onClick={() => onDelete(product)} title="Delete">
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                )}

                {/* Buyer: Buy Now + Add to Room */}
                {isBuyer && !isOwner && product.stock > 0 && (
                    <div className="product-card__buy-actions">
                        <button
                            className="product-card__buy-now"
                            onClick={() => onBuyNow(product.id)}
                            disabled={isBuying}
                        >
                            {isBuying ? (
                                <><span className="product-card__add-spinner" /> Processing...</>
                            ) : (
                                <><Zap size={16} /> Buy Now</>
                            )}
                        </button>
                        {activeRoom && (
                            <button
                                className="product-card__add-to-room"
                                onClick={() => onAddToRoom(product.id)}
                                disabled={isAdding}
                            >
                                {isAdding ? (
                                    <><span className="product-card__add-spinner" /> Adding...</>
                                ) : (
                                    <><ShoppingCart size={16} /> Add to Room</>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Main Products Page ──────────────────────────────────── */
const Products = () => {
    const { user, isAuthenticated, isSeller } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [deleteProduct, setDeleteProduct] = useState(null);

    // Room integration (buyers)
    const [myRooms, setMyRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [addingId, setAddingId] = useState(null);
    const [buyingId, setBuyingId] = useState(null);
    const [addedProducts, setAddedProducts] = useState(new Set());
    const [toast, setToast] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products/');
            setProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch user's open rooms
    const fetchMyRooms = async () => {
        if (!isAuthenticated || isSeller) return;
        try {
            const res = await api.get('/orders/rooms/');
            const openRooms = res.data.filter(r => r.status === 'open');
            setMyRooms(openRooms);
            // Auto-select the most recent open room
            if (openRooms.length > 0 && !activeRoom) {
                setActiveRoom(openRooms[0]);
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        }
    };

    useEffect(() => { fetchProducts(); }, []);
    useEffect(() => { fetchMyRooms(); }, [isAuthenticated, isSeller]);

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (product) => {
        setEditProduct(product);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditProduct(null);
    };

    // Add product to active room
    const handleAddToRoom = async (productId) => {
        if (!activeRoom) return;
        setAddingId(productId);
        try {
            await api.post(`/orders/rooms/${activeRoom.room_code}/add_item/`, {
                product_id: productId,
                quantity: 1,
            });
            setAddedProducts(prev => new Set([...prev, productId]));
            const p = products.find(pr => pr.id === productId);
            showToast(`${p?.name || 'Product'} added to ${activeRoom.name}!`);
        } catch (err) {
            showToast(err.response?.data?.detail || err.response?.data?.error || 'Failed to add item', true);
        } finally {
            setAddingId(null);
        }
    };

    const showToast = (message, isError = false) => {
        setToast({ message, isError });
        setTimeout(() => setToast(null), 3000);
    };

    // Buy Now: navigate to checkout page
    const handleBuyNow = (productId) => {
        navigate(`/checkout?product=${productId}&qty=1`);
    };

    return (
        <div className="products-page" id="products-page">
            {/* Header */}
            <section className="products-header">
                <div className="container">
                    <div className="products-header__content">
                        <div>
                            <h1 className="products-header__title">
                                <ShoppingBag size={36} className="products-header__icon" />
                                Marketplace
                            </h1>
                            <p className="products-header__subtitle">
                                Discover unique products from sellers around the world
                            </p>
                        </div>

                        {isAuthenticated && isSeller && (
                            <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)} id="add-product-btn">
                                <Plus size={20} /> Add Product
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="products-search">
                        <Search size={20} className="products-search__icon" />
                        <input
                            type="text" className="products-search__input"
                            placeholder="Search products by name or description..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            id="products-search-input"
                        />
                        <div className="products-search__count">
                            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </section>

            {/* Room Shopping Bar (Buyers only) */}
            {isAuthenticated && !isSeller && (
                <section className="room-shopping-bar">
                    <div className="container">
                        <div className="room-shopping-bar__inner">
                            {myRooms.length > 0 ? (
                                <>
                                    <div className="room-shopping-bar__info">
                                        <ShoppingCart size={20} />
                                        <span>Shopping for:</span>
                                        <select
                                            className="room-shopping-bar__select"
                                            value={activeRoom?.room_code || ''}
                                            onChange={(e) => {
                                                const room = myRooms.find(r => r.room_code === e.target.value);
                                                setActiveRoom(room || null);
                                                setAddedProducts(new Set());
                                            }}
                                        >
                                            {myRooms.map(r => (
                                                <option key={r.room_code} value={r.room_code}>
                                                    {r.name} ({r.member_count} members)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="room-shopping-bar__actions">
                                        {addedProducts.size > 0 && (
                                            <span className="room-shopping-bar__badge">
                                                <CheckCircle size={14} /> {addedProducts.size} added
                                            </span>
                                        )}
                                        <button
                                            className="btn btn-accent"
                                            onClick={() => navigate(`/orders/${activeRoom?.room_code}`)}
                                        >
                                            View Room <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="room-shopping-bar__info">
                                        <Zap size={20} />
                                        <span>Click <strong>Buy Now</strong> on any product for instant purchase, or <strong>create a room</strong> to shop with friends!</span>
                                    </div>
                                    <div className="room-shopping-bar__actions">
                                        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
                                            <Users size={16} /> Create Group Room
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Product Grid */}
            <section className="products-grid-section">
                <div className="container">
                    {loading ? (
                        <div className="products-loading">
                            <div className="products-loading__spinner" />
                            <p>Loading products...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="products-empty">
                            <Package size={56} />
                            <h3>No Products Found</h3>
                            <p>
                                {searchQuery
                                    ? 'Try a different search term.'
                                    : 'Be the first to list a product on SliceBuy!'}
                            </p>
                            {isAuthenticated && isSeller && !searchQuery && (
                                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    <Plus size={18} /> Add Your First Product
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="products-grid">
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    isOwner={user && product.seller === user.id}
                                    isBuyer={isAuthenticated && !isSeller}
                                    onEdit={handleEdit}
                                    onDelete={setDeleteProduct}
                                    activeRoom={activeRoom}
                                    onAddToRoom={handleAddToRoom}
                                    onBuyNow={handleBuyNow}
                                    addingId={addingId}
                                    buyingId={buyingId}
                                    onViewDetail={(id) => navigate(`/products/${id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Modals */}
            {showModal && (
                <ProductModal product={editProduct} onClose={handleCloseModal} onSaved={fetchProducts} />
            )}
            {deleteProduct && (
                <DeleteModal product={deleteProduct} onClose={() => setDeleteProduct(null)} onDeleted={fetchProducts} />
            )}

            {/* Toast */}
            {toast && (
                <div className={`products-toast ${toast.isError ? 'products-toast--error' : ''}`}>
                    {toast.isError ? <X size={16} /> : <CheckCircle size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default Products;
