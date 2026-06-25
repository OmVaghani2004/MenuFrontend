import React, { useState, useEffect } from 'react';
import { User, Building, Save, AlertCircle, CheckCircle } from 'lucide-react';
import type { RestaurantInfo } from '../types';
import { api } from '../api';

const CUISINES = [
  'American', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'Indian', 'Thai',
  'French', 'Mediterranean', 'Korean', 'Vietnamese', 'Brazilian', 'Greek',
  'Spanish', 'German', 'Lebanese', 'Turkish', 'Ethiopian'
];

export const Settings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'restaurant'>('profile');
  
  const [role] = useState(() => localStorage.getItem('role') || 'Staff');
  const isOwner = role === 'Owner';

  // State Management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Restaurant Fields
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [openingHours, setOpeningHours] = useState('');

  // Load configuration details
  const loadSettingsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load user profile
      const profileRes = await api.auth.getProfile();
      if (profileRes.success && profileRes.data) {
        setUsername(profileRes.data.username);
        setEmail(profileRes.data.email);
      }

      // Load restaurant settings (if they exist)
      try {
        const restRes = await api.restaurant.getInfo();
        if (restRes.success && restRes.data) {
          setRestaurantName(restRes.data.restaurantName);
          setDescription(restRes.data.description || '');
          setCuisineTypes(restRes.data.cuisineTypes || []);
          setPhone(restRes.data.phoneNumber || '');
          setRestaurantEmail(restRes.data.email || '');
          setStreetAddress(restRes.data.streetAddress || '');
          setCity(restRes.data.city || '');
          setState(restRes.data.state || '');
          setZipCode(restRes.data.zipCode || '');
          setOpeningHours(restRes.data.openingHours || '');
        }
      } catch (err) {
        console.warn('Restaurant info not set up yet.', err);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.auth.updateProfile({ username, email });
      setSuccess('User profile updated successfully.');
      localStorage.setItem('username', username); // Sync localStorage
    } catch (err: any) {
      setError(err?.message || 'Failed to update user profile.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    if (!isOwner) return;
    if (cuisineTypes.includes(cuisine)) {
      setCuisineTypes(cuisineTypes.filter((c) => c !== cuisine));
    } else {
      setCuisineTypes([...cuisineTypes, cuisine]);
    }
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (!restaurantName.trim() || cuisineTypes.length === 0) {
      setError('Restaurant name is required, and at least one cuisine must be selected.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const dto: Partial<RestaurantInfo> = {
        restaurantName,
        description,
        cuisineTypes,
        phoneNumber: phone || undefined,
        email: restaurantEmail || undefined,
        streetAddress: streetAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        openingHours: openingHours || undefined,
      };

      await api.restaurant.updateInfo(dto);
      setSuccess('Restaurant configuration updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update restaurant settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Messages */}
      {error && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--success)', backgroundColor: 'var(--success-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Internal Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', alignItems: 'start', gridAutoFlow: 'dense' }}>
        
        {/* Navigation Sidebar */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Settings Sections</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => { setActiveSubTab('profile'); setError(''); setSuccess(''); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeSubTab === 'profile' ? 'var(--primary-glow)' : 'transparent',
                border: '1px solid',
                borderColor: activeSubTab === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeSubTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'profile' ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'var(--transition-fast)'
              }}
            >
              <User size={18} />
              <span>User Profile</span>
            </button>

            <button
              onClick={() => { setActiveSubTab('restaurant'); setError(''); setSuccess(''); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeSubTab === 'restaurant' ? 'var(--primary-glow)' : 'transparent',
                border: '1px solid',
                borderColor: activeSubTab === 'restaurant' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeSubTab === 'restaurant' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'restaurant' ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'var(--transition-fast)'
              }}
            >
              <Building size={18} />
              <span>Restaurant Profile</span>
            </button>
          </div>
        </div>

        {/* Form panel */}
        <div className="glass-panel" style={{ padding: '32px', gridColumn: 'span 2' }}>
          
          {/* PROFILE FORM */}
          {activeSubTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Account Profile</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Update your authentication credentials and email addresses
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Access Level / Role</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={role} 
                  disabled 
                  style={{ opacity: 0.7 }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }} disabled={loading}>
                {loading ? <div className="spinner" /> : (
                  <>
                    <Save size={16} />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* RESTAURANT FORM */}
          {activeSubTab === 'restaurant' && (
            <form onSubmit={handleRestaurantSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Storefront Settings</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {isOwner 
                    ? 'Configure the public information displayed to customers on the digital checkout portal'
                    : 'View restaurant details (Editing is restricted to Owner roles only)'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Restaurant Display Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  disabled={!isOwner}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Public Description</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuisines Selection (At least one)</label>
                <div 
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    maxHeight: '140px',
                    overflowY: 'auto'
                  }}
                >
                  {CUISINES.map((cuisine) => {
                    const isSelected = cuisineTypes.includes(cuisine);
                    return (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => toggleCuisine(cuisine)}
                        disabled={!isOwner}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: isOwner ? 'pointer' : 'default',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: isSelected ? 'var(--primary-glow)' : 'transparent',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {cuisine}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Public Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={restaurantEmail}
                    onChange={(e) => setRestaurantEmail(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Opening Hours</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="e.g. Mon-Fri: 9:00 AM - 10:00 PM, Sat-Sun: 10:00 AM - 11:00 PM"
                  disabled={!isOwner}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Province</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP / Postal Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              {isOwner && (
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }} disabled={loading}>
                  {loading ? <div className="spinner" /> : (
                    <>
                      <Save size={16} />
                      <span>Save Restaurant Settings</span>
                    </>
                  )}
                </button>
              )}
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
