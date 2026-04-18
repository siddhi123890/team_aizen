import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login, register } = useAuth();

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
      }
    } catch (err) { setError(err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const switchMode = () => { setIsLogin(!isLogin); setError(''); setForm({ name: '', email: '', password: '' }); };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" />

      {/* Left Branding */}
      <div className="auth-branding">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="auth-branding-content">
          <div className="auth-logo-ring">
            <ShieldCheck size={40} strokeWidth={1.5} />
          </div>
          <h1>FraudSafe</h1>
          <p className="auth-tagline">Intelligent Fraud Detection</p>
          <div className="auth-features">
            <div className="auth-feature-item"><div className="auth-feature-dot" /><span>Real-time ML inference</span></div>
            <div className="auth-feature-item"><div className="auth-feature-dot" /><span>Dual-model ensemble scoring</span></div>
            <div className="auth-feature-item"><div className="auth-feature-dot" /><span>Behavioral pattern analysis</span></div>
          </div>
        </motion.div>
      </div>

      {/* Right Form */}
      <div className="auth-form-panel">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="auth-form-container">
          <AnimatePresence mode="wait">
            <motion.div key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
            >
              <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h2>
              <p className="auth-subtitle">{isLogin ? 'Sign in to access the security dashboard' : 'Register to start monitoring transactions'}</p>

              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="auth-field">
                    <label htmlFor="name">Full Name</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input id="name" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handleChange} autoComplete="name" />
                    </div>
                  </motion.div>
                )}

                <div className="auth-field">
                  <label htmlFor="email">Email Address</label>
                  <div className="auth-input-wrapper">
                    <Mail size={18} className="auth-input-icon" />
                    <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      placeholder={isLogin ? '••••••••' : 'Min 6 characters'} value={form.password} onChange={handleChange} required
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button type="button" className="auth-toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="auth-error">{error}</motion.div>
                )}

                <button type="submit" disabled={loading} className="auth-submit-btn">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (<>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={18} /></>)}
                </button>
              </form>

              <p className="auth-switch">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button type="button" onClick={switchMode}>{isLogin ? 'Sign up' : 'Sign in'}</button>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
