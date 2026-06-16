import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, Mail, Lock, User, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../api';

type AuthMode = 'login' | 'forgot' | 'verify' | 'reset';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Forgot Password Fields
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.auth.login({ username, password });
      if (response.success && response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username || username);
        localStorage.setItem('role', response.data.role || 'Staff');
        navigate('/');
      } else {
        setError('Login succeeded but no token was returned.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.auth.forgotPassword({ email });
      setSuccess(res.message || 'OTP sent to your email.');
      setMode('verify');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Verify that the email is registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.auth.verifyOtp({ email, otpCode });
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setSuccess('OTP verified. Enter your new password.');
        setMode('reset');
      } else {
        setError('OTP verified but no reset token was returned.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.auth.resetPassword({ resetToken, newPassword });
      setSuccess(res.message || 'Password reset successfully. Please log in.');
      setMode('login');
      setPassword('');
      setUsername('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        
        {/* Brand Logo */}
        <div className="auth-header">
          <div 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: 'var(--radius-md)', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: 'var(--shadow-primary)'
            }}
          >
            <ChefHat size={32} style={{ color: 'white' }} />
          </div>
          <h1>MenuCore</h1>
          <p style={{ fontSize: '0.9rem' }}>Restaurant Management Portal</p>
        </div>

        {error && (
          <div 
            style={{ 
              backgroundColor: 'var(--danger-glow)', 
              color: 'var(--danger)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 20,
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div 
            style={{ 
              backgroundColor: 'var(--success-glow)', 
              color: 'var(--success)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 20,
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            {success}
          </div>
        )}

        {/* 1. Login Mode */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '14px', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="Enter username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button 
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--primary)', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '14px', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder="Enter password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '14px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Sign In'}
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              First time onboarding?{' '}
              <Link to="/signup" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Set up Restaurant
              </Link>
            </div>
          </form>
        )}

        {/* 2. Forgot Password Email Input */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '6px' }} 
                onClick={() => setMode('login')}
              >
                <ArrowLeft size={16} />
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reset Password</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Enter your registered owner email address. We'll send you a 6-digit verification code.
            </p>

            <div className="form-group">
              <label className="form-label">Registered Email</label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '14px', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="owner@restaurant.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Send OTP Code'}
            </button>
          </form>
        )}

        {/* 3. OTP Verification Form */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '6px' }} 
                onClick={() => setMode('forgot')}
              >
                <ArrowLeft size={16} />
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Verify Code</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Enter the 6-digit OTP code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            </p>

            <div className="form-group">
              <label className="form-label">Verification OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '14px', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '44px', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700 }}
                  placeholder="000000" 
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* 4. Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Create New Password</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Your OTP is verified. Please type your new strong password.
            </p>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '14px', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder="Enter new password (min 6 chars)" 
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '14px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
