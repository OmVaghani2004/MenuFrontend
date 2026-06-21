import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Grid3X3, Users, MapPin, QrCode, AlertCircle, Edit, Download } from 'lucide-react';
import { api } from '../api';
import type { Table } from '../types';
import { Modal } from '../components/Modal';

export const TableManagement: React.FC = () => {
  const [role] = useState(() => localStorage.getItem('role') || 'Staff');
  const isOwner = role === 'Owner';

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Form Fields
  const [tableId, setTableId] = useState(0); // 0 = create, >0 = update
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [isActive, setIsActive] = useState(true);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.tables.getAll();
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve tables list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const openAddModal = () => {
    setTableId(0);
    setTableNumber('');
    setTableName('');
    setLocation('');
    setCapacity('4');
    setIsActive(true);
    setIsTableModalOpen(true);
  };

  const openEditModal = (table: Table) => {
    setTableId(table.tableId);
    setTableNumber(table.tableNumber);
    setTableName(table.tableName || '');
    setLocation(table.location || '');
    setCapacity(table.capacity.toString());
    setIsActive(table.isActive);
    setIsTableModalOpen(true);
  };

  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    setError('');

    try {
      const dto = {
        tableId,
        tableNumber,
        tableName: tableName || null,
        location: location || null,
        capacity: parseInt(capacity),
        isActive,
      };

      await api.tables.createOrUpdate(dto);
      setIsTableModalOpen(false);
      loadTables();
    } catch (err: any) {
      setError(err?.message || 'Failed to save table details.');
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this table? Customers will no longer be able to place orders from its QR Code.')) return;
    setError('');

    try {
      await api.tables.delete(id);
      loadTables();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete table.');
    }
  };

  const openQrModal = (table: Table) => {
    setSelectedTable(table);
    setIsQrModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'occupied':
        return <span className="badge badge-warning">Occupied</span>;
      case 'pending':
        return <span className="badge badge-danger">Pending Order</span>;
      default:
        return <span className="badge badge-success">Empty</span>;
    }
  };

  // Generate QR Code image URL using QRServer API
  const getQrCodeImageUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&color=090a0f&bgcolor=ffffff&data=${encodeURIComponent(url)}`;
  };

  /**
   * Build the customer-facing menu URL dynamically from the current deployment's origin.
   * This avoids the backend's stored FrontendUrl being stale after a redeployment.
   */
  const getMenuUrl = (table: Table) => {
    const origin = window.location.origin;
    return `${origin}/menu-view?table=${table.tableNumber}&tableId=${table.tableId}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Restaurant Tables</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Monitor occupancy states and retrieve QR codes for self-ordering checkouts
          </p>
        </div>

        {isOwner && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            <span>Create Table</span>
          </button>
        )}
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
      ) : tables.length === 0 ? (
        <div className="glass-panel" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Grid3X3 size={48} style={{ margin: '0 auto 20px auto', color: 'var(--text-muted)' }} />
          <h3>No dining tables configured yet.</h3>
          {isOwner && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openAddModal}>
              <Plus size={16} />
              <span>Add First Table</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {tables.map((table) => (
            <div
              key={table.tableId}
              className="glass-panel glass-panel-interactive"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: table.isActive ? 1 : 0.6
              }}
            >
              {/* Header: Table Number & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Table {table.tableNumber}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {table.tableName || 'Standard Table'}
                  </p>
                </div>
                {getStatusBadge(table.tableStatus)}
              </div>

              {/* Specs: Capacity & Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Capacity: {table.capacity} Guests</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Location: {table.location || 'Main Floor'}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => openQrModal(table)}
                >
                  <QrCode size={15} />
                  <span>QR Code</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => openEditModal(table)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex'
                        }}
                        className="btn-secondary"
                        title="Edit Table"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTable(table.tableId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex'
                        }}
                        className="btn-secondary"
                        title="Delete Table"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Table Creation/Edit Modal */}
      <Modal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title={tableId === 0 ? "Add Dining Table" : "Edit Table Details"}
      >
        <form onSubmit={handleTableSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Table Number (Identifier)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 5, 12, T-4"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Table Label / Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Window Corner, Bar-1"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Guest Capacity</label>
              <select
                className="form-input"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              >
                <option value="2">2 Seats (Couples)</option>
                <option value="4">4 Seats (Standard)</option>
                <option value="6">6 Seats (Family)</option>
                <option value="8">8 Seats (Large)</option>
                <option value="12">12 Seats (Group Banquets)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location Section</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Patio, Ground Floor, Rooftop"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <label className="form-checkbox" style={{ margin: '8px 0' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Table is active and available for customer checkins</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTableModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {tableId === 0 ? "Create Table" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`Table ${selectedTable?.tableNumber} checkout QR`}
        size="sm"
      >
        {selectedTable && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Customers can scan this QR code to view the menu and place orders from their phones.
            </p>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-color)'
              }}
            >
              <img
                src={getQrCodeImageUrl(getMenuUrl(selectedTable))}
                alt={`QR code for Table ${selectedTable.tableNumber}`}
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>

            <div style={{ width: '100%' }}>
              <div
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all',
                  marginBottom: '16px'
                }}
              >
                {getMenuUrl(selectedTable)}
              </div>

              <a
                href={getQrCodeImageUrl(getMenuUrl(selectedTable))}
                target="_blank"
                rel="noreferrer"
                download={`table_${selectedTable.tableNumber}_qr.png`}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', gap: '8px' }}
              >
                <Download size={16} />
                <span>Open in Tab to Save</span>
              </a>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
