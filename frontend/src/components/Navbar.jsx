import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ShoppingCart, User, Search, ArrowRight, MapPin, Menu, X } from 'lucide-react';
import AuthModal from './AuthModal';
import LocationModal from './LocationModal';
import { notificationAPI } from '../services/api';

const formatNotificationTime = (value) => {
    if (!value) {
        return 'Just now';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Recently';
    }

    return parsed.toLocaleString();
};


const Navbar = ({ onCartClick, cartCount }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [location, setLocation] = useState('Select Location');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) setCurrentUser(JSON.parse(raw));
        } catch (e) {
            console.warn('Failed to parse user from localStorage', e);
        }
        // listen for global requests to open auth modal (e.g., from CartDrawer)
        const handler = () => setIsAuthOpen(true);
        window.addEventListener('openAuthModal', handler);
        // listen for auth changes (login/register)
        const authHandler = (e) => {
            try {
                const u = e?.detail?.user || JSON.parse(localStorage.getItem('user'));
                setCurrentUser(u || null);
            } catch (err) {
                setCurrentUser(null);
            }
        };
        window.addEventListener('authChanged', authHandler);
        return () => {
            window.removeEventListener('openAuthModal', handler);
            window.removeEventListener('authChanged', authHandler);
        };
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('selectedLocation');
            if (raw) {
                const s = JSON.parse(raw);
                if (s && s.displayName) setLocation(s.displayName);
            }
        } catch (e) { }
    }, []);

    useEffect(() => {
        if (!currentUser || !localStorage.getItem('authToken')) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        let cancelled = false;
        const loadNotifications = async () => {
            try {
                setLoadingNotifications(true);
                const data = await notificationAPI.getMine();
                if (!cancelled) {
                    setNotifications(Array.isArray(data?.items) ? data.items : []);
                    setUnreadCount(Number(data?.unreadCount || 0));
                }
            } catch {
                if (!cancelled) {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            } finally {
                if (!cancelled) {
                    setLoadingNotifications(false);
                }
            }
        };

        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 30000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [currentUser]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        setCurrentUser(null);
        setNotifications([]);
        setUnreadCount(0);
        try {
            window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null, token: null } }));
        } catch (e) { }
        navigate('/');
    };

    const handleSearch = (e) => {
        e?.preventDefault?.();
        const q = searchQuery.trim();
        if (q) navigate(`/discover?q=${encodeURIComponent(q)}`);
    };

    const handleOpenNotification = async (notification) => {
        try {
            if (!notification.read) {
                await notificationAPI.markAsRead(notification.id);
                setNotifications((prev) => prev.map((item) => (
                    item.id === notification.id ? { ...item, read: true } : item
                )));
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (e) { }

        setIsNotificationsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
            setUnreadCount(0);
        } catch (e) { }
    };


    return (
        <>
            <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        OrionCart
                    </Link>

                    {/* Location Selector */}
                    <button
                        onClick={() => setIsLocationOpen(true)}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors border border-gray-200"
                    >
                        <MapPin size={16} className="text-primary" />
                        <span className="max-w-[150px] truncate">{location}</span>
                    </button>



                    {/* Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-xl mx-4 relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for shops, items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                        <button onClick={handleSearch} className="absolute right-1.5 top-1.5 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link to="/discover" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            Discover
                        </Link>

                        {currentUser && (
                            <Link to="/account" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                                My Account
                            </Link>
                        )}

                        <Link to="/seller" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            Become a Seller
                        </Link>

                        <div className="flex items-center gap-3">
                            {currentUser && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsNotificationsOpen((prev) => !prev)}
                                        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                        aria-label="View notifications"
                                    >
                                        <Bell size={22} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[11px] font-bold flex items-center justify-center rounded-full shadow-sm">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {isNotificationsOpen && (
                                        <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
                                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">Notifications</p>
                                                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllNotificationsRead}
                                                    className="text-xs font-semibold text-primary hover:text-primary/80"
                                                >
                                                    Mark all read
                                                </button>
                                            </div>

                                            <div className="max-h-[420px] overflow-y-auto">
                                                {loadingNotifications ? (
                                                    <div className="px-5 py-10 text-center text-sm text-gray-500">Loading notifications...</div>
                                                ) : notifications.length === 0 ? (
                                                    <div className="px-5 py-10 text-center text-sm text-gray-500">You’re all caught up.</div>
                                                ) : (
                                                    notifications.map((notification) => (
                                                        <button
                                                            key={notification.id}
                                                            type="button"
                                                            onClick={() => handleOpenNotification(notification)}
                                                            className={`block w-full border-b border-gray-100 px-5 py-4 text-left transition hover:bg-gray-50 ${
                                                                notification.read ? 'bg-white' : 'bg-blue-50/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{notification.title}</p>
                                                                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                                                                    <p className="mt-2 text-xs text-gray-400">{formatNotificationTime(notification.createdAt)}</p>
                                                                </div>
                                                                {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />}
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => onCartClick ? onCartClick() : navigate('/cart')}
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ShoppingCart size={22} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold flex items-center justify-center rounded-full shadow-sm animate-scale-in">
                                        {cartCount}
                                    </span>
                                )}
                            </button>

                            {currentUser ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">{currentUser.name || currentUser.username || currentUser.email}</span>
                                    <button onClick={handleLogout} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">Logout</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAuthOpen(true)}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <User size={22} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-600"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-4 shadow-lg animate-slide-down">
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 py-3 bg-gray-50 rounded-xl"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setIsLocationOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
                            >
                                <MapPin size={20} className="text-primary" />
                                <span className="font-medium">{location}</span>
                            </button>
                            <Link to="/seller" className="font-medium p-2 hover:text-primary">Become a Seller</Link>
                            <Link to="/discover" className="font-medium p-2 hover:text-primary">Discover</Link>
                            {currentUser && <Link to="/account" className="font-medium p-2 hover:text-primary">My Account</Link>}
                            {currentUser && <div className="font-medium p-2 text-gray-600">Notifications: {unreadCount}</div>}
                            {currentUser ? (
                                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center gap-2 font-medium p-2 hover:text-primary">Logout</button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsAuthOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2 font-medium p-2 hover:text-primary"
                                >
                                    <User size={20} />
                                    Sign In / Register
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
            <LocationModal
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
                onSelect={(loc) => {
                    try { setLocation(loc.displayName); } catch (e) { }
                }}
            />
        </>
    );
};

export default Navbar;
