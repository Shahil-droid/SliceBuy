import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    ArrowLeft, Package, Star, Send, Edit3, Trash2,
    User, Clock, X, ShoppingCart,
} from 'lucide-react';
import './ProductDetail.css';

/* ── Star Rating (interactive) ──────────────────────────── */
const StarRating = ({ value = 0, onChange, size = 20, readonly = false }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className={`star-rating ${readonly ? 'star-rating--readonly' : ''}`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`star-rating__star ${star <= (hover || value) ? 'star-rating__star--filled' : ''
                        }`}
                    onClick={() => !readonly && onChange?.(star)}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    disabled={readonly}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                    <Star size={size} />
                </button>
            ))}
        </div>
    );
};

/* ── Star Display (read-only, fractional) ───────────────── */
const StarDisplay = ({ rating, size = 16 }) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.3;
    const empty = 5 - full - (hasHalf ? 1 : 0);

    return (
        <div className="star-display">
            {Array.from({ length: full }).map((_, i) => (
                <Star key={`f${i}`} size={size} className="star-display__star--filled" />
            ))}
            {hasHalf && (
                <div className="star-display__half" style={{ width: size, height: size }}>
                    <Star size={size} className="star-display__star--filled" />
                    <Star size={size} className="star-display__star--empty" />
                </div>
            )}
            {Array.from({ length: empty }).map((_, i) => (
                <Star key={`e${i}`} size={size} className="star-display__star--empty" />
            ))}
        </div>
    );
};

/* ── Single Review Card ─────────────────────────────────── */
const ReviewCard = ({ review, isAuthor, onEdit, onDelete }) => (
    <div className="review-card">
        <div className="review-card__header">
            <div className="review-card__user">
                <div className="review-card__avatar">
                    {review.username[0].toUpperCase()}
                </div>
                <div>
                    <span className="review-card__username">{review.username}</span>
                    <span className="review-card__date">
                        <Clock size={12} />
                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                        })}
                    </span>
                </div>
            </div>
            <div className="review-card__rating">
                <StarDisplay rating={review.rating} size={14} />
            </div>
        </div>
        {review.comment && (
            <p className="review-card__comment">{review.comment}</p>
        )}
        {isAuthor && (
            <div className="review-card__actions">
                <button className="review-card__action" onClick={() => onEdit(review)}>
                    <Edit3 size={14} /> Edit
                </button>
                <button className="review-card__action review-card__action--danger" onClick={() => onDelete(review)}>
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        )}
    </div>
);

/* ── Review Form ────────────────────────────────────────── */
const ReviewForm = ({ productId, existingReview, onSaved, onCancel }) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!existingReview;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a rating.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            if (isEditing) {
                await api.put(`/products/${productId}/reviews/${existingReview.id}/`, {
                    rating,
                    comment,
                });
            } else {
                await api.post(`/products/${productId}/reviews/`, {
                    rating,
                    comment,
                });
            }
            onSaved();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.response?.data?.rating?.[0] ||
                err.response?.data?.detail ||
                'Failed to submit review.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="review-form" onSubmit={handleSubmit}>
            <h4 className="review-form__title">
                {isEditing ? 'Edit Your Review' : 'Write a Review'}
            </h4>

            {error && <div className="review-form__error">{error}</div>}

            <div className="review-form__rating">
                <span className="review-form__label">Your Rating</span>
                <StarRating value={rating} onChange={setRating} size={28} />
            </div>

            <textarea
                className="review-form__textarea"
                placeholder="Share your experience with this product... (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
            />

            <div className="review-form__actions">
                {isEditing && (
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={loading || rating === 0}>
                    {loading ? 'Submitting...' : (
                        <><Send size={16} /> {isEditing ? 'Update Review' : 'Submit Review'}</>
                    )}
                </button>
            </div>
        </form>
    );
};

/* ── Rating Summary Bar ─────────────────────────────────── */
const RatingSummary = ({ reviews, averageRating, reviewCount }) => {
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
    }));

    return (
        <div className="rating-summary">
            <div className="rating-summary__score">
                <span className="rating-summary__number">{averageRating || '—'}</span>
                <StarDisplay rating={averageRating || 0} size={20} />
                <span className="rating-summary__count">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="rating-summary__bars">
                {distribution.map(({ star, count }) => (
                    <div key={star} className="rating-bar">
                        <span className="rating-bar__label">{star} <Star size={12} /></span>
                        <div className="rating-bar__track">
                            <div
                                className="rating-bar__fill"
                                style={{ width: reviewCount > 0 ? `${(count / reviewCount) * 100}%` : '0%' }}
                            />
                        </div>
                        <span className="rating-bar__count">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Product Detail Page ────────────────────────────────── */
const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(null);
    const [reviewCount, setReviewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingReview, setEditingReview] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const fetchProduct = async () => {
        try {
            const res = await api.get(`/products/${id}/`);
            setProduct(res.data);
        } catch {
            setProduct(null);
        }
    };

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/products/${id}/reviews/`);
            setReviews(res.data.reviews);
            setAverageRating(res.data.average_rating);
            setReviewCount(res.data.review_count);
        } catch {
            setReviews([]);
        }
    };

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchProduct(), fetchReviews()]);
            setLoading(false);
        };
        loadAll();
    }, [id]);

    const myReview = reviews.find((r) => r.user === user?.id);
    const isOwner = product && user && product.seller === user.id;

    const handleReviewSaved = () => {
        setShowForm(false);
        setEditingReview(null);
        fetchReviews();
        fetchProduct();
    };

    const handleEdit = (review) => {
        setEditingReview(review);
        setShowForm(true);
    };

    const handleDelete = async (review) => {
        if (!confirm('Delete your review?')) return;
        try {
            await api.delete(`/products/${id}/reviews/${review.id}/`);
            fetchReviews();
            fetchProduct();
        } catch {
            alert('Failed to delete review.');
        }
    };

    if (loading) {
        return (
            <div className="product-detail-page">
                <div className="products-loading" style={{ minHeight: '60vh' }}>
                    <div className="products-loading__spinner" />
                    <p>Loading product...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-detail-page">
                <div className="products-empty" style={{ minHeight: '60vh' }}>
                    <Package size={56} />
                    <h3>Product Not Found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/products')}>
                        <ArrowLeft size={18} /> Back to Products
                    </button>
                </div>
            </div>
        );
    }

    const imgUrl = product.image
        ? (product.image.startsWith('http') ? product.image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image}`)
        : null;

    return (
        <div className="product-detail-page" id="product-detail-page">
            <div className="container">
                {/* Back button */}
                <button className="product-detail-back" onClick={() => navigate('/products')}>
                    <ArrowLeft size={18} /> Back to Products
                </button>

                {/* Product Hero */}
                <div className="product-detail-hero">
                    <div className="product-detail-hero__image">
                        {imgUrl ? (
                            <img src={imgUrl} alt={product.name} />
                        ) : (
                            <div className="product-detail-hero__placeholder">
                                <Package size={64} />
                            </div>
                        )}
                    </div>

                    <div className="product-detail-hero__info">
                        <h1 className="product-detail-hero__name">{product.name}</h1>
                        <p className="product-detail-hero__seller">
                            by <strong>{product.seller_username}</strong>
                        </p>

                        {averageRating && (
                            <div className="product-detail-hero__rating">
                                <StarDisplay rating={averageRating} size={20} />
                                <span className="product-detail-hero__rating-text">
                                    {averageRating} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                                </span>
                            </div>
                        )}

                        <div className="product-detail-hero__price">
                            ₹{Number(product.price).toLocaleString()}
                        </div>

                        <p className="product-detail-hero__stock">
                            {product.stock > 0 ? (
                                <><span className="stock-dot stock-dot--in" /> {product.stock} in stock</>
                            ) : (
                                <><span className="stock-dot stock-dot--out" /> Out of stock</>
                            )}
                        </p>

                        {product.description && (
                            <p className="product-detail-hero__desc">{product.description}</p>
                        )}
                    </div>
                </div>

                {/* Reviews Section */}
                <section className="product-reviews-section" id="reviews">
                    <h2 className="product-reviews-section__title">
                        <Star size={24} /> Ratings & Reviews
                    </h2>

                    {/* Rating Summary */}
                    {reviewCount > 0 && (
                        <RatingSummary
                            reviews={reviews}
                            averageRating={averageRating}
                            reviewCount={reviewCount}
                        />
                    )}

                    {/* Write / Edit Review */}
                    {isAuthenticated && !isOwner && !myReview && !showForm && (
                        <button
                            className="btn btn-primary product-reviews-section__write-btn"
                            onClick={() => setShowForm(true)}
                        >
                            <Edit3 size={16} /> Write a Review
                        </button>
                    )}

                    {showForm && (
                        <ReviewForm
                            productId={id}
                            existingReview={editingReview}
                            onSaved={handleReviewSaved}
                            onCancel={() => { setShowForm(false); setEditingReview(null); }}
                        />
                    )}

                    {!isAuthenticated && (
                        <p className="product-reviews-section__login-prompt">
                            <a href="/login">Log in</a> to leave a review.
                        </p>
                    )}

                    {/* Reviews List */}
                    {reviews.length === 0 ? (
                        <div className="product-reviews-empty">
                            <Star size={40} />
                            <p>No reviews yet. Be the first to share your experience!</p>
                        </div>
                    ) : (
                        <div className="product-reviews-list">
                            {reviews.map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    review={review}
                                    isAuthor={user && review.user === user.id}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export { StarDisplay };
export default ProductDetail;
