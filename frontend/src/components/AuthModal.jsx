import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';

const AuthModal = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'CONSUMER',
        referralCode: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                const credentials = { email: formData.email, username: formData.email, password: formData.password };
                const resp = await authAPI.login(credentials);
                // resp contains { token, user }
                if (resp.token) {
                    localStorage.setItem('authToken', resp.token);
                }
                if (resp.user) {
                    localStorage.setItem('user', JSON.stringify(resp.user));
                }
                // notify app of auth change so UI can update without full reload
                try {
                    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: resp.user, token: resp.token } }));
                } catch (e) {
                    // ignore
                }
            } else {
                const userData = {
                    email: formData.email,
                    username: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role,
                    referredByCode: formData.referralCode,
                };
                const registeredUser = await authAPI.register(userData);
                // After successful registration, auto-login
                try {
                    const credentials = { email: formData.email, username: formData.email, password: formData.password };
                    const resp = await authAPI.login(credentials);
                    if (resp.token) {
                        localStorage.setItem('authToken', resp.token);
                    }
                    if (resp.user) {
                        localStorage.setItem('user', JSON.stringify(resp.user));
                    } else {
                        localStorage.setItem('user', JSON.stringify(registeredUser));
                    }
                    // notify app of auth change
                    try {
                        window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: resp.user || registeredUser, token: resp.token } }));
                    } catch (e) {}
                } catch (e) {
                    console.warn('Auto-login after registration failed, prompting manual login:', e);
                    setIsLogin(true);
                    alert('Registration successful! Please log in with your credentials.');
                }
            }
            onClose();
        } catch (err) {
            console.error('Auth error', err);
            const msg = err?.message || 'Authentication failed. Please check your credentials.';
            alert(msg);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-slide-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} className="text-gray-500" />
                </button>

                {/* Header */}
                <div className="p-8 pb-0 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {isLogin ? 'Enter your details to sign in' : 'Join your neighborhood community'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Register As</label>
                            <div className="flex gap-4 items-center">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="role" value="CONSUMER" checked={formData.role === 'CONSUMER'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
                                    <span className="text-sm">Consumer</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="role" value="SHOPKEEPER" checked={formData.role === 'SHOPKEEPER'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
                                    <span className="text-sm">Shopkeeper</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Referral Code (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="LC-RAHUL4821"
                                value={formData.referralCode}
                                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={20} />
                    </button>
                </form>

                {/* Footer */}
                <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-gray-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary font-semibold hover:underline"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
