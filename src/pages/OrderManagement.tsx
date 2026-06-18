import React, { useEffect, useState, useRef } from 'react';
import { Bell, Receipt, CreditCard, Play, CheckCircle, XCircle, Filter, Calendar, AlertCircle, DollarSign, RefreshCw, MessageSquare, Grid3X3 } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { api, getApiBaseUrl } from '../api';
import type { Order, Table } from '../types';
import { Modal } from '../components/Modal';

export const OrderManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tables' | 'history'>('tables');

  // Tables + Orders state
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaid, setShowPaid] = useState(false);

  // SignalR
  const [isConnected, setIsConnected] = useState(false);
  const connRef = useRef<signalR.HubConnection | null>(null);

  // Billing Modal
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // History
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [historyLoading, setHistoryLoading] = useState(false);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 300);
    } catch { /* ignore */ }
  };

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const [tablesRes, ordersRes] = await Promise.all([
        api.tables.getAll(),
        api.orders.getKitchen(),
      ]);
      if (tablesRes.success && tablesRes.data) setTables(tablesRes.data);
      if (ordersRes.success && ordersRes.data) {
        const sorted = [...ordersRes.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(sorted);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load orders.');
    } finally { setLoading(false); }
  };

  // SignalR setup
  useEffect(() => {
    if (activeTab !== 'tables') return;
    loadData();

    const base = getApiBaseUrl().replace(/\/$/, '');
    const token = localStorage.getItem('token') || '';

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${base}/orderHub`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connRef.current = conn;

    conn.on('ReceiveNewOrder', (newOrder: Order) => {
      playBeep();
      setOrders(prev => [newOrder, ...prev.filter(o => o.orderId !== newOrder.orderId)]);
    });

    conn.on('ReceiveStatusUpdate', ({ orderId, status }: { orderId: number; status: string }) => {
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    });

    conn.onreconnecting(() => setIsConnected(false));
    conn.onreconnected(() => { setIsConnected(true); loadData(); });
    conn.onclose(() => setIsConnected(false));

    conn.start()
      .then(async () => {
        setIsConnected(true);
        await conn.invoke('JoinAdminGroup');
      })
      .catch(err => {
        console.warn('SignalR failed:', err);
        setIsConnected(false);
      });

    return () => { conn.stop(); setIsConnected(false); };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, selectedMonth, selectedYear]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true); setError('');
      const res = await api.orders.getByMonth(selectedMonth, parseInt(selectedYear));
      if (res.success && res.data) setHistoryOrders(res.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load history.');
    } finally { setHistoryLoading(false); }
  };

  const handleUpdateStatus = async (orderId: number, next: string) => {
    try {
      await api.orders.updateStatus(orderId, next);
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: next } : o));
    } catch (e: any) { alert(e?.message || 'Failed to update status.'); }
  };

  const openBilling = (order: Order) => {
    setSelectedOrder(order); setPaymentMode('Cash'); setIsBillingOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.orders.markPaid(selectedOrder.orderId, paymentMode);
      setIsBillingOpen(false);
      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? { ...o, isPaid: true, paymentMode } : o));
    } catch (e: any) { alert(e?.message || 'Payment failed.'); }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'Pending':   return { text: 'Start Prep',     next: 'Preparing', icon: <Play size={13} /> };
      case 'Preparing': return { text: 'Mark Ready',     next: 'Ready',     icon: <CheckCircle size={13} /> };
      case 'Ready':     return { text: 'Mark Completed', next: 'Completed', icon: <CheckCircle size={13} /> };
      default: return null;
    }
  };

  const badgeClass = (s: string) => {
    switch (s) {
      case 'Pending':   return 'badge-danger';
      case 'Preparing': return 'badge-warning';
      case 'Ready':     return 'badge-info';
      case 'Completed': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  // For table view: get orders for a specific table
  const ordersForTable = (tableId: number) =>
    orders.filter(o => o.tableId === tableId && (showPaid ? o.isPaid : !o.isPaid));

  // Takeaway orders (no table)
  const takeawayOrders = orders.filter(o => !o.tableId && (showPaid ? o.isPaid : !o.isPaid));

  const borderColor = (o: Order) => {
    if (o.isPaid) return 'var(--success)';
    switch (o.status) {
      case 'Pending':   return 'var(--danger)';
      case 'Preparing': return 'var(--warning)';
      case 'Ready':     return 'var(--primary)';
      default:          return 'var(--border-color)';
    }
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const action = getNextAction(order.status);
    return (
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderLeft: `3px solid ${borderColor(order)}`,
        borderRadius: 'var(--radius-sm)',
        padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{order.orderNumber}</span>
              <span className={`badge ${badgeClass(order.status)}`}>{order.status}</span>
              {order.isPaid && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✓ Paid</span>}
            </div>
            {order.customerName && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{order.customerName}</p>}
          </div>
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>${order.totalAmount.toFixed(2)}</span>
        </div>

        {/* Items */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {order.items.map(i => (
            <span key={i.orderItemId}><strong style={{ color: 'var(--primary)' }}>{i.quantity}×</strong> {i.itemName}</span>
          ))}
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', color: 'var(--warning)', backgroundColor: 'var(--warning-glow)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
            <MessageSquare size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{order.notes}</span>
          </div>
        )}

        {/* Time */}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {order.paymentMode && ` · ${order.paymentMode}`}
        </p>

        {/* Actions */}
        {!order.isPaid && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {action && (
              <button className="btn btn-primary" style={{ flexGrow: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                onClick={() => handleUpdateStatus(order.orderId, action.next)}>
                {action.icon}<span>{action.text}</span>
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: '7px 10px' }} title="Collect Payment" onClick={() => openBilling(order)}>
              <Receipt size={14} />
            </button>
            {order.status !== 'Completed' && order.status !== 'Cancelled' && (
              <button className="btn btn-danger" style={{ padding: '7px 10px' }} title="Cancel"
                onClick={() => { if (window.confirm('Cancel this order?')) handleUpdateStatus(order.orderId, 'Cancelled'); }}>
                <XCircle size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Top Tab Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${activeTab === 'tables' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('tables')}>
            <Grid3X3 size={16} /><span>Table View</span>
          </button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
            <Calendar size={16} /><span>Monthly Reports</span>
          </button>
        </div>

        {activeTab === 'tables' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Paid toggle */}
            <button
              onClick={() => setShowPaid(p => !p)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: '1px solid', transition: 'var(--transition-fast)',
                borderColor: showPaid ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: showPaid ? 'var(--success-glow)' : 'transparent',
                color: showPaid ? 'var(--success)' : 'var(--text-secondary)',
              }}>
              {showPaid ? '✓ Showing Paid' : '$ Show Paid Orders'}
            </button>
            <span style={{ fontSize: '0.8rem', color: isConnected ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
              ● {isConnected ? 'Live' : 'Reconnecting...'}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={loadData}><RefreshCw size={14} /></button>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '20px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {/* TABLE VIEW */}
      {activeTab === 'tables' && (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--primary)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Each Table Card */}
            {tables.length === 0 && takeawayOrders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Bell size={48} style={{ margin: '0 auto 20px auto', color: 'var(--text-muted)' }} />
                <h3>No tables configured yet.</h3>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>

                {tables.map(table => {
                  const tableOrders = ordersForTable(table.tableId);
                  const hasActive = orders.some(o => o.tableId === table.tableId && !o.isPaid);
                  return (
                    <div key={table.tableId} className="glass-panel" style={{
                      padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
                      borderTop: `3px solid ${hasActive ? 'var(--warning)' : 'var(--border-color)'}`,
                      opacity: !hasActive && tableOrders.length === 0 ? 0.6 : 1,
                    }}>
                      {/* Table Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Table {table.tableNumber}</h3>
                          {table.tableName && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{table.tableName} · {table.location || 'Main Floor'}</p>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {hasActive
                            ? <span className="badge badge-warning">Active</span>
                            : <span className="badge badge-success">Empty</span>}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{table.capacity} seats</span>
                        </div>
                      </div>

                      {/* Orders for this table */}
                      {tableOrders.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                          {showPaid ? 'No paid orders' : 'No active orders'}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {tableOrders.map(o => <OrderCard key={o.orderId} order={o} />)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Takeaway / No-Table orders */}
                {takeawayOrders.length > 0 && (
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '3px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Takeaway / Delivery</h3>
                      <span className="badge badge-info">{takeawayOrders.length} order{takeawayOrders.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {takeawayOrders.map(o => <OrderCard key={o.orderId} order={o} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Month</label>
              <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ minWidth: '150px' }}>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Year</label>
              <input type="number" className="form-input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '100px' }} />
            </div>
            <button className="btn btn-primary" onClick={loadHistory} disabled={historyLoading} style={{ height: '45px' }}>
              {historyLoading ? <div className="spinner" /> : <><Filter size={16} /><span>Fetch Report</span></>}
            </button>
          </div>

          {historyOrders.length > 0 && (
            <div className="grid-stats" style={{ marginBottom: 0 }}>
              <div className="glass-panel stat-card">
                <div className="stat-info"><h3>Month Revenue</h3><p>${historyOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</p></div>
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)' }}><DollarSign size={20} /></div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-info"><h3>Total Orders</h3><p>{historyOrders.length}</p></div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}><Receipt size={20} /></div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-info"><h3>Unpaid</h3><p>${historyOrders.filter(o => !o.isPaid && o.status !== 'Cancelled').reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</p></div>
                <div className="stat-icon" style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)' }}><CreditCard size={20} /></div>
              </div>
            </div>
          )}

          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--primary)' }} />
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="glass-panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Receipt size={48} style={{ margin: '0 auto 20px auto', color: 'var(--text-muted)' }} />
              <h3>No orders for {selectedMonth} {selectedYear}</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead><tr><th>Order #</th><th>Table</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {historyOrders.map(o => (
                    <tr key={o.orderId}>
                      <td style={{ fontWeight: 700 }}>{o.orderNumber}</td>
                      <td>{o.tableNumber ? `Table ${o.tableNumber}` : 'Takeaway'}</td>
                      <td>{o.customerName || '-'}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>${o.totalAmount.toFixed(2)}</td>
                      <td><span className={`badge ${badgeClass(o.status)}`}>{o.status}</span></td>
                      <td>{o.isPaid ? <span className="badge badge-success">Paid ({o.paymentMode})</span> : <span className="badge badge-danger">Unpaid</span>}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{!o.isPaid && o.status !== 'Cancelled' ? <button className="btn btn-secondary btn-sm" onClick={() => openBilling(o)}>Collect Bill</button> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Billing Modal */}
      <Modal isOpen={isBillingOpen} onClose={() => setIsBillingOpen(false)} title={`Collect Bill: ${selectedOrder?.orderNumber}`} size="sm">
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Amount to Collect</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>${selectedOrder?.totalAmount.toFixed(2)}</h2>
            {selectedOrder?.tableNumber && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Table: {selectedOrder.tableNumber}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="UPI">UPI / QR</option>
              <option value="Wallet">Mobile Wallet</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsBillingOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>Confirm Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
