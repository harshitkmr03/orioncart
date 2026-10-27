import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../services/api';

const GoogleIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
);

const AuthModal = ({ isOpen, onClose }) => {
    // mode: 'login' | 'register' | 'forgot-password'
    const [mode, setMode] = useState('login');
    const [forgotStep, setForgotStep] = useState(1); // 1: send otp, 2: verify & reset
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'CONSUMER',
        referralCode: '',
    });

    const [forgotData, setForgotData] = useState({
        email: '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });

    const googleBtnRef = useRef(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const handleGoogleCredentialResponse = async (response) => {
        if (!response?.credential) return;
        setLoading(true);
        resetMessages();
        try {
            const resp = await authAPI.googleLogin(response.credential);
            if (resp.token) {
                localStorage.setItem('authToken', resp.token);
            }
            if (resp.user) {
                localStorage.setItem('user', JSON.stringify(resp.user));
            }
            try {
                window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: resp.user, token: resp.token } }));
            } catch (e) {}
            onClose();
        } catch (err) {
            console.error('Google login error', err);
            setErrorMessage(err?.message || 'Failed to authenticate with Google');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || mode === 'forgot-password' || !googleClientId) return;

        let intervalId = null;
        const renderGoogleBtn = () => {
            if (window.google?.accounts?.id && googleBtnRef.current) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleCredentialResponse,
                    });
                    googleBtnRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnRef.current, {
                        theme: 'outline',
                        size: 'large',
                        width: '100%',
                        text: mode === 'login' ? 'signin_with' : 'signup_with',
                        shape: 'rectangular',
                    });
                    if (intervalId) clearInterval(intervalId);
                } catch (e) {
                    console.error('Google button init error:', e);
                }
            }
        };

        renderGoogleBtn();
        intervalId = setInterval(renderGoogleBtn, 400);
        const timeoutId = setTimeout(() => {
            if (intervalId) clearInterval(intervalId);
        }, 3000);

        return () => {
            if (intervalId) clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [isOpen, mode, googleClientId]);

    const handleGoogleClick = () => {
        if (!googleClientId) {
            setErrorMessage('Google Client ID is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
            return;
        }
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        } else {
            setErrorMessage('Google Sign-In is loading. Please check your internet connection.');
        }
    };

    if (!isOpen) return null;

    const resetMessages = () => {
        setStatusMessage(null);
        setErrorMessage(null);
    };

    const handleLoginOrRegister = async (e) => {
        e.preventDefault();
        resetMessages();
        setLoading(true);
        try {
            if (mode === 'login') {
                const credentials = { email: formData.email, username: formData.email, password: formData.password };
                const resp = await authAPI.login(credentials);
                if (resp.token) {
                    localStorage.setItem('authToken', resp.token);
                }
                if (resp.user) {
                    localStorage.setItem('user', JSON.stringify(resp.user));
                }
                try {
                    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: resp.user, token: resp.token } }));
                } catch (e) {}
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
                    try {
                        window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: resp.user || registeredUser, token: resp.token } }));
                    } catch (e) {}
                } catch (e) {
                    setMode('login');
                    alert('Registration successful! Please log in with your credentials.');
                }
            }
            onClose();
        } catch (err) {
            console.error('Auth error', err);
            const msg = err?.message || 'Authentication failed. Please check your credentials.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        resetMessages();
        if (!forgotData.email || !forgotData.email.includes('@')) {
            setErrorMessage('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const resp = await authAPI.forgotPassword(forgotData.email);
            setStatusMessage(resp.message || 'Verification code sent to your email!');
            setForgotStep(2);
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to send OTP code. Please verify the email address.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        resetMessages();

        if (forgotData.newPassword.length < 6) {
            setErrorMessage('New password must be at least 6 characters');
            return;
        }

        if (forgotData.newPassword !== forgotData.confirmPassword) {
            setErrorMessage('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const resp = await authAPI.resetPassword(forgotData.email, forgotData.otp, forgotData.newPassword);
            alert(resp.message || 'Password reset successfully! Please log in.');
            setMode('login');
            setForgotStep(1);
            setFormData(prev => ({ ...prev, email: forgotData.email, password: '' }));
            setForgotData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to reset password. Please check your OTP.');
        } finally {
            setLoading(false);
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
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'register' && 'Create Account'}
                        {mode === 'forgot-password' && (forgotStep === 1 ? 'Reset Password' : 'Enter Verification Code')}
                    </h2>
                    <p className="mt-2 text-gray-600 text-sm">
                        {mode === 'login' && 'Enter your details to sign in'}
                        {mode === 'register' && 'Join your neighborhood community'}
                        {mode === 'forgot-password' && (forgotStep === 1
                            ? 'Enter your registered email to receive a 6-digit OTP'
                            : `We sent a 6-digit code to ${forgotData.email}`)}
                    </p>
                </div>

                {/* Notifications */}
                <div className="px-8 pt-4">
                    {errorMessage && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                            {errorMessage}
                        </div>
                    )}
                    {statusMessage && (
                        <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                            <span>{statusMessage}</span>
                        </div>
                    )}
                </div>

                {/* Forgot Password Flow */}
                {mode === 'forgot-password' ? (
                    forgotStep === 1 ? (
                        <form onSubmit={handleSendOtp} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Account Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="you@example.com"
                                        value={forgotData.email}
                                        onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending Code...' : 'Send Verification OTP'}
                                <ArrowRight size={20} />
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">6-Digit Email OTP</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all tracking-widest font-mono text-lg text-center"
                                        placeholder="123456"
                                        value={forgotData.otp}
                                        onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="••••••••"
                                        value={forgotData.newPassword}
                                        onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="••••••••"
                                        value={forgotData.confirmPassword}
                                        onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <button
                                    type="button"
                                    onClick={() => setForgotStep(1)}
                                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                >
                                    <ArrowLeft size={14} /> Resend OTP
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? 'Resetting Password...' : 'Save New Password'}
                                <ArrowRight size={20} />
                            </button>
                        </form>
                    )
                ) : (
                    /* Login & Register Forms */
                    <form onSubmit={handleLoginOrRegister} className="p-8 space-y-4">
                        {mode === 'register' && (
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

                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Register As</label>
                                <div className="flex gap-4 items-center">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="CONSUMER"
                                            checked={formData.role === 'CONSUMER'}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        />
                                        <span className="text-sm">Consumer</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="SHOPKEEPER"
                                            checked={formData.role === 'SHOPKEEPER'}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        />
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
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700">Password</label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetMessages();
                                            setMode('forgot-password');
                                            setForgotStep(1);
                                            setForgotData(prev => ({ ...prev, email: formData.email }));
                                        }}
                                        className="text-xs text-primary font-medium hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
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

                        {mode === 'register' && (
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
                            disabled={loading}
                            className="w-full py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                            <ArrowRight size={20} />
                        </button>

                        <div className="relative my-3">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">Or</span>
                            </div>
                        </div>

                        <div ref={googleBtnRef} className="flex justify-center w-full min-h-[44px]"></div>
                        {(!googleClientId || !window.google?.accounts?.id) && (
                            <button
                                type="button"
                                onClick={handleGoogleClick}
                                className="w-full py-2.5 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 transition-colors shadow-sm hover:border-gray-400"
                            >
                                <GoogleIcon />
                                <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
                            </button>
                        )}
                    </form>
                )}

                {/* Footer */}
                <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
                    {mode === 'forgot-password' ? (
                        <button
                            onClick={() => {
                                resetMessages();
                                setMode('login');
                                setForgotStep(1);
                            }}
                            className="text-primary font-semibold text-sm hover:underline inline-flex items-center gap-1"
                        >
                            <ArrowLeft size={16} /> Back to Sign In
                        </button>
                    ) : (
                        <p className="text-gray-600 text-sm">
                            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    resetMessages();
                                    setMode(mode === 'login' ? 'register' : 'login');
                                }}
                                className="text-primary font-semibold hover:underline"
                            >
                                {mode === 'login' ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
