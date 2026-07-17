import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, addToast }) {
  const { sendOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendOtp(email);
      setOtpSent(true);
      addToast('OTP sent to your email!', 'success');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while sending OTP.');
      addToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otp);
      addToast('Logged in successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid OTP.');
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal-backdrop" onClick={onClose} />
      
      <div className="glass-card auth-modal-content stagger-in">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <h2>{otpSent ? '🔑 Enter OTP' : '🚀 Sign In / Sign Up'}</h2>
          <p>{otpSent ? 'Please enter the one-time password sent to your email.' : 'Enter your email to receive a one-time password.'}</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="pulse-spinner" style={{ width: '14px', height: '14px' }}></span>
                  Processing...
                </div>
              ) : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="otp">One-Time Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="pulse-spinner" style={{ width: '14px', height: '14px' }}></span>
                  Verifying...
                </div>
              ) : 'Verify & Login'}
            </button>
            <div className="auth-modal-footer">
              <span>Didn't receive the email?</span>
              <button 
                type="button" 
                className="auth-switch-btn"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                }}
              >
                Try again
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
