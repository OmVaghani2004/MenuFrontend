import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Clipboard, Check, AlertCircle, Calendar, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import type { Waiter, CreateWaiterResponse } from '../types';
import { Modal } from '../components/Modal';

export const WaiterManagement: React.FC = () => {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [newWaiterCreds, setNewWaiterCreds] = useState<CreateWaiterResponse | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Copy state
  const [copiedText, setCopiedText] = useState(false);

  const loadWaiters = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.auth.getWaiters();
      if (res.success && res.data) {
        setWaiters(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch waiters list. Verify you have Owner role privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaiters();
  }, []);

  const handleCreateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    
    setError('');
    setSubmitLoading(true);

    try {
      const res = await api.auth.createWaiter({ username, email });
      if (res.success && res.data) {
        setNewWaiterCreds(res.data);
        setIsCreateModalOpen(false);
        setIsRevealModalOpen(true);
        
        // Reset inputs
        setUsername('');
        setEmail('');
        
        loadWaiters();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create waiter profile.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatRevealText = (creds: CreateWaiterResponse) => {
    return `Waiter Account Created!\n\nUsername: ${creds.username}\nEmail: ${creds.email}\nTemporary Password: ${creds.temporaryPassword}\nToken: ${creds.token}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Waiters Directory</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage staff accounts and generate temporary sign-in credentials
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus size={18} />
          <span>Add Waiter</span>
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--primary)' }} />
        </div>
      ) : waiters.length === 0 ? (
        <div className="glass-panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ margin: '0 auto 20px auto', color: 'var(--text-muted)' }} />
          <h3>No waiter profiles registered.</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Click "Add Waiter" to create a staff account
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Waiter ID</th>
                <th>Username</th>
                <th>Email Address</th>
                <th>Account Type</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {waiters.map((waiter) => (
                <tr key={waiter.waiterId}>
                  <td style={{ fontWeight: 700 }}>#{waiter.waiterId}</td>
                  <td>{waiter.username}</td>
                  <td>{waiter.email}</td>
                  <td>
                    <span className="badge badge-info" style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                      {waiter.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{new Date(waiter.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Waiter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Waiter Account"
      >
        <form onSubmit={handleCreateWaiter} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            This will register a new user in the system with the "Waiter" role. A temporary password and signed token will be generated automatically.
          </p>
          
          <div className="form-group">
            <label className="form-label">Waiter Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. WaiterSam"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Waiter Email</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="e.g. sam@myrestaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? <div className="spinner" /> : 'Generate Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reveal Credentials Modal */}
      <Modal
        isOpen={isRevealModalOpen}
        onClose={() => setIsRevealModalOpen(false)}
        title="Staff Credentials Generated"
        size="md"
      >
        {newWaiterCreds && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              style={{ 
                display: 'flex', 
                gap: '10px', 
                padding: '12px 16px', 
                backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                color: 'var(--warning)', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid rgba(245, 158, 11, 0.15)',
                fontSize: '0.85rem' 
              }}
            >
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <span>
                <strong>Important:</strong> Copy the temporary password now. It is hashed on the server and cannot be viewed again.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Username</span>
                <strong style={{ color: 'var(--text-primary)' }}>{newWaiterCreds.username}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email Address</span>
                <strong style={{ color: 'var(--text-primary)' }}>{newWaiterCreds.email}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>One-Time Password</span>
                <code style={{ color: 'var(--warning)', fontSize: '1rem', fontWeight: 'bold', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {newWaiterCreds.temporaryPassword}
                </code>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Signed JWT Token (Ready to Use)</span>
                <textarea 
                  readOnly 
                  className="form-input" 
                  rows={3} 
                  style={{ fontSize: '0.75rem', fontFamily: 'monospace', resize: 'none' }}
                  value={newWaiterCreds.token}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button 
                type="button" 
                className={`btn ${copiedText ? 'btn-success' : 'btn-secondary'}`}
                style={{ flexGrow: 1, display: 'flex', gap: '8px' }}
                onClick={() => copyToClipboard(formatRevealText(newWaiterCreds))}
              >
                {copiedText ? <Check size={16} /> : <Clipboard size={16} />}
                <span>{copiedText ? 'Copied Details!' : 'Copy All Credentials'}</span>
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setIsRevealModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
