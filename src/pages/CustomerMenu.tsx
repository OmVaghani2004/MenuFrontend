import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, ChevronUp, Send } from 'lucide-react';
import { api } from '../api';
import type { Category, MenuItem } from '../types';

interface CartItem { menuItemId: number; foodName: string; price: number; quantity: number; img?: string; }

const fmt = (n: number) => `₹${n.toFixed(2)}`;

// localStorage key scoped to the table so different tables stay isolated
const orderKey = (tableId?: number) => tableId != null ? `active_order_${tableId}` : null;

export const CustomerMenu: React.FC = () => {
  // QR codes now only carry an opaque ?token= — no raw IDs in the URL
  const p = new URLSearchParams(window.location.search);
  const qrToken = p.get('token') || '';

  const [tableNumber, setTableNumber] = useState('');
  const [tableId,     setTableId]     = useState<number | undefined>(undefined);
  const [tokenError,  setTokenError]  = useState(false); // true = invalid/missing token

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [allItems,    setAllItems]    = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | 'all'>('all');
  const [search,      setSearch]      = useState('');
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [name,        setName]        = useState('');
  const [notes,       setNotes]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [placing,     setPlacing]     = useState(false);
  // orderId + editToken stored together: localStorage["active_order_{tableId}"] = "99:abc123"
  const [ordered,     setOrdered]     = useState(false);
  const [orderId,     setOrderId]     = useState<number | null>(null);
  const [editToken,   setEditToken]   = useState<string | null>(null);
  const [error,       setError]       = useState('');
  const [restName,    setRestName]    = useState('Our Restaurant');
  const [openingHours, setOpeningHours] = useState('');
  const catRef = useRef<HTMLDivElement>(null);

  // ── Step 1: resolve the QR token → get tableId + tableNumber ────────────────
  useEffect(() => {
    if (!qrToken) {
      setTokenError(true);
      setLoading(false);
      return;
    }

    api.tables.resolveToken(qrToken)
      .then(res => {
        if (!res.success || !res.data) {
          setTokenError(true);
          setLoading(false);
          return;
        }
        const { tableId: tid, tableNumber: tnum } = res.data;
        setTableId(tid);
        setTableNumber(tnum);

        // Restore orderId + editToken from localStorage once tableId is known
        const stored = localStorage.getItem(orderKey(tid) ?? '');
        if (stored) {
          const [storedOrderId, storedEditToken] = stored.split(':');
          if (storedOrderId) setOrderId(Number(storedOrderId));
          if (storedEditToken) setEditToken(storedEditToken);
        }
      })
      .catch(() => {
        setTokenError(true);
        setLoading(false);
      });
  }, [qrToken]);

  // ── Step 2: load menu + restaurant info once tableId is resolved ─────────────
  useEffect(() => {
    if (tableId === undefined) return; // wait for resolve
    (async () => {
      try {
        setLoading(true);
        const [restRes, catRes] = await Promise.all([
          api.restaurant.getInfo().catch(() => ({ success: false, data: null } as any)),
          api.menu.getCategories(),
        ]);
        if (restRes.success && restRes.data) {
          setRestName(restRes.data.restaurantName);
          if (restRes.data.openingHours) setOpeningHours(restRes.data.openingHours);
        }

        if (catRes.success && catRes.data?.length) {
          // Category entity has no isActive field — show all returned categories
          const cats = catRes.data;
          setCategories(cats);
          // Load items per category individually — catch each so one failure won't block others
          const results = await Promise.all(
            cats.map((c: Category) =>
              api.menu.getItems(c.categoryId)
                .then(r => r.data ?? [])
                .catch(() => [] as MenuItem[])
            )
          );
          setAllItems(results.flat());
        }
      } catch (e) {
        setError('Could not load menu. Please refresh.');
      } finally {
        setLoading(false);
      }
    })();
  }, [tableId]);

  const add = (item: MenuItem) => {
    const img = item.images?.find(i => i.isPrimary)?.imageUrl ?? item.images?.[0]?.imageUrl;
    setCart(p => {
      const ex = p.find(c => c.menuItemId === item.itemId);
      return ex ? p.map(c => c.menuItemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c)
                : [...p, { menuItemId: item.itemId, foodName: item.foodName, price: item.price, quantity: 1, img }];
    });
  };
  const dec = (id: number) => setCart(p => {
    const ex = p.find(c => c.menuItemId === id);
    if (!ex) return p;
    return ex.quantity === 1 ? p.filter(c => c.menuItemId !== id) : p.map(c => c.menuItemId === id ? { ...c, quantity: c.quantity - 1 } : c);
  });
  const remove = (id: number) => setCart(p => p.filter(c => c.menuItemId !== id));

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const count = cart.reduce((s, c) => s + c.quantity, 0);

  /**
   * Single submission handler:
   * – If an open orderId is stored → try editOrder (add to existing), sending the
   *   editToken so the backend can verify the customer owns this order.
   * – Only falls back to placeOrder if the backend explicitly rejects because
   *   the order is paid/cancelled/forbidden. Any other error is shown to the user.
   */
  const submitCart = async () => {
    if (!cart.length) return;
    setPlacing(true); setError('');
    const items = cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity }));
    const notesVal = notes.trim() || undefined;

    try {
      // ── Path A: add items to the existing open order ─────────────────────────────────
      if (orderId) {
        try {
          // Always send the editToken — the backend requires it for anonymous callers
          await api.orders.editOrder(orderId, { items, notes: notesVal, editToken: editToken ?? undefined });
          setCart([]); setCartOpen(false); setNotes('');
          flashSuccess();
          return; // ← done, no placeOrder
        } catch (editErr: any) {
          const msg: string = editErr?.message ?? '';
          console.warn('[CustomerMenu] editOrder failed:', msg);

          // Only clear & fall back when the backend says the order is closed.
          // 403 / "unauthorised" means our token is wrong — show the error, don't silently retry.
          const orderClosed =
            msg.toLowerCase().includes('paid')    ||
            msg.toLowerCase().includes('cancel')  ||
            msg.toLowerCase().includes('not found');

          if (!orderClosed) {
            setError(msg || 'Failed to add items. Please try again.');
            return;
          }

          // Order genuinely closed → clear stale state and fall through to new order
          const key = orderKey(tableId);
          if (key) localStorage.removeItem(key);
          setOrderId(null);
          setEditToken(null);
        }
      }

      // ── Path B: place a brand-new order ───────────────────────────────────────
      const res = await api.orders.place({
        tableId: tableId ?? null,
        customerName: name.trim() || null,
        customerPhone: null,
        notes: notesVal ?? null,
        items,
      });

      const newId    = res.data?.orderId   ?? null;
      const newToken = res.data?.editToken  ?? null;

      setOrderId(newId);
      setEditToken(newToken);

      // Persist both together: "orderId:editToken" so page refreshes keep ownership
      if (newId) {
        const key = orderKey(tableId);
        if (key) localStorage.setItem(key, `${newId}:${newToken ?? ''}`);
      }

      setCart([]); setCartOpen(false); setNotes('');
      flashSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  /** Show the success banner for 2 seconds then return to the menu. */
  const flashSuccess = () => {
    setOrdered(true);
    setTimeout(() => setOrdered(false), 2000);
  };

  const visible = allItems.filter(item => {
    if (item.soldOut) return false;
    if (selectedCat !== 'all' && item.categoryId !== selectedCat) return false;
    if (search && !item.foodName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── INVALID / MISSING QR TOKEN ────────────────────────────────────────────
  // Shown when the QR code URL has been tampered with or is missing ?token=
  if (tokenError) return (
    <div style={S.lightPage}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem' }}>🚫</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a1a' }}>Invalid QR Code</h1>
        <p style={{ color: '#666', fontSize: '1rem', maxWidth: 320 }}>
          This QR code is no longer valid. Please scan the QR code on your table directly.
        </p>
        <p style={{ color: '#bbb', fontSize: '0.78rem' }}>If you believe this is an error, please ask your waiter for assistance.</p>
      </div>
    </div>
  );

  // ── SUCCESS BANNER (auto-dismisses, no buttons, customer stays on the page) ──
  if (ordered) return (
    <div style={S.lightPage}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: '5rem' }}>✅</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1a1a1a' }}>Items Sent!</h1>
        <p style={{ color: '#666', fontSize: '1rem' }}>Your order has been updated. The kitchen is on it!</p>
        {tableNumber && <p style={{ fontWeight: 700, color: '#b8860b' }}>Table {tableNumber}</p>}
        <p style={{ color: '#bbb', fontSize: '0.82rem', marginTop: 4 }}>Returning to menu…</p>
      </div>
    </div>
  );

  // ── MAIN ─────────────────────────────────────────────────────────────────────
  return (
    <div style={S.lightPage}>
      {/* HEADER */}
      <header style={S.header}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a1a', margin: 0 }}>{restName}</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            {tableNumber && <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Table {tableNumber}</p>}
            {tableNumber && openingHours && <span style={{ color: '#ccc', fontSize: '0.8rem' }}>•</span>}
            {openingHours && <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>{openingHours}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={S.searchBox}>
            <Search size={15} color="#999" style={{ flexShrink: 0 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search menu items..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#333', width: '100%' }}
            />
          </div>
          <button onClick={() => setCartOpen(true)} style={S.cartBtn}>
            <ShoppingCart size={18} />
            {count > 0 && <span style={S.cartBadge}>{count}</span>}
          </button>
        </div>
      </header>

      {/* CATEGORY TABS */}
      {!loading && (
        <div ref={catRef} style={S.catBar}>
          <button
            onClick={() => setSelectedCat('all')}
            style={{ ...S.catTab, ...(selectedCat === 'all' ? S.catTabActive : {}) }}
          >All</button>
          {categories.map(c => (
            <button key={c.categoryId}
              onClick={() => setSelectedCat(c.categoryId)}
              style={{ ...S.catTab, ...(selectedCat === c.categoryId ? S.catTabActive : {}) }}
            >{c.categoryName}</button>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 120px' }}>
        {error && <div style={S.errBox}>{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 12 }}>
            <div style={S.spinner} />
            <p style={{ color: '#999' }}>Loading menu…</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍽️</div>
            <p style={{ fontSize: '1rem' }}>{search ? 'No items match your search.' : 'No items in this category.'}</p>
          </div>
        ) : (
          /* Render by category sections when "All" selected */
          selectedCat === 'all' ? (
            <>
              {categories.map(cat => {
                const items = visible.filter(i => i.categoryId === cat.categoryId);
                if (!items.length) return null;
                return (
                  <section key={cat.categoryId} style={{ marginBottom: 40 }}>
                    <h2 style={S.sectionHead}>{cat.categoryName}</h2>
                    <div style={S.grid}>
                      {items.map(item => <ItemCard key={item.itemId} item={item} cart={cart} onAdd={add} onDec={dec} />)}
                    </div>
                  </section>
                );
              })}
            </>
          ) : (
            <div style={S.grid}>
              {visible.map(item => <ItemCard key={item.itemId} item={item} cart={cart} onAdd={add} onDec={dec} />)}
            </div>
          )
        )}
      </main>

      {/* FLOATING CART BAR */}
      {count > 0 && !cartOpen && (
        <div style={S.floatBar} onClick={() => setCartOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={S.floatBadge}>{count}</span>
            <span style={{ fontWeight: 700 }}>View Order</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
            {fmt(total)} <ChevronUp size={16} />
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={S.overlay} />
          <div style={S.drawer}>
            <div style={S.drawerHead}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>Your Order</h2>
                {tableNumber && <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>Table {tableNumber}</p>}
              </div>
              <button onClick={() => setCartOpen(false)} style={S.closeBtn}><X size={18} /></button>
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '12px 20px' }}>
              {cart.length === 0
                ? <p style={{ textAlign: 'center', color: '#bbb', padding: '40px 0' }}>Your cart is empty.</p>
                : cart.map(c => (
                    <div key={c.menuItemId} style={S.cartRow}>
                      {c.img && <img src={c.img} alt={c.foodName} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flexGrow: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>{c.foodName}</p>
                        <p style={{ margin: '2px 0 0', color: '#b8860b', fontWeight: 600, fontSize: '0.85rem' }}>{fmt(c.price * c.quantity)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => dec(c.menuItemId)} style={S.qtyBtn}><Minus size={13} /></button>
                        <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center', fontSize: '1rem' }}>{c.quantity}</span>
                        <button onClick={() => add({ itemId: c.menuItemId, foodName: c.foodName, price: c.price, images: [] } as any)} style={S.qtyBtn}><Plus size={13} /></button>
                        <button onClick={() => remove(c.menuItemId)} style={{ ...S.qtyBtn, color: '#ef4444' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))
              }

              {cart.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="text" placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} style={S.input} />
                  <textarea placeholder="Special instructions…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...S.input, resize: 'none' }} />
                </div>
              )}
              {error && <div style={{ ...S.errBox, marginTop: 12 }}>{error}</div>}
            </div>

            {cart.length > 0 && (
              <div style={S.drawerFoot}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Total</p>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', color: '#1a1a1a' }}>{fmt(total)}</p>
                </div>
                <button onClick={submitCart} disabled={placing} style={{ ...S.goldBtn, opacity: placing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {placing ? 'Sending…' : <><Send size={16} /> {orderId ? 'Add to Order' : 'Place Order'}</>}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{CSS}</style>
    </div>
  );
};

/* ── Item Card Component ─────────────────────────────────────────────────────── */
const ItemCard: React.FC<{ item: MenuItem; cart: { menuItemId: number; quantity: number }[]; onAdd: (i: MenuItem) => void; onDec: (id: number) => void }> = ({ item, cart, onAdd, onDec }) => {
  const qty = cart.find(c => c.menuItemId === item.itemId)?.quantity ?? 0;
  const img = item.images?.find(i => i.isPrimary)?.imageUrl ?? item.images?.[0]?.imageUrl;
  return (
    <div className="item-card" style={S.card}>
      <div style={S.imgWrap}>
        {img
          ? <img src={img} alt={item.foodName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: '#f5f0e8' }}>🍽️</div>
        }
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.isPopular && <span style={S.badgeSeller}>BEST SELLER</span>}
          {item.isNewItem && <span style={S.badgeNew}>NEW</span>}
          {item.isVeg    && <span style={S.badgeVeg}>● VEG</span>}
        </div>
      </div>
      <div style={S.cardBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.foodName}</h3>
          <span style={{ fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', fontSize: '1rem' }}>{fmt(item.price)}</span>
        </div>
        {(item.weight || item.description) && (
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#999', lineHeight: 1.4 }}>
            {item.weight || item.description}
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          {qty === 0
            ? <button onClick={() => onAdd(item)} className="add-btn" style={S.addBtn}>ADD TO ORDER</button>
            : (
              <div style={S.qtyRow}>
                <button onClick={() => onDec(item.itemId)} style={S.qtyBtnGold}><Minus size={14} /></button>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: 28, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => onAdd(item)} style={S.qtyBtnGold}><Plus size={14} /></button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
};

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  lightPage:   { minHeight: '100vh', background: '#f5f0e8', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#1a1a1a' },
  header:      { position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e8e0d0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  searchBox:   { display: 'flex', alignItems: 'center', gap: 8, background: '#f5f0e8', borderRadius: 999, padding: '8px 16px', minWidth: 200, maxWidth: 340, flex: 1 },
  cartBtn:     { position: 'relative', background: 'none', border: '1px solid #d0c8b8', borderRadius: 999, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1a1a1a' },
  cartBadge:   { position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 999, width: 18, height: 18, fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  catBar:      { display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e8e0d0', scrollbarWidth: 'none', position: 'sticky', top: 65, zIndex: 40 },
  catTab:      { flexShrink: 0, padding: '7px 20px', borderRadius: 999, border: '1px solid #d0c8b8', background: 'transparent', color: '#666', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' },
  catTabActive:{ background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' },
  sectionHead: { fontSize: '1.3rem', fontWeight: 900, color: '#1a1a1a', margin: '0 0 16px', paddingBottom: 10, borderBottom: '2px solid #e8e0d0' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 },
  card:        { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s,box-shadow 0.2s' },
  imgWrap:     { height: 200, position: 'relative', flexShrink: 0, overflow: 'hidden', background: '#f5f0e8' },
  cardBody:    { padding: '14px 16px 16px', flexGrow: 1, display: 'flex', flexDirection: 'column' },
  badgeSeller: { background: '#1a1a1a', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.05em', display: 'inline-block' },
  badgeNew:    { background: '#f59e0b', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.05em', display: 'inline-block' },
  badgeVeg:    { background: '#16a34a', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px', borderRadius: 999, display: 'inline-block' },
  addBtn:      { width: '100%', padding: '11px', borderRadius: 999, background: 'linear-gradient(135deg,#c8a96e,#a67c4e)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', letterSpacing: '0.08em', transition: 'opacity 0.15s' },
  qtyRow:      { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  qtyBtn:      { background: '#f0ece4', border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', transition: 'background 0.15s' },
  qtyBtnGold:  { background: 'linear-gradient(135deg,#c8a96e,#a67c4e)', border: 'none', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  floatBar:    { position: 'fixed', bottom: 20, left: 16, right: 16, maxWidth: 500, margin: '0 auto', background: '#1a1a1a', borderRadius: 16, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', zIndex: 60, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', color: '#fff', fontWeight: 700 },
  floatBadge:  { background: 'rgba(255,255,255,0.2)', borderRadius: 999, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(3px)' },
  drawer:      { position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '88vh', zIndex: 80, background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' },
  drawerHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: '1px solid #f0ece4' },
  closeBtn:    { background: '#f5f0e8', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' },
  cartRow:     { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f0e8' },
  input:       { background: '#f5f0e8', border: '1px solid #e0d8c8', borderRadius: 12, padding: '11px 14px', color: '#1a1a1a', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' as any },
  drawerFoot:  { padding: '16px 20px', borderTop: '1px solid #f0ece4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#fff' },
  goldBtn:     { background: 'linear-gradient(135deg,#c8a96e,#a67c4e)', border: 'none', borderRadius: 999, padding: '13px 28px', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.05em' },
  errBox:      { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', color: '#dc2626', fontSize: '0.85rem' },
  spinner:     { width: 32, height: 32, border: '3px solid #e8e0d0', borderTop: '3px solid #a67c4e', borderRadius: '50%', animation: 'spin 0.75s linear infinite' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .item-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; }
  .add-btn:hover { opacity: 0.85; }
`;

export default CustomerMenu;
