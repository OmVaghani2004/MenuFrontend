import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Grid3X3, 
  UtensilsCrossed, 
  Layers,
  Percent,
  Calendar,
  AlertCircle,
  Eye
} from 'lucide-react';
import { api } from '../api';
import type { DashboardStats, RestaurantInfo } from '../types';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch stats and restaurant info concurrently
      const [statsRes, restRes] = await Promise.all([
        api.orders.getStats(),
        api.restaurant.getInfo()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (restRes.success) setRestaurant(restRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Could not fetch dashboard analytics. Make sure your backend API is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--primary)' }} />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Welcome Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '32px', 
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%), var(--bg-surface-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
            Welcome back, {restaurant?.restaurantName || 'Restaurateur'}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {restaurant?.description || 'Your digital restaurant portal is running. You can manage menu listings, active dining tables, waiter credentials, and track live customer orders here.'}
          </p>
          {restaurant?.cuisineTypes && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
              {restaurant.cuisineTypes.map(c => (
                <span key={c} className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{c}</span>
              ))}
            </div>
          )}
        </div>
        <div 
          className="glass-panel" 
          style={{ 
            padding: '12px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            backgroundColor: 'rgba(255,255,255,0.02)' 
          }}
        >
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {error && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '20px', 
            marginBottom: '32px', 
            borderColor: 'rgba(239, 68, 68, 0.2)',
            backgroundColor: 'var(--danger-glow)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--danger)'
          }}
        >
          <AlertCircle size={24} />
          <div>
            <p style={{ fontWeight: 700 }}>Connection Warning</p>
            <p style={{ fontSize: '0.85rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Grid Statistics */}
      {stats && (
        <>
          <div className="grid-stats">
            {/* Total Revenue */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Total Revenue</h3>
                <p>{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)' }}>
                <DollarSign size={24} />
              </div>
            </div>

            {/* Today's Revenue */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Today's Sales</h3>
                <p>{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Total Orders */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Total Orders</h3>
                <p>{stats.totalOrders}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                <ShoppingBag size={24} />
              </div>
            </div>

            {/* Active Orders */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Active Orders</h3>
                <p>{stats.activeOrders}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <Layers size={24} />
              </div>
            </div>
          </div>

          <div className="grid-stats">
            {/* Table occupancy */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Tables Occupied</h3>
                <p>{stats.tablesOccupied} / {stats.totalTables}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
                <Grid3X3 size={24} />
              </div>
            </div>

            {/* Average Order Value */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Avg Order Value</h3>
                <p>{formatCurrency(stats.avgOrderValue)}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)' }}>
                <Percent size={20} />
              </div>
            </div>

            {/* Total Menu Items */}
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <h3>Total Dishes</h3>
                <p>{stats.totalMenuItems}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <UtensilsCrossed size={20} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Center / Quick Links */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <a href="/orders" className="btn btn-primary">
            View Live Kitchen Orders
          </a>
          <a href="/menu" className="btn btn-secondary">
            Manage Menu Items
          </a>
          <a href="/tables" className="btn btn-secondary">
            Check Dining Layout
          </a>
          {/* Preview the customer-facing menu */}
          <a
            href="/menu-view"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <Eye size={16} />
            Preview Customer Menu
          </a>
        </div>
      </div>
    </div>
  );
};
