import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Star,
    Shield,
    Zap,
    Globe,
    TrendingUp,
    Users,
    Package,
    ChevronRight,
    Sparkles,
    Store,
    CreditCard,
    Truck,
    Heart,
} from 'lucide-react';
import heroImage from '../assets/hero-marketplace.png';
import './Home.css';

/* ── Stat Counter Animation ──────────────────────────────── */
const useCountUp = (end, duration = 2000, startOnView = true) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        if (!startOnView) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    let start = 0;
                    const increment = end / (duration / 16);
                    const timer = setInterval(() => {
                        start += increment;
                        if (start >= end) {
                            setCount(end);
                            clearInterval(timer);
                        } else {
                            setCount(Math.floor(start));
                        }
                    }, 16);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration, startOnView]);

    return [count, ref];
};

/* ── Featured Category Card ──────────────────────────────── */
const CategoryCard = ({ icon: Icon, title, count, color, delay }) => (
    <div
        className="category-card animate-fade-in-up"
        style={{ animationDelay: `${delay}s`, '--category-color': color }}
    >
        <div className="category-card__icon">
            <Icon size={28} />
        </div>
        <h3 className="category-card__title">{title}</h3>
        <p className="category-card__count">{count}+ Products</p>
        <ChevronRight size={18} className="category-card__arrow" />
    </div>
);

/* ── Feature Card ────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <div
        className="feature-card animate-fade-in-up"
        style={{ animationDelay: `${delay}s` }}
    >
        <div className="feature-card__icon">
            <Icon size={24} />
        </div>
        <h3 className="feature-card__title">{title}</h3>
        <p className="feature-card__description">{description}</p>
    </div>
);

/* ── Testimonial Card ────────────────────────────────────── */
const TestimonialCard = ({ name, role, content, rating, avatar, delay }) => (
    <div
        className="testimonial-card animate-fade-in-up"
        style={{ animationDelay: `${delay}s` }}
    >
        <div className="testimonial-card__stars">
            {[...Array(rating)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
            ))}
        </div>
        <p className="testimonial-card__content">"{content}"</p>
        <div className="testimonial-card__author">
            <div className="testimonial-card__avatar">{avatar}</div>
            <div>
                <p className="testimonial-card__name">{name}</p>
                <p className="testimonial-card__role">{role}</p>
            </div>
        </div>
    </div>
);

/* ── Main Home Component ─────────────────────────────────── */
const Home = () => {
    const [sellersCount, sellersRef] = useCountUp(2500);
    const [productsCount, productsRef] = useCountUp(50000);
    const [customersCount, customersRef] = useCountUp(120000);
    const [countriesCount, countriesRef] = useCountUp(80);

    const categories = [
        { icon: Sparkles, title: 'Fashion', count: '8,200', color: '#e17055' },
        { icon: Zap, title: 'Electronics', count: '5,400', color: '#6c5ce7' },
        { icon: Heart, title: 'Beauty', count: '3,800', color: '#fd79a8' },
        { icon: Package, title: 'Home & Living', count: '4,100', color: '#00cec9' },
        { icon: Store, title: 'Handmade', count: '2,900', color: '#fdcb6e' },
        { icon: Globe, title: 'International', count: '6,700', color: '#a29bfe' },
    ];

    const features = [
        {
            icon: Shield,
            title: 'Secure Transactions',
            description: 'Every purchase is protected with enterprise-grade encryption and buyer protection guarantees.',
        },
        {
            icon: Truck,
            title: 'Fast Delivery',
            description: 'Get your orders delivered quickly with real-time tracking from verified shipping partners.',
        },
        {
            icon: CreditCard,
            title: 'Easy Payments',
            description: 'Flexible payment options including cards, wallets, UPI, and buy-now-pay-later solutions.',
        },
        {
            icon: Users,
            title: 'Trusted Sellers',
            description: 'Every seller is verified and rated by our community. Shop with confidence every time.',
        },
    ];

    const testimonials = [
        {
            name: 'Priya Sharma',
            role: 'Fashion Seller',
            content: 'SliceBuy transformed my small boutique into a thriving online business. Sales grew 300% in just 6 months!',
            rating: 5,
            avatar: 'PS',
        },
        {
            name: 'Arjun Mehta',
            role: 'Happy Customer',
            content: "The variety of unique products is incredible. I've found things here that I couldn't find anywhere else online.",
            rating: 5,
            avatar: 'AM',
        },
        {
            name: 'Fatima Khan',
            role: 'Artisan Seller',
            content: "The platform is so easy to use. Setting up my store took minutes, and the support team is incredibly responsive.",
            rating: 5,
            avatar: 'FK',
        },
    ];

    return (
        <main className="home" id="home-page">
            {/* ── Hero Section ─────────────────────────────────── */}
            <section className="hero" id="hero-section">
                <div className="hero__bg-effects">
                    <div className="hero__orb hero__orb--1" />
                    <div className="hero__orb hero__orb--2" />
                    <div className="hero__orb hero__orb--3" />
                    <div className="hero__grid-overlay" />
                </div>

                <div className="hero__content container">
                    <div className="hero__text">
                        <div className="hero__badge animate-fade-in-up">
                            <Sparkles size={14} />
                            <span>The Marketplace Revolution</span>
                        </div>

                        <h1 className="hero__title animate-fade-in-up delay-100">
                            Discover <span className="text-gradient">Unique Products</span> From
                            Sellers <span className="text-gradient-accent">Worldwide</span>
                        </h1>

                        <p className="hero__subtitle animate-fade-in-up delay-200">
                            SliceBuy connects you with thousands of independent sellers offering
                            one-of-a-kind products. From handcrafted treasures to cutting-edge
                            tech — your next favorite find is waiting.
                        </p>

                        <div className="hero__actions animate-fade-in-up delay-300">
                            <Link to="/products" className="btn btn-primary btn-lg" id="hero-explore-btn">
                                Explore Products
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/register" className="btn btn-secondary btn-lg" id="hero-sell-btn">
                                Start Selling
                                <Store size={20} />
                            </Link>
                        </div>

                        <div className="hero__trust animate-fade-in-up delay-400">
                            <div className="hero__trust-avatars">
                                <div className="hero__trust-avatar" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>R</div>
                                <div className="hero__trust-avatar" style={{ background: 'linear-gradient(135deg, #00cec9, #55efc4)' }}>A</div>
                                <div className="hero__trust-avatar" style={{ background: 'linear-gradient(135deg, #e17055, #fab1a0)' }}>S</div>
                                <div className="hero__trust-avatar" style={{ background: 'linear-gradient(135deg, #fdcb6e, #ffeaa7)' }}>M</div>
                            </div>
                            <div className="hero__trust-text">
                                <span className="hero__trust-count">120K+</span> happy customers
                            </div>
                            <div className="hero__trust-stars">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                                ))}
                                <span>4.9/5</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero__visual animate-fade-in-up delay-200">
                        <div className="hero__image-wrapper">
                            <img src={heroImage} alt="SliceBuy Marketplace" className="hero__image" />
                            <div className="hero__image-glow" />
                        </div>

                        {/* Floating badges */}
                        <div className="hero__floating-badge hero__floating-badge--1">
                            <TrendingUp size={18} color="#55efc4" />
                            <div>
                                <span className="hero__floating-badge-value">+240%</span>
                                <span className="hero__floating-badge-label">Growth</span>
                            </div>
                        </div>

                        <div className="hero__floating-badge hero__floating-badge--2">
                            <Shield size={18} color="#a29bfe" />
                            <div>
                                <span className="hero__floating-badge-value">100%</span>
                                <span className="hero__floating-badge-label">Secure</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Section ────────────────────────────────── */}
            <section className="stats" id="stats-section">
                <div className="stats__inner container">
                    <div className="stats__item" ref={sellersRef}>
                        <span className="stats__number">{sellersCount.toLocaleString()}+</span>
                        <span className="stats__label">Verified Sellers</span>
                    </div>
                    <div className="stats__divider" />
                    <div className="stats__item" ref={productsRef}>
                        <span className="stats__number">{productsCount.toLocaleString()}+</span>
                        <span className="stats__label">Products Listed</span>
                    </div>
                    <div className="stats__divider" />
                    <div className="stats__item" ref={customersRef}>
                        <span className="stats__number">{customersCount.toLocaleString()}+</span>
                        <span className="stats__label">Happy Customers</span>
                    </div>
                    <div className="stats__divider" />
                    <div className="stats__item" ref={countriesRef}>
                        <span className="stats__number">{countriesCount}+</span>
                        <span className="stats__label">Countries</span>
                    </div>
                </div>
            </section>

            {/* ── Categories Section ───────────────────────────── */}
            <section className="categories" id="categories-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Browse Categories</span>
                        <h2 className="section-title">
                            Find What You <span className="text-gradient">Love</span>
                        </h2>
                        <p className="section-subtitle">
                            Explore curated collections from thousands of sellers across every category imaginable.
                        </p>
                    </div>

                    <div className="categories__grid">
                        {categories.map((cat, i) => (
                            <CategoryCard key={cat.title} {...cat} delay={0.1 * (i + 1)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Section ─────────────────────────────── */}
            <section className="features" id="features-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Why SliceBuy?</span>
                        <h2 className="section-title">
                            Built for <span className="text-gradient-accent">Trust</span> & Delight
                        </h2>
                        <p className="section-subtitle">
                            We obsess over every detail so you can shop and sell with complete confidence.
                        </p>
                    </div>

                    <div className="features__grid">
                        {features.map((feature, i) => (
                            <FeatureCard key={feature.title} {...feature} delay={0.1 * (i + 1)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ───────────────────────────────────── */}
            <section className="cta-banner" id="cta-section">
                <div className="container">
                    <div className="cta-banner__inner">
                        <div className="cta-banner__glow" />
                        <div className="cta-banner__content">
                            <h2 className="cta-banner__title">
                                Ready to Start Your <span className="text-gradient">Selling Journey?</span>
                            </h2>
                            <p className="cta-banner__text">
                                Join 2,500+ sellers already growing their business on SliceBuy.
                                Set up your store in minutes — no listing fees for your first 50 products.
                            </p>
                            <div className="cta-banner__actions">
                                <Link to="/register" className="btn btn-accent btn-lg" id="cta-start-selling-btn">
                                    Start Selling Free
                                    <ArrowRight size={20} />
                                </Link>
                                <Link to="/products" className="btn btn-secondary btn-lg" id="cta-learn-more-btn">
                                    Learn More
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials Section ─────────────────────────── */}
            <section className="testimonials" id="testimonials-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Testimonials</span>
                        <h2 className="section-title">
                            Loved by <span className="text-gradient">Thousands</span>
                        </h2>
                        <p className="section-subtitle">
                            Real stories from real people who found success on SliceBuy.
                        </p>
                    </div>

                    <div className="testimonials__grid">
                        {testimonials.map((t, i) => (
                            <TestimonialCard key={t.name} {...t} delay={0.15 * (i + 1)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="footer" id="footer">
                <div className="container">
                    <div className="footer__grid">
                        <div className="footer__brand">
                            <h3 className="footer__logo">
                                Slice<span className="text-gradient-accent">Buy</span>
                            </h3>
                            <p className="footer__tagline">
                                The multi-vendor marketplace where creators and shoppers connect worldwide.
                            </p>
                            <div className="footer__social">
                                <a href="#" className="footer__social-link" aria-label="Twitter">𝕏</a>
                                <a href="#" className="footer__social-link" aria-label="Instagram">📷</a>
                                <a href="#" className="footer__social-link" aria-label="LinkedIn">in</a>
                            </div>
                        </div>

                        <div className="footer__col">
                            <h4>Marketplace</h4>
                            <ul>
                                <li><a href="#">All Products</a></li>
                                <li><a href="#">Categories</a></li>
                                <li><a href="#">Trending</a></li>
                                <li><a href="#">New Arrivals</a></li>
                            </ul>
                        </div>

                        <div className="footer__col">
                            <h4>Sellers</h4>
                            <ul>
                                <li><a href="#">Start Selling</a></li>
                                <li><a href="#">Seller Dashboard</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Success Stories</a></li>
                            </ul>
                        </div>

                        <div className="footer__col">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                                <li><a href="#">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="footer__bottom">
                        <p>&copy; 2026 SliceBuy. All rights reserved.</p>
                        <p>Made with <Heart size={14} fill="#e17055" color="#e17055" style={{ display: 'inline', verticalAlign: 'middle' }} /> for creators everywhere</p>
                    </div>
                </div>
            </footer>
        </main>
    );
};

export default Home;
