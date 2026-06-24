import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    CreditCard, ShieldCheck, Truck, ArrowLeft,
    CheckCircle, Package, Zap, MapPin,
} from 'lucide-react';
import DemoPaymentModal from './DemoPaymentModal';
import AddressForm from './AddressForm';
import './Checkout.css';

const DELIVERY_FEE = 99;

/* ── Load Razorpay SDK ────────────────────────────────────── */
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-sdk')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-sdk';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const productId = searchParams.get('product');
    const qty = parseInt(searchParams.get('qty') || '1', 10);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [paymentId, setPaymentId] = useState('');
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [demoOrderData, setDemoOrderData] = useState(null);

    const [address, setAddress] = useState({
        fullName: user?.username || '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!productId) { navigate('/'); return; }
        const fetchProduct = async () => {
            try {
                const res = await api.get(`/products/${productId}/`);
                setProduct(res.data);
            } catch {
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
        loadRazorpayScript();
    }, [productId, navigate]);

    const handleChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!address.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!address.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\d{10}$/.test(address.phone.trim())) newErrors.phone = 'Enter a valid 10-digit number';
        if (!address.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
        if (!address.city.trim()) newErrors.city = 'City is required';
        if (!address.state.trim()) newErrors.state = 'State is required';
        if (!address.pincode.trim()) newErrors.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(address.pincode.trim())) newErrors.pincode = 'Enter a valid 6-digit pincode';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePlaceOrder = async () => {
        if (!validate()) return;

        setPlacing(true);
        try {
            // Create order on backend
            const res = await api.post('/orders/direct-checkout/create/', {
                product_id: productId,
                quantity: qty,
            });
            // Show demo payment modal
            setDemoOrderData(res.data);
            setShowDemoModal(true);
            setPlacing(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to initiate payment.');
            setPlacing(false);
        }
    };

    const handleDemoSuccess = async (response) => {
        setShowDemoModal(false);
        setPlacing(true);
        try {
            await api.post('/orders/direct-checkout/verify/', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                product_id: productId,
                quantity: qty,
            });
            setPaymentId(response.razorpay_payment_id);
            setOrderPlaced(true);
        } catch (err) {
            alert(err.response?.data?.error || 'Payment verification failed. Please contact support.');
        } finally {
            setPlacing(false);
        }
    };

    const handleDemoDismiss = () => {
        setShowDemoModal(false);
        setPlacing(false);
    };


    if (loading) {
        return (
            <div className="checkout-page">
                <div className="checkout-loading">
                    <div className="checkout-loading__spinner" />
                    <p>Loading checkout...</p>
                </div>
            </div>
        );
    }

    if (orderPlaced) {
        return (
            <div className="checkout-page">
                <div className="checkout-success">
                    <div className="checkout-success__icon">
                        <CheckCircle size={64} />
                    </div>
                    <h1 className="checkout-success__title">Payment Successful!</h1>
                    <p className="checkout-success__text">
                        Your order for <strong>{product?.name}</strong> has been confirmed.
                        You'll receive a confirmation email shortly.
                    </p>
                    <div className="checkout-success__details">
                        <div className="checkout-success__detail">
                            <CreditCard size={18} />
                            <span>Payment ID: {paymentId}</span>
                        </div>
                        <div className="checkout-success__detail">
                            <Package size={18} />
                            <span>Amount: ₹{(Number(product?.price) * qty + DELIVERY_FEE).toLocaleString()}</span>
                        </div>
                        <div className="checkout-success__detail">
                            <Truck size={18} />
                            <span>Estimated delivery: 3-5 business days</span>
                        </div>
                        <div className="checkout-success__detail">
                            <MapPin size={18} />
                            <span>{address.addressLine1}, {address.city}, {address.state} - {address.pincode}</span>
                        </div>
                    </div>
                    <div className="checkout-success__actions">
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const itemTotal = product ? Number(product.price) * qty : 0;
    const total = itemTotal + DELIVERY_FEE;

    const imgUrl = product?.image
        ? (product.image.startsWith('http') ? product.image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image}`)
        : null;

    return (
        <>
        <div className="checkout-page" id="checkout-page">
            {/* Header */}
            <div className="checkout-header">
                <div className="container">
                    <button className="checkout-header__back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="checkout-header__title">
                        <CreditCard size={28} /> Checkout
                    </h1>
                </div>
            </div>

            <div className="checkout-body container">
                {/* Left: Delivery Address */}
                <div className="checkout-address">
                    <div className="checkout-section">
                        <h2 className="checkout-section__title">
                            <MapPin size={22} /> Delivery Address
                        </h2>
                        <p className="checkout-section__subtitle">
                            Enter the address where you'd like your order delivered
                        </p>

                        <AddressForm
                            address={address}
                            errors={errors}
                            onChange={handleChange}
                            onSubmit={handlePlaceOrder}
                            idPrefix="checkout"
                        />
                    </div>
                </div>

                {/* Right: Order Summary */}
                <div className="checkout-summary">
                    <div className="checkout-section">
                        <h2 className="checkout-section__title">
                            <Package size={22} /> Order Summary
                        </h2>

                        <div className="checkout-product">
                            <div className="checkout-product__image">
                                {imgUrl ? (
                                    <img src={imgUrl} alt={product.name} />
                                ) : (
                                    <div className="checkout-product__placeholder"><Package size={32} /></div>
                                )}
                            </div>
                            <div className="checkout-product__info">
                                <h3>{product?.name}</h3>
                                <p className="checkout-product__seller">by {product?.seller_username || 'Seller'}</p>
                                <p className="checkout-product__qty">Qty: {qty}</p>
                            </div>
                            <div className="checkout-product__price">
                                ₹{itemTotal.toLocaleString()}
                            </div>
                        </div>

                        <div className="checkout-breakdown">
                            <div className="checkout-breakdown__row">
                                <span>Item Total</span>
                                <span>₹{itemTotal.toLocaleString()}</span>
                            </div>
                            <div className="checkout-breakdown__row">
                                <span><Truck size={14} /> Delivery Fee</span>
                                <span>₹{DELIVERY_FEE}</span>
                            </div>
                            <div className="checkout-breakdown__divider" />
                            <div className="checkout-breakdown__row checkout-breakdown__row--total">
                                <span>Total</span>
                                <span>₹{total.toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-lg checkout-place-order"
                            onClick={handlePlaceOrder}
                            disabled={placing}
                            id="place-order-btn"
                        >
                            {placing ? (
                                <><span className="checkout-spinner" /> Processing Payment...</>
                            ) : (
                                <><Zap size={20} /> Pay ₹{total.toLocaleString()} with Razorpay</>
                            )}
                        </button>

                        <div className="checkout-trust">
                            <div className="checkout-trust__item">
                                <ShieldCheck size={16} /> Secure Razorpay payment
                            </div>
                            <div className="checkout-trust__item">
                                <Truck size={16} /> Free returns within 7 days
                            </div>
                            <div className="checkout-trust__item">
                                <CreditCard size={16} /> UPI, Cards, Wallets accepted
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {showDemoModal && demoOrderData && (
            <DemoPaymentModal
                amount={demoOrderData.amount}
                currency={demoOrderData.currency || 'INR'}
                orderName={`${product?.name} × ${qty}`}
                razorpayOrderId={demoOrderData.razorpay_order_id}
                onSuccess={handleDemoSuccess}
                onDismiss={handleDemoDismiss}
            />
        )}
    </>
    );
};

export default Checkout;
