import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, ArrowLeft, ArrowRight, Check, User, MapPin, Building } from 'lucide-react';
import { api } from '../api';

const CUISINES = [
  'American', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'Indian', 'Thai',
  'French', 'Mediterranean', 'Korean', 'Vietnamese', 'Brazilian', 'Greek',
  'Spanish', 'German', 'Lebanese', 'Turkish', 'Ethiopian'
];

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Owner Admin
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Step 2: Restaurant Basic
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  // Step 3: Restaurant Contact & Location
  const [phone, setPhone] = useState('');
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter((c) => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!ownerUsername || !ownerEmail || !ownerPassword) {
        setError('Please fill out all owner details.');
        return false;
      }
      if (ownerPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }
      if (!ownerEmail.includes('@')) {
        setError('Enter a valid email address.');
        return false;
      }
    } else if (step === 2) {
      if (!restaurantName || !description) {
        setError('Restaurant name and description are required.');
        return false;
      }
      if (selectedCuisines.length === 0) {
        setError('Please select at least one cuisine type.');
        return false;
      }
    } else if (step === 3) {
      if (!phone || !restaurantEmail || !streetAddress || !city || !state || !zipCode) {
        setError('Please fill out all address and contact details.');
        return false;
      }
      if (!restaurantEmail.includes('@')) {
        setError('Enter a valid public contact email.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setError('');
    setLoading(true);

    try {
      // Step A: Register the Owner Admin
      const signupDto = {
        username: ownerUsername,
        email: ownerEmail,
        password: ownerPassword,
      };
      
      await api.auth.signup(signupDto);

      // Step B: Configure the Restaurant settings (anonymous setup endpoint)
      const onboardingDto = {
        basicInfo: {
          restaurantName,
          description,
          cuisineTypes: selectedCuisines,
        },
        contactInfo: {
          phoneNumber: phone,
          email: restaurantEmail,
          streetAddress,
          city,
          state,
          zipCode,
        },
      };

      await api.restaurant.setupOnboarding(onboardingDto);

      // Success
      alert('Restaurant onboarding completed successfully! Please log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err?.message || 'Onboarding failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepPercentage = () => {
    if (step === 1) return '0%';
    if (step === 2) return '50%';
    return '100%';
  };

  return (
    <div className="auth-container">
      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '650px', 
          padding: '40px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        
        {/* Brand Header */}
        <div className="auth-header" style={{ marginBottom: '24px' }}>
          <div 
            style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              boxShadow: 'var(--shadow-primary)'
            }}
          >
            <ChefHat size={26} style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Onboard Restaurant</h1>
          <p style={{ fontSize: '0.85rem' }}>Set up your administration account and storefront profile</p>
        </div>

        {/* Stepper Indicator */}
        <div className="stepper-steps">
          <div className="stepper-progress-bar" style={{ width: getStepPercentage() }} />
          
          <div className={`stepper-step ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="stepper-circle">{step > 1 ? <Check size={16} /> : '1'}</div>
            <span className="stepper-label">Admin Owner</span>
          </div>

          <div className={`stepper-step ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="stepper-circle">{step > 2 ? <Check size={16} /> : '2'}</div>
            <span className="stepper-label">Restaurant info</span>
          </div>

          <div className={`stepper-step ${step === 3 ? 'active' : ''}`}>
            <div className="stepper-circle">3</div>
            <span className="stepper-label">Contact info</span>
          </div>
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
              marginBottom: 24,
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleFinishOnboarding}>
          
          {/* STEP 1: OWNER ACCOUNT */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} />
                <span>Step 1: Admin Account Creation</span>
              </h3>
              
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. JohnOwner"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (for password OTP recovery)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="e.g. owner@myrestaurant.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Minimum 6 characters"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 2: RESTAURANT PROFILE */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} style={{ color: 'var(--primary)' }} />
                <span>Step 2: Restaurant Profile Details</span>
              </h3>

              <div className="form-group">
                <label className="form-label">Restaurant Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Bella Italia Bistro"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Provide a short, welcoming description for your customers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '8px' }}>Cuisine Types (Select all that apply)</label>
                <div 
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  {CUISINES.map((cuisine) => {
                    const isSelected = selectedCuisines.includes(cuisine);
                    return (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => toggleCuisine(cuisine)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
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
            </div>
          )}

          {/* STEP 3: CONTACTS & LOCATION */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                <span>Step 3: Location & Contact Details</span>
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Public Contact Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="info@bellaitalia.com"
                    value={restaurantEmail}
                    onChange={(e) => setRestaurantEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="123 Gourmet Way, Suite 100"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Province</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="NY"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP / Postal Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="10001"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-color)' 
            }}
          >
            {step > 1 ? (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={prevStep}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={nextStep}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--success)' }}
                disabled={loading}
              >
                {loading ? <div className="spinner" /> : (
                  <>
                    <span>Finish & Build Portal</span>
                    <Check size={16} />
                  </>
                )}
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already onboarded?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary)' }}>
              Log in here
            </Link>
          </div>

        </form>

      </div>
    </div>
  );
};
