import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChefHat, Send, CheckCircle } from 'lucide-react';
import { api } from '../api';
import type { Category, MenuItem } from '../types';

interface CartItem {
  menuItemId: number;
  foodName: string;
  price: number;
  quantity: number;
}

export const CustomerMenu: React.FC = () => {
  // Read table info from URL query params  e.g. /menu-view?table=5&tableId=3
  const params = new URLSearchParams(window.location.search);
  const tableNumber = params.get('table') || '';
  const tableId = params.get('tableId') ? parseInt(params.get('tableId')!) : undefined;

  const [categories, setCategories] = useState<Category[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<number, MenuItem[]>>({});
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [error, setError] = useState('');
  const [restaurantName, setRestaurantName] = useState('Our Restaurant');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Load restaurant info and categories in parallel
        const [restRes, catRes] = await Promise.all([
          api.restaurant.getInfo().catch(() => ({ success: false, data: null })),
          api.menu.getCategories(),
        ]);

        if (restRes.success && restRes.data) setRestaurantName(restRes.data.restaurantName);
        if (catRes.success && catRes.data && catRes.data.length > 0) {
          const activeCats = catRes.data.filter(c => c.isActive);
          setCategories(activeCats);
          setSelectedCat(activeCats[0]?.categoryId ?? null);

          // Load all items for every category at once
          const entries = await Promise.all(
            activeCats.map(c =>
              api.menu.getItems(c.categoryId).then(r => [c.categoryId, r.data ?? []] as [number, MenuItem[]])
            )
          );
          setItemsByCategory(Object.fromEntries(entries));
        }
      } catch (e: any) {
        setError('Could not load menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.itemId);
      if (existing) return prev.map(c => c.menuItemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.itemId, foodName: item.foodName, price: item.price, quantity: 1 }];
    });
  };

  const removeOne = (menuItemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(c => c.menuItemId !== menuItemId);
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const removeFromCart = (menuItemId: number) => setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) return;
    try {
      setPlacing(true); setError('');
      await api.orders.place({
        tableId: tableId ?? null,
        customerName: customerName.trim() || null,
        customerPhone: null,
        notes: notes.trim() || null,
        items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      });
      setOrdered(true);
      setCart([]);
      setCartOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const currentItems = selectedCat ? (itemsByCategory[selectedCat] ?? []) : [];

  // ── Success screen ─────────────────────────────────────────────────────────
  if (ordered) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', color: 'white', maxWidth: '360px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <CheckCircle size={40} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>Order Placed! 🎉</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Your order has been sent to the kitchen.</p>
          {tableNumber && <p style={{ color: '#6366f1', fontWeight: 600 }}>Table {tableNumber}</p>}
          <button
            onClick={() => setOrdered(false)}
            style={{ marginTop: '32px', padding: '12px 28px', borderRadius: '999px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            Order More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChefHat size={24} color="#6366f1" />
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{restaurantName}</h1>
            {tableNumber && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Table {tableNumber}</p>}
          </div>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          style={{ position: 'relative', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '999px', padding: '10px 18px', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={18} />
          <span>Cart</span>
          {cartCount > 0 && (
            <span style={{ background: '#ef4444', borderRadius: '999px', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, padding: '0 5px' }}>{cartCount}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px 120px 16px' }}>

          {error && (
            <div style={{ margin: '16px 0', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '0.88rem' }}>{error}</div>
          )}

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '20px 0 16px 0', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button key={cat.categoryId} onClick={() => setSelectedCat(cat.categoryId)}
                style={{ flexShrink: 0, padding: '8px 18px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                  borderColor: selectedCat === cat.categoryId ? '#6366f1' : 'rgba(255,255,255,0.12)',
                  background: selectedCat === cat.categoryId ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: selectedCat === cat.categoryId ? '#818cf8' : 'rgba(255,255,255,0.6)' }}>
                {cat.categoryName}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          {currentItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '60px 0' }}>No items in this category.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {currentItems.filter(i => !i.soldOut).map(item => {
                const cartQty = cart.find(c => c.menuItemId === item.itemId)?.quantity ?? 0;
                const primaryImg = item.images.find(img => img.isPrimary)?.imageUrl ?? item.images[0]?.imageUrl;
                return (
                  <div key={item.itemId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Image */}
                    <div style={{ height: '160px', background: 'rgba(255,255,255,0.02)', position: 'relative', flexShrink: 0 }}>
                      {primaryImg
                        ? <img src={primaryImg} alt={item.foodName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '2rem' }}>🍽️</div>}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '4px' }}>
                        {item.isVeg && <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px' }}>VEG</span>}
                        {item.isPopular && <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px' }}>Popular</span>}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{item.foodName}</h3>
                        <span style={{ fontWeight: 800, color: '#818cf8', whiteSpace: 'nowrap', flexShrink: 0 }}>${item.price.toFixed(2)}</span>
                      </div>
                      {item.description && <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}

                      {/* Add / Qty controls */}
                      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                        {cartQty === 0 ? (
                          <button onClick={() => addToCart(item)}
                            style={{ width: '100%', padding: '9px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Plus size={16} /> Add to Order
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.15)', borderRadius: '10px', padding: '4px' }}>
                            <button onClick={() => removeOne(item.itemId)} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '6px', display: 'flex' }}><Minus size={16} /></button>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{cartQty}</span>
                            <button onClick={() => addToCart(item)} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '6px', display: 'flex' }}><Plus size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Cart Button (mobile) */}
      {cartCount > 0 && !cartOpen && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <button onClick={() => setCartOpen(true)}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '999px', padding: '14px 28px', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 30px rgba(99,102,241,0.5)' }}>
            <ShoppingCart size={20} />
            <span>{cartCount} item{cartCount > 1 ? 's' : ''} · ${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '85vh', zIndex: 80, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer header */}
            <div style={{ padding: '20px 20px 12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Your Order {tableNumber && <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '0.85rem' }}>· Table {tableNumber}</span>}</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '16px 20px' }}>
              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Your cart is empty.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cart.map(c => (
                    <div key={c.menuItemId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ flexGrow: 1 }}>
                        <p style={{ fontWeight: 600, margin: 0 }}>{c.foodName}</p>
                        <p style={{ color: '#818cf8', margin: '2px 0 0 0', fontSize: '0.85rem' }}>${(c.price * c.quantity).toFixed(2)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => removeOne(c.menuItemId)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                        <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{c.quantity}</span>
                        <button onClick={() => addToCart({ itemId: c.menuItemId, foodName: c.foodName, price: c.price } as any)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'white', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                        <button onClick={() => removeFromCart(c.menuItemId)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: '4px', display: 'flex' }}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Name & Notes */}
              {cart.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Your name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '0.9rem', outline: 'none' }} />
                  <textarea placeholder="Special requests / notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '0.9rem', outline: 'none', resize: 'none' }} />
                </div>
              )}
            </div>

            {/* Place Order Footer */}
            {cart.length > 0 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Total</p>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#818cf8' }}>${cartTotal.toFixed(2)}</p>
                </div>
                <button onClick={handleOrder} disabled={placing}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '12px', padding: '14px 24px', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: placing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: placing ? 0.7 : 1 }}>
                  {placing ? '...' : <><Send size={18} /> Place Order</>}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
