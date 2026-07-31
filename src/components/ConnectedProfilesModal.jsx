import React, { useState, useEffect } from 'react';
import { useProfile, MEMBERSHIP_OPTIONS, BANK_CARD_OPTIONS, DIETARY_OPTIONS } from '../context/ProfileContext';

export default function ConnectedProfilesModal({ isOpen, onClose, addToast }) {
  const { profile, saveProfile, loading } = useProfile();
  const [localMemberships, setLocalMemberships] = useState({});
  const [localBankCards, setLocalBankCards] = useState([]);
  const [localWishlistUrls, setLocalWishlistUrls] = useState({});
  const [localDietary, setLocalDietary] = useState('any');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('memberships');

  // Sync local state from profile when modal opens
  useEffect(() => {
    if (profile && isOpen) {
      setLocalMemberships(profile.memberships || {});
      setLocalBankCards(profile.bankCards || []);
      setLocalWishlistUrls(profile.wishlistUrls || {});
      setLocalDietary(profile.dietaryPreference || 'any');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

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
      addToast?.('Profile & Perks updated ✓', 'success');
      onClose();
    } catch (err) {
      addToast?.('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeMembershipsCount = Object.values(localMemberships).filter(Boolean).length;
  const activeCardsCount = localBankCards.length;

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cp-modal-header">
          <div className="cp-modal-header-left">
            <div className="cp-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2 className="cp-modal-title">Connected Profiles & Perks</h2>
              <p className="cp-modal-subtitle">
                Link memberships & cards for hyper-accurate pricing
              </p>
            </div>
          </div>
          <button className="cp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Active Perks Summary Badge */}
        {(activeMembershipsCount > 0 || activeCardsCount > 0) && (
          <div className="cp-perks-summary">
            <span className="cp-perks-count">
              {activeMembershipsCount + activeCardsCount} Active Perks
            </span>
            <span className="cp-perks-detail">
              {activeMembershipsCount > 0 && `${activeMembershipsCount} membership${activeMembershipsCount > 1 ? 's' : ''}`}
              {activeMembershipsCount > 0 && activeCardsCount > 0 && ' · '}
              {activeCardsCount > 0 && `${activeCardsCount} card${activeCardsCount > 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="cp-tabs">
          {[
            { key: 'memberships', label: 'Memberships', icon: '👑', count: activeMembershipsCount },
            { key: 'cards', label: 'Bank Cards', icon: '💳', count: activeCardsCount },
            { key: 'wishlists', label: 'Wishlists', icon: '📋' },
            { key: 'dietary', label: 'Dietary', icon: '🥗' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`cp-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="cp-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && <span className="cp-tab-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="cp-tab-content">
          {/* ── MEMBERSHIPS TAB ── */}
          {activeTab === 'memberships' && (
            <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <p className="cp-section-desc">
                Toggle your active platform memberships. Free delivery & discount perks will be automatically applied during price comparison.
              </p>
              <div className="cp-membership-grid">
                {MEMBERSHIP_OPTIONS.map(m => {
                  const isActive = !!localMemberships[m.key];
                  return (
                    <div
                      key={m.key}
                      className={`cp-membership-card ${isActive ? 'active' : ''}`}
                      onClick={() => toggleMembership(m.key)}
                      style={{
                        '--membership-color': m.color,
                        borderColor: isActive ? m.color : 'var(--border-color)'
                      }}
                    >
                      <div className="cp-membership-icon-wrap">
                        <span className="cp-membership-emoji">{m.icon}</span>
                        {isActive && (
                          <div className="cp-membership-check">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
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
              <p className="cp-section-desc">
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
                    >
                      <span className="cp-bank-icon">💳</span>
                      <span>{card}</span>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: '4px' }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── WISHLISTS TAB ── */}
          {activeTab === 'wishlists' && (
            <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <p className="cp-section-desc">
                Paste your public wishlist or saved-items URLs. We'll auto-track prices and alert you on drops.
              </p>
              <div className="cp-wishlist-list">
                {[
                  { key: 'amazon', label: 'Amazon Wishlist', placeholder: 'https://www.amazon.in/hz/wishlist/ls/...', icon: '📦' },
                  { key: 'flipkart', label: 'Flipkart Saved Items', placeholder: 'https://www.flipkart.com/wishlist/...', icon: '⚡' },
                  { key: 'myntra', label: 'Myntra Wishlist', placeholder: 'https://www.myntra.com/wishlist/...', icon: '👗' },
                  { key: 'swiggy', label: 'Swiggy Favourites', placeholder: 'Swiggy profile handle or URL', icon: '🍕' },
                  { key: 'zomato', label: 'Zomato Profile', placeholder: 'Zomato profile handle or URL', icon: '🍽️' },
                ].map(w => (
                  <div key={w.key} className="cp-wishlist-row">
                    <div className="cp-wishlist-label">
                      <span className="cp-wishlist-icon">{w.icon}</span>
                      <span>{w.label}</span>
                    </div>
                    <input
                      type="text"
                      className="cp-wishlist-input"
                      placeholder={w.placeholder}
                      value={localWishlistUrls[w.key] || ''}
                      onChange={(e) => handleWishlistChange(w.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DIETARY TAB ── */}
          {activeTab === 'dietary' && (
            <div className="cp-section" style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <p className="cp-section-desc">
                Set your dietary preference to filter restaurant menus and food delivery results automatically.
              </p>
              <div className="cp-dietary-grid">
                {DIETARY_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`cp-dietary-pill ${localDietary === opt.key ? 'active' : ''}`}
                    onClick={() => setLocalDietary(opt.key)}
                  >
                    <span className="cp-dietary-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cp-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary cp-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="cp-spinner" /> Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save Perks
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
