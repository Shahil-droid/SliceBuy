import { useState } from 'react';
import { ShieldCheck, CreditCard, Smartphone, X, Zap, Lock, CheckCircle } from 'lucide-react';

/**
 * DemoPaymentModal
 * A fake payment gateway modal for demo / test mode.
 * Calls onSuccess({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
 * or onDismiss() if cancelled.
 *
 * The payment_id is prefixed with 'test_' so the backend can bypass signature
 * verification when DEBUG=True.
 */
const DemoPaymentModal = ({ amount, currency = 'INR', orderName, razorpayOrderId, onSuccess, onDismiss }) => {
    const [step, setStep] = useState('select'); // select | processing | done
    const [method, setMethod] = useState(null);
    const [cardNum, setCardNum] = useState('4111 1111 1111 1111');
    const [expiry, setExpiry] = useState('12/26');
    const [cvv, setCvv] = useState('111');
    const [upiId, setUpiId] = useState('success@razorpay');
    const [otp, setOtp] = useState('');

    const formattedAmount = `₹${Number(amount / 100).toLocaleString('en-IN')}`;

    const simulatePayment = async () => {
        setStep('processing');
        // Simulate network delay
        await new Promise(r => setTimeout(r, 1800));
        const fakePaymentId = `test_pay_${Date.now()}`;
        onSuccess({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: fakePaymentId,
            razorpay_signature: 'test_signature_bypass',
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px',
                width: '100%', maxWidth: '480px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                overflow: 'hidden', fontFamily: 'Inter, sans-serif',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    color: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>SliceBuy Checkout</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>🔒 Secured Demo Gateway</div>
                        </div>
                    </div>
                    <button onClick={onDismiss} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        borderRadius: '50%', width: 32, height: 32,
                        cursor: 'pointer', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Amount bar */}
                <div style={{
                    background: '#f8f5ff', padding: '12px 20px',
                    borderBottom: '1px solid #e9e0ff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{ color: '#555', fontSize: '0.9rem' }}>{orderName}</span>
                    <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#6c5ce7' }}>{formattedAmount}</span>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    {step === 'select' && !method && (
                        <>
                            <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '14px' }}>
                                <span style={{
                                    background: '#fff3cd', color: '#856404',
                                    padding: '4px 8px', borderRadius: '6px',
                                    fontSize: '0.8rem', fontWeight: 500,
                                }}>
                                    ⚡ Demo Mode — No real money is charged
                                </span>
                            </p>
                            <p style={{ fontWeight: 600, color: '#333', marginBottom: '12px' }}>Choose payment method:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { key: 'card', icon: <CreditCard size={20} />, label: 'Credit / Debit Card', sub: 'Test card: 4111 1111 1111 1111' },
                                    { key: 'upi', icon: <Smartphone size={20} />, label: 'UPI', sub: 'Test UPI: success@razorpay' },
                                ].map(m => (
                                    <button key={m.key} onClick={() => setMethod(m.key)} style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '14px 16px', borderRadius: '10px',
                                        border: '1.5px solid #e0d9ff', background: '#fff',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.2s',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6c5ce7'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e0d9ff'}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '10px',
                                            background: '#f0ecff', color: '#6c5ce7',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>{m.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>{m.label}</div>
                                            <div style={{ color: '#888', fontSize: '0.78rem' }}>{m.sub}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 'select' && method === 'card' && (
                        <div>
                            <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer', marginBottom: '12px', fontSize: '0.85rem' }}>← Back</button>
                            <p style={{ fontWeight: 600, color: '#333', marginBottom: '14px' }}>Enter card details</p>
                            {[
                                { label: 'Card Number', value: cardNum, set: setCardNum, placeholder: '4111 1111 1111 1111' },
                                { label: 'Expiry (MM/YY)', value: expiry, set: setExpiry, placeholder: '12/26' },
                                { label: 'CVV', value: cvv, set: setCvv, placeholder: '111', type: 'password' },
                            ].map(f => (
                                <div key={f.label} style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>{f.label}</label>
                                    <input
                                        type={f.type || 'text'}
                                        value={f.value}
                                        onChange={e => f.set(e.target.value)}
                                        placeholder={f.placeholder}
                                        style={{
                                            width: '100%', padding: '10px 12px',
                                            border: '1.5px solid #ddd', borderRadius: '8px',
                                            fontSize: '0.95rem', boxSizing: 'border-box',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            ))}
                            <button onClick={simulatePayment} style={{
                                width: '100%', padding: '13px',
                                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                                color: '#fff', border: 'none', borderRadius: '10px',
                                fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            }}>
                                <Lock size={16} /> Pay {formattedAmount}
                            </button>
                        </div>
                    )}

                    {step === 'select' && method === 'upi' && (
                        <div>
                            <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer', marginBottom: '12px', fontSize: '0.85rem' }}>← Back</button>
                            <p style={{ fontWeight: 600, color: '#333', marginBottom: '14px' }}>Enter UPI ID</p>
                            <input
                                type="text"
                                value={upiId}
                                onChange={e => setUpiId(e.target.value)}
                                placeholder="yourname@upi"
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    border: '1.5px solid #ddd', borderRadius: '8px',
                                    fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '14px',
                                }}
                            />
                            <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '14px' }}>
                                Use <strong>success@razorpay</strong> for a successful test payment.
                            </p>
                            <button onClick={simulatePayment} style={{
                                width: '100%', padding: '13px',
                                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                                color: '#fff', border: 'none', borderRadius: '10px',
                                fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            }}>
                                <Zap size={16} /> Verify & Pay {formattedAmount}
                            </button>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                border: '4px solid #f0ecff',
                                borderTopColor: '#6c5ce7',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto 16px',
                            }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            <p style={{ fontWeight: 600, color: '#333' }}>Processing payment...</p>
                            <p style={{ color: '#888', fontSize: '0.85rem' }}>Please wait, do not close this window.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    color: '#aaa', fontSize: '0.75rem',
                }}>
                    <ShieldCheck size={13} />
                    Secured by SliceBuy Demo Gateway · No real charges
                </div>
            </div>
        </div>
    );
};

export default DemoPaymentModal;
