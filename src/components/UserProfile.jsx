import React, { useState, useEffect } from 'react';
import { useProfile, MEMBERSHIP_OPTIONS, BANK_CARD_OPTIONS, DIETARY_OPTIONS } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

export default function UserProfile({ addToast }) {
  const { user, signOut } = useAuth();
  const { profile, saveProfile, loading } = useProfile();
  
  const [localMemberships, setLocalMemberships] = useState({});
  const [localBankCards, setLocalBankCards] = useState([]);
  const [localWishlistUrls, setLocalWishlistUrls] = useState({});
  const [localDietary, setLocalDietary] = useState('any');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('wishlists');

  // Sync local state from profile
  useEffect(() => {
    if (profile) {
      setLocalMemberships(profile.memberships || {});
      setLocalBankCards(profile.bankCards || []);
      setLocalWishlistUrls(profile.wishlistUrls || {});
      setLocalDietary(profile.dietaryPreference || 'any');
    }
  }, [profile]);

  const toggleMembership = (key) => {
    setLocalMemberships(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleBankCard = (card) => {
    setLocalBankCards(prev =>
      prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]
    );
  };

  const handleWishlistChange = (store, url) => {
    setLocalWishlistUrls(prev => ({ ...prev, [store]: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        memberships: localMemberships,
        bankCards: localBankCards,
        wishlistUrls: localWishlistUrls,
        dietaryPreference: localDietary
      });
      addToast?.('Profile settings saved successfully ✓', 'success');
    } catch (err) {
      addToast?.('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeMembershipsCount = Object.values(localMemberships).filter(Boolean).length;
  const activeCardsCount = localBankCards.length;

  return (
    <div className="view-container profile-page" style={{ padding: '2rem' }}>
      <div className="view-header">
        <div>
          <h2>Account & Profile</h2>
          <p>Manage your connections, memberships, and personalized settings.</p>
        </div>
        
        {user && (
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'rgba(255,100,100,0.5)', color: '#ff6b6b' }}
            onClick={() => {
              signOut();
              addToast?.('Logged out successfully', 'info');
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        )}
      </div>

      <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Left Column: User Info & Nav */}
        <div className="profile-sidebar">
          <div className="user-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div className="user-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-blue))', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={40} color="white" />
            </div>
            {user ? (
              <>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {profile?.full_name || 'Symbiote User'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.email}</p>
                <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <CheckCircle size={14} /> Verified Account
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Guest User</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sign in to sync your perks across devices.</p>
              </>
            )}
          </div>

          <div className="cp-tabs" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { key: 'wishlists', label: 'App Connections', icon: '🔗', desc: 'Connect for 2x speed' },
              { key: 'memberships', label: 'Memberships', icon: '👑', count: activeMembershipsCount },
              { key: 'cards', label: 'Bank Cards', icon: '💳', count: activeCardsCount },
              { key: 'dietary', label: 'Dietary', icon: '🥗' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`cp-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                style={{ justifyContent: 'flex-start', padding: '1rem', width: '100%' }}
              >
                <span className="cp-tab-icon">{tab.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '600' }}>{tab.label}</div>
                  {tab.desc && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{tab.desc}</div>}
                </div>
                {tab.count > 0 && <span className="cp-tab-badge" style={{ marginLeft: 'auto' }}>{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Content Area */}
        <div className="profile-content-area" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: 1 }}>
            {/* ── CONNECTIONS TAB ── */}
            {activeTab === 'wishlists' && (
              <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-blue)' }}>⚡</span> Connect Your Apps
                </h3>
                <p className="cp-section-desc" style={{ marginBottom: '2rem', fontSize: '1rem' }}>
                  Provide your public profile URLs below. Symbiote uses these to give you a <b style={{color: 'var(--accent-blue)'}}>2x scraping speed boost</b> and simulate highly accurate <b style={{color: 'var(--accent-primary)'}}>member discounts (10%)</b> automatically on your searches.
                </p>
                
                <div className="cp-wishlist-list" style={{ display: 'grid', gap: '1rem' }}>
                  {[
                    { key: 'amazon', label: 'Amazon Profile URL', placeholder: 'https://www.amazon.in/hz/wishlist/ls/...', icon: '📦' },
                    { key: 'flipkart', label: 'Flipkart Profile URL', placeholder: 'https://www.flipkart.com/wishlist/...', icon: '⚡' },
                    { key: 'myntra', label: 'Myntra Profile URL', placeholder: 'https://www.myntra.com/wishlist/...', icon: '👗' },
                    { key: 'swiggy', label: 'Swiggy Profile URL', placeholder: 'Swiggy profile link or URL', icon: '🍕' },
                    { key: 'zomato', label: 'Zomato Profile URL', placeholder: 'Zomato profile link or URL', icon: '🍽️' },
                  ].map(w => (
                    <div key={w.key} className="cp-wishlist-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="cp-wishlist-label" style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                        <span className="cp-wishlist-icon" style={{ fontSize: '1.2rem' }}>{w.icon}</span>
                        <span>{w.label}</span>
                      </div>
                      <input
                        type="text"
                        className="cp-wishlist-input"
                        placeholder={w.placeholder}
                        value={localWishlistUrls[w.key] || ''}
                        onChange={(e) => handleWishlistChange(w.key, e.target.value)}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MEMBERSHIPS TAB ── */}
            {activeTab === 'memberships' && (
              <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Active Memberships</h3>
                <p className="cp-section-desc" style={{ marginBottom: '2rem' }}>
                  Toggle your active platform memberships. Free delivery & discount perks will be automatically applied during price comparison.
                </p>
                <div className="cp-membership-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {MEMBERSHIP_OPTIONS.map(m => {
                    const isActive = !!localMemberships[m.key];
                    return (
                      <div
                        key={m.key}
                        className={`cp-membership-card ${isActive ? 'active' : ''}`}
                        onClick={() => toggleMembership(m.key)}
                        style={{
                          '--membership-color': m.color,
                          borderColor: isActive ? m.color : 'var(--border-color)',
                          background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                        }}
                      >
                        <div className="cp-membership-icon-wrap">
                          <span className="cp-membership-emoji">{m.icon}</span>
                          {isActive && (
                            <div className="cp-membership-check">
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </div>
                        <span className="cp-membership-label">{m.label}</span>
                        <span className="cp-membership-stores">
                          {m.stores.join(', ')}
                        </span>
                        <div className={`cp-membership-toggle ${isActive ? 'on' : 'off'}`}>
                          <div className="cp-toggle-knob" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BANK CARDS TAB ── */}
            {activeTab === 'cards' && (
              <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Saved Bank Cards</h3>
                <p className="cp-section-desc" style={{ marginBottom: '2rem' }}>
                  Select your bank cards to calculate instant checkout discounts (5-10% off). We never store your card number — only the bank name.
                </p>
                <div className="cp-card-grid">
                  {BANK_CARD_OPTIONS.map(card => {
                    const isSelected = localBankCards.includes(card);
                    return (
                      <button
                        key={card}
                        className={`cp-bank-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleBankCard(card)}
                        style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                      >
                        <span className="cp-bank-icon">💳</span>
                        <span>{card}</span>
                        {isSelected && <CheckCircle size={14} style={{ marginLeft: '6px' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DIETARY TAB ── */}
            {activeTab === 'dietary' && (
              <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Dietary Preferences</h3>
                <p className="cp-section-desc" style={{ marginBottom: '2rem' }}>
                  Set your dietary preference to filter restaurant menus and food delivery results automatically.
                </p>
                <div className="cp-dietary-grid">
                  {DIETARY_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      className={`cp-dietary-pill ${localDietary === opt.key ? 'active' : ''}`}
                      onClick={() => setLocalDietary(opt.key)}
                      style={{ padding: '1rem', fontSize: '1rem' }}
                    >
                      <span className="cp-dietary-icon">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', minWidth: '150px' }}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>Save Changes</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
