import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ShoppingBag, Search, User, LogOut, Store, Users, BarChart3, History, Shield } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, isSeller, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = () => setDropdownOpen(false);
        if (dropdownOpen) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [dropdownOpen]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-navbar">
            <div className="navbar__inner container">
                {/* Logo */}
                <Link to="/" className="navbar__logo" id="navbar-logo">
                    <span className="navbar__logo-icon">
                        <ShoppingBag size={24} />
                    </span>
                    <span className="navbar__logo-text">
                        Slice<span className="text-gradient-accent">Buy</span>
                    </span>
                </Link>

                {/* Desktop Links */}
                <ul className="navbar__links" id="navbar-links">
                    {!isAuthenticated && <li><Link to="/" className="navbar__link">Home</Link></li>}
                    <li><Link to={isAuthenticated ? '/' : '/products'} className="navbar__link">Products</Link></li>
                    {isAuthenticated && !isSeller && <li><Link to="/orders" className="navbar__link">Order Rooms</Link></li>}
                    {isAuthenticated && isSeller && <li><Link to="/seller/dashboard" className="navbar__link">Dashboard</Link></li>}
                    {isAuthenticated && isAdmin && <li><Link to="/admin" className="navbar__link">Admin</Link></li>}
                </ul>

                {/* Actions */}
                <div className="navbar__actions">
                    {isAuthenticated ? (
                        <div className="navbar__user-menu">
                            <button
                                className="navbar__user-btn"
                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                                id="navbar-user-btn"
                            >
                                <div className="navbar__user-avatar">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="navbar__user-name">{user?.username}</span>
                                {isSeller && (
                                    <span className="navbar__seller-badge">
                                        <Store size={12} /> Seller
                                    </span>
                                )}
                            </button>

                            {dropdownOpen && (
                                <div className="navbar__dropdown" id="navbar-dropdown">
                                    <div className="navbar__dropdown-header">
                                        <p className="navbar__dropdown-name">{user?.username}</p>
                                        <p className="navbar__dropdown-role">{isSeller ? 'Seller Account' : 'Buyer Account'}</p>
                                    </div>
                                    <div className="navbar__dropdown-divider" />
                                    {isSeller ? (
                                        <>
                                            <Link to="/seller/dashboard" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <BarChart3 size={16} /> Dashboard
                                            </Link>
                                            <Link to="/products" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <Store size={16} /> My Products
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link to="/orders" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <Users size={16} /> My Rooms
                                            </Link>
                                            <Link to="/purchase-history" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <History size={16} /> Purchase History
                                            </Link>
                                        </>
                                    )}
                                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                                        <LogOut size={16} /> Logout
                                    </button>
                                    {isAdmin && (
                                        <>
                                            <div className="navbar__dropdown-divider" />
                                            <Link to="/admin" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <Shield size={16} /> Admin Panel
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary navbar__login-btn" id="navbar-login-btn">
                                <User size={16} />
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary navbar__signup-btn" id="navbar-signup-btn">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="navbar__mobile-toggle"
                    id="navbar-mobile-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle navigation"
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`navbar__mobile-menu ${mobileOpen ? 'navbar__mobile-menu--open' : ''}`} id="navbar-mobile-menu">
                <ul className="navbar__mobile-links">
                    {!isAuthenticated && <li><Link to="/" onClick={() => setMobileOpen(false)}>Home</Link></li>}
                    <li><Link to={isAuthenticated ? '/' : '/products'} onClick={() => setMobileOpen(false)}>Products</Link></li>
                    {isAuthenticated && !isSeller && <li><Link to="/orders" onClick={() => setMobileOpen(false)}>Order Rooms</Link></li>}
                    {isAuthenticated && !isSeller && <li><Link to="/purchase-history" onClick={() => setMobileOpen(false)}>Purchase History</Link></li>}
                    {isAuthenticated && isSeller && <li><Link to="/seller/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link></li>}
                    {isAuthenticated && isAdmin && <li><Link to="/admin" onClick={() => setMobileOpen(false)}>Admin Panel</Link></li>}
                </ul>
                <div className="navbar__mobile-actions">
                    {isAuthenticated ? (
                        <button className="btn btn-secondary" onClick={() => { handleLogout(); setMobileOpen(false); }} style={{ flex: 1 }}>
                            <LogOut size={16} /> Logout
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>Login</Link>
                            <Link to="/register" className="btn btn-primary" onClick={() => setMobileOpen(false)}>Get Started</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
