import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    CreditCard, ShieldCheck, Truck, ArrowLeft,
    CheckCircle, Package, Zap, Users, MapPin
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

const RoomCheckout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { roomCode } = useParams();

    const [shareData, setShareData] = useState(null);
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
        const fetchShare = async () => {
            try {
                const res = await api.get(`/orders/rooms/${roomCode}/my_share/`);
                setShareData(res.data);
            } catch (err) {
                console.error(err);
                navigate(`/orders/${roomCode}`);
            } finally {
                setLoading(false);
            }
        };
        fetchShare();
        // Pre-load Razorpay SDK in background (not awaited here)
        loadRazorpayScript();
    }, [roomCode, navigate]);

    const handleChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validate = () => {
        if (!shareData?.is_creator) return true;
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
            // Create Razorpay order via room payment endpoint
            const res = await api.post(`/orders/rooms/${roomCode}/pay/create_order/`);
            const orderData = res.data;
            // Show demo payment modal instead of Razorpay modal
            setDemoOrderData(orderData);
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
            const payload = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
            };
            if (shareData?.is_creator) {
                payload.delivery_address = JSON.stringify(address);
            }
            await api.post(`/orders/rooms/${roomCode}/pay/verify/`, payload);
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
                    <p>Loading your room share...</p>
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
                        Your share for room <strong>#{roomCode}</strong> has been secured.
                        Once all members pay, the order will be confirmed!
                    </p>
                    <div className="checkout-success__details">
                        <div className="checkout-success__detail">
                            <CreditCard size={18} />
                            <span>Payment ID: {paymentId}</span>
                        </div>
                        <div className="checkout-success__detail">
                            <Package size={18} />
                            <span>Amount Paid: ₹{Number(shareData?.amount_owed).toLocaleString()}</span>
                        </div>
                        <div className="checkout-success__detail">
                            <Users size={18} />
                            <span>Split Mode: {shareData?.split_mode}</span>
                        </div>
                    </div>
                    <div className="checkout-success__actions">
                        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/orders/${roomCode}`)}>
                            Return to Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const amountOwed = Number(shareData?.amount_owed) || 0;
    // The backend calculates the amount owed properly. We don't add delivery fee on top again if it's already divided,
    // actually SliceBuy's room setup might not explicitly add a delivery fee, but to match the UI style we just show the amount owed directly.
    const total = amountOwed;

    return (
        <>
        <div className="checkout-page" id="room-checkout-page">
            {/* Header */}
            <div className="checkout-header">
                <div className="container">
                    <button className="checkout-header__back" onClick={() => navigate(`/orders/${roomCode}`)}>
                        <ArrowLeft size={20} /> Back to Room
                    </button>
                    <h1 className="checkout-header__title">
                        <CreditCard size={28} /> Group Checkout
                    </h1>
                </div>
            </div>

            <div className="checkout-body container">
                {/* Left: Component */}
                <div className="checkout-address">
                    {shareData?.is_creator ? (
                        <div className="checkout-section">
                            <h2 className="checkout-section__title">
                                <MapPin size={22} /> Delivery Address
                            </h2>
                            <p className="checkout-section__subtitle">
                                Enter the delivery address for the entire room.
                            </p>

                            <AddressForm
                                address={address}
                                errors={errors}
                                onChange={handleChange}
                                onSubmit={handlePlaceOrder}
                                idPrefix="room-checkout"
                            />
                        </div>
                    ) : (
                        <div className="checkout-section" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)' }}>
                            <div style={{ padding: '2rem', background: 'var(--color-bg-elevated)', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <Truck size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Delivery Managed by Creator</h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>The person who created this room is responsible for setting the delivery address.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Order Summary */}
                <div className="checkout-summary">
                    <div className="checkout-section">
                        <h2 className="checkout-section__title">
                            <Users size={22} /> Your Share: Room #{roomCode}
                        </h2>

                        <div className="checkout-breakdown" style={{ marginTop: 'var(--space-md)' }}>
                            <div className="checkout-breakdown__row">
                                <span>Split Mode</span>
                                <span style={{ textTransform: 'capitalize' }}>{shareData?.split_mode}</span>
                            </div>

                            {/* Render User's Items */}
                            {shareData?.my_items?.length > 0 && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                                    <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>Your Items</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                                        {shareData.my_items.map(item => {
                                            const imgUrl = item.product_image ? (item.product_image.startsWith('http') ? item.product_image : `${import.meta.env.VITE_API_URL}${item.product_image}`) : null;
                                            return (
                                                <div className="checkout-product" key={item.id} style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                                    <div className="checkout-product__image" style={{ width: 60, height: 60 }}>
                                                        {imgUrl ? (
                                                            <img src={imgUrl} alt={item.product_name} style={{ borderRadius: '8px' }} />
                                                        ) : (
                                                            <div className="checkout-product__placeholder" style={{ borderRadius: '8px' }}><Package size={20} /></div>
                                                        )}
                                                    </div>
                                                    <div className="checkout-product__info">
                                                        <h3 style={{ fontSize: '0.95rem' }}>{item.product_name}</h3>
                                                        <p className="checkout-product__seller" style={{ fontSize: '0.8rem' }}>by {item.seller_username}</p>
                                                        <p className="checkout-product__qty" style={{ fontSize: '0.8rem' }}>Qty: {item.quantity}</p>
                                                    </div>
                                                    <div className="checkout-product__price" style={{ fontSize: '0.95rem' }}>
                                                        ₹{Number(item.line_total).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="checkout-breakdown__row">
                                <span>Room Total</span>
                                <span>₹{Number(shareData?.room_total).toLocaleString()}</span>
                            </div>
                            
                            <div className="checkout-breakdown__divider" />
                            <div className="checkout-breakdown__row checkout-breakdown__row--total">
                                <span>Your Amount Owed</span>
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
                                <Users size={16} /> Order confirms once all members pay
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
                orderName={`Room: ${demoOrderData.room_name}`}
                razorpayOrderId={demoOrderData.razorpay_order_id}
                onSuccess={handleDemoSuccess}
                onDismiss={handleDemoDismiss}
            />
        )}
    </>
    );
};

export default RoomCheckout;
