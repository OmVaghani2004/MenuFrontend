import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Compass, Layers, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { Category, MenuItem } from '../types';
import { Modal } from '../components/Modal';

export const MenuManagement: React.FC = () => {
  const [role] = useState(() => localStorage.getItem('role') || 'Staff');
  const isOwner = role === 'Owner';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // Holds ALL items fetched via categoryId=0 — filtered locally on category switch
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Category modal state ──────────────────────────────────────────────────
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  /** null = adding new; Category object = editing existing */
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // ── Item modal state ──────────────────────────────────────────────────────
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  /** null = adding new; MenuItem object = editing existing */
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Item form fields
  const [foodName, setFoodName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [approxTime, setApproxTime] = useState('');
  const [weight, setWeight] = useState('');
  const [isVeg, setIsVeg] = useState(false);
  const [isDinner, setIsDinner] = useState(false);
  const [soldOut, setSoldOut] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [isChefsChoice, setIsChefsChoice] = useState(false);

  // ── Multi-image state ─────────────────────────────────────────────────────
  /** New files the user picked — will be uploaded on submit */
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  /** Preview URLs for newly selected files */
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  /** Existing images still shown (edit mode) — user can remove individual ones */
  const [existingImages, setExistingImages] = useState<{ imageId: number; imageUrl: string; isPrimary: boolean }[]>([]);
  /** IDs of existing images marked for deletion — applied on submit */
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  /** Tracks which image is designated as primary (existing or new) */
  const [primarySelection, setPrimarySelection] = useState<{ type: 'existing'; id: number } | { type: 'new'; index: number } | null>(null);

  // Derive displayed items from the local cache — no extra API call on tab/category switch
  const menuItems = selectedCategoryId !== null
    ? allMenuItems.filter(item => item.categoryId === selectedCategoryId)
    : [];

  /** Re-fetches only the categories list. Use after a category update. */
  const refreshCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.menu.getCategories();
      if (res.success && res.data) setCategories(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh categories.');
    } finally {
      setLoading(false);
    }
  };

  /** Re-fetches all items (categoryId=0). Use after an item update. */
  const refreshItems = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.menu.getItems(0);
      if (res.success && res.data) setAllMenuItems(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh items.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches both categories and ALL items in parallel.
   * Use on mount, after add, or after delete (both lists may change).
   */
  const refreshData = async (currentSelectedId?: number | null) => {
    try {
      setLoading(true);
      setError('');
      const [catRes, itemRes] = await Promise.all([
        api.menu.getCategories(),
        api.menu.getItems(0),
      ]);

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        const resolvedId = currentSelectedId ?? selectedCategoryId;
        if (resolvedId === null && catRes.data.length > 0) {
          setSelectedCategoryId(catRes.data[0].categoryId);
        }
      }

      if (itemRes.success && itemRes.data) {
        setAllMenuItems(itemRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load menu data.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load when the tab mounts
  useEffect(() => {
    refreshData();
  }, []);

  // ── Helpers to open modals ───────────────────────────────────────────────

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.categoryName);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const openAddItem = () => {
    setEditingItem(null);
    resetItemForm();
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setFoodName(item.foodName);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setApproxTime(item.approxTime || '');
    setWeight(item.weight || '');
    setIsVeg(item.isVeg);
    setIsDinner(item.isDinner);
    setSoldOut(item.soldOut);
    setIsPopular(item.isPopular);
    setIsNewItem(item.isNewItem);
    setIsChefsChoice(item.isChefsChoice);
    // Populate existing images for the gallery editor
    const imgs = item.images.map(img => ({ imageId: img.imageId, imageUrl: img.imageUrl, isPrimary: img.isPrimary }));
    setExistingImages(imgs);
    const primary = imgs.find(img => img.isPrimary);
    if (primary) {
      setPrimarySelection({ type: 'existing', id: primary.imageId });
    } else if (imgs.length > 0) {
      setPrimarySelection({ type: 'existing', id: imgs[0].imageId });
    } else {
      setPrimarySelection(null);
    }
    setImagesToDelete([]);
    setSelectedFiles([]);
    setFilePreviews([]);
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    resetItemForm();
  };

  const resetItemForm = () => {
    setFoodName('');
    setDescription('');
    setPrice('');
    setApproxTime('');
    setWeight('');
    setIsVeg(false);
    setIsDinner(false);
    setSoldOut(false);
    setIsPopular(false);
    setIsNewItem(false);
    setIsChefsChoice(false);
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImages([]);
    setImagesToDelete([]);
    setPrimarySelection(null);
  };

  // ── Category handlers ────────────────────────────────────────────────────

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setError('');

    try {
      if (editingCategory) {
        await api.menu.updateCategory(editingCategory.categoryId, categoryName);
        closeCategoryModal();
        await refreshCategories();      // update → only categories needed
      } else {
        await api.menu.addCategory({ categoryName, isActive: true });
        closeCategoryModal();
        await refreshData();             // add → refresh both
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category? All its items will be removed.')) return;
    setError('');
    try {
      await api.menu.deleteCategory(id);
      setSelectedCategoryId(null);
      await refreshData(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category.');
    }
  };

  // ── Item handlers ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    const startIdx = selectedFiles.length;
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setFilePreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    
    // Auto-select primary if nothing is primary yet
    if (!primarySelection) {
      setPrimarySelection({ type: 'new', index: startIdx });
    }
    e.target.value = '';
  };

  const removeNewFile = (index: number) => {
    const remainingFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(remainingFiles);
    setFilePreviews(prev => prev.filter((_, i) => i !== index));

    if (primarySelection?.type === 'new') {
      if (primarySelection.index === index) {
        if (existingImages.length > 0) {
          setPrimarySelection({ type: 'existing', id: existingImages[0].imageId });
        } else if (remainingFiles.length > 0) {
          setPrimarySelection({ type: 'new', index: 0 });
        } else {
          setPrimarySelection(null);
        }
      } else if (primarySelection.index > index) {
        setPrimarySelection({ type: 'new', index: primarySelection.index - 1 });
      }
    }
  };

  const removeExistingImage = (imageId: number) => {
    const remainingExisting = existingImages.filter(img => img.imageId !== imageId);
    setExistingImages(remainingExisting);
    setImagesToDelete(prev => [...prev, imageId]);

    if (primarySelection?.type === 'existing' && primarySelection.id === imageId) {
      if (remainingExisting.length > 0) {
        setPrimarySelection({ type: 'existing', id: remainingExisting[0].imageId });
      } else if (selectedFiles.length > 0) {
        setPrimarySelection({ type: 'new', index: 0 });
      } else {
        setPrimarySelection(null);
      }
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !price || selectedCategoryId === null) return;
    setError('');
    setLoading(true);

    try {
      const itemDto = {
        itemId: editingItem ? editingItem.itemId : 0,
        categoryId: selectedCategoryId,
        foodName,
        description,
        price: parseFloat(price),
        approxTime: approxTime || null,
        weight: weight || null,
        isVeg,
        isDinner,
        soldOut,
        isPopular,
        isNewItem,
        isChefsChoice,
      };

      let savedItemId: number;

      if (editingItem) {
        const res = await api.menu.updateMenuItem(itemDto);
        savedItemId = res.menuItemId;
      } else {
        const res = await api.menu.addMenuItem(itemDto);
        savedItemId = res.menuItemId;
      }

      // ── Image handling ──────────────────────────────────────────────────
      // 1. Delete images the user removed
      if (imagesToDelete.length > 0) {
        await Promise.all(imagesToDelete.map(id => api.images.delete(id)));
      }

      // 2. Set primary image if existing was chosen and changed
      if (editingItem && primarySelection?.type === 'existing') {
        const originalPrimary = editingItem.images.find(img => img.isPrimary);
        if (originalPrimary?.imageId !== primarySelection.id) {
          await api.images.setPrimary(primarySelection.id);
        }
      }

      // 3. Upload new images (handle primary/secondary splitting)
      if (selectedFiles.length > 0 && savedItemId) {
        if (primarySelection?.type === 'new') {
          const primaryIdx = primarySelection.index;
          const primaryFile = selectedFiles[primaryIdx];
          const secondaryFiles = selectedFiles.filter((_, idx) => idx !== primaryIdx);

          // Upload the primary first
          const formPrimary = new FormData();
          formPrimary.append('Images', primaryFile);
          formPrimary.append('MenuItemId', savedItemId.toString());
          formPrimary.append('IsPrimary', 'true');
          await api.images.upload(formPrimary);

          // Upload the rest as secondary
          if (secondaryFiles.length > 0) {
            const formSecondary = new FormData();
            secondaryFiles.forEach(f => formSecondary.append('Images', f));
            formSecondary.append('MenuItemId', savedItemId.toString());
            formSecondary.append('IsPrimary', 'false');
            await api.images.upload(formSecondary);
          }
        } else {
          // Primary is an existing image, upload all new ones as secondary
          const formData = new FormData();
          selectedFiles.forEach(f => formData.append('Images', f));
          formData.append('MenuItemId', savedItemId.toString());
          formData.append('IsPrimary', 'false');
          await api.images.upload(formData);
        }
      }

      closeItemModal();
      if (editingItem) {
        await refreshItems();           // update → only items needed
      } else {
        await refreshData();             // add → refresh both (item count changes)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save menu item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    setError('');
    try {
      await api.menu.deleteMenuItem(itemId);
      await refreshData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete menu item.');
    }
  };

  // ── Icon button helper ───────────────────────────────────────────────────
  const iconBtn = (onClick: () => void, color: string, children: React.ReactNode) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: 'none', border: 'none', color,
        cursor: 'pointer', padding: '4px', display: 'flex',
        borderRadius: 'var(--radius-sm)', transition: 'var(--transition-fast)'
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {error && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: categories sidebar + items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'start', gridAutoFlow: 'dense' }}>

        {/* Category List Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 1' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} style={{ color: 'var(--primary)' }} />
                <span>Categories</span>
              </h3>
              {isOwner && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                  onClick={openAddCategory}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '20px' }} />
            ) : categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No categories created yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.categoryId;
                  return (
                    <div
                      key={cat.categoryId}
                      onClick={() => setSelectedCategoryId(cat.categoryId)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'var(--primary-glow)' : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--border-color)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <span style={{ fontSize: '0.95rem' }}>{cat.categoryName}</span>
                      {isSelected && isOwner && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {iconBtn(() => openEditCategory(cat), 'var(--primary)', <Pencil size={14} />)}
                          {iconBtn(() => handleDeleteCategory(cat.categoryId), 'var(--danger)', <Trash2 size={14} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Menu Items Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>

          {selectedCategoryId === null ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Compass size={40} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
              <h3>Select a category from the panel to view and manage dishes.</h3>
            </div>
          ) : (
            <>
              {/* Header inside items area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    {categories.find(c => c.categoryId === selectedCategoryId)?.categoryName || 'Dishes'}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'} available
                  </p>
                </div>

                {isOwner && (
                  <button className="btn btn-primary" onClick={openAddItem}>
                    <Plus size={18} />
                    <span>Add New Dish</span>
                  </button>
                )}
              </div>

              {/* Items Grid */}
              {loading ? (
                <div style={{ padding: '60px' }} />
              ) : menuItems.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ImageIcon size={36} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
                  <p>This category is empty. Click "Add New Dish" to insert items.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {menuItems.map((item) => {
                    const primaryImage = item.images.find(img => img.isPrimary)?.imageUrl || item.images[0]?.imageUrl;
                    return (
                      <div key={item.itemId} className="glass-panel glass-panel-interactive" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {/* Food Image */}
                        <div style={{ height: '180px', width: '100%', backgroundColor: 'rgba(255,255,255,0.01)', position: 'relative', borderBottom: '1px solid var(--border-color)' }}>
                          {primaryImage ? (
                            <img src={primaryImage} alt={item.foodName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px', background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.08), transparent)' }}>
                              <ImageIcon size={32} />
                              <span style={{ fontSize: '0.75rem' }}>No image uploaded</span>
                            </div>
                          )}

                          {/* Top badge indicators */}
                          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {item.isVeg && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Veg</span>}
                            {!item.isVeg && <span className="badge badge-warning" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Non-Veg</span>}
                            {item.soldOut && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Sold Out</span>}
                          </div>

                          <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {item.isPopular && <span className="badge badge-info" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--secondary)' }}>Popular</span>}
                            {item.isChefsChoice && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Chef's Choice</span>}
                          </div>
                        </div>

                        {/* Dish Details */}
                        <div style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyItems: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{item.foodName}</h3>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                                ${item.price.toFixed(2)}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description || 'No description provided.'}
                            </p>
                          </div>

                          <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.approxTime && <span>🕒 {item.approxTime}</span>}
                              {item.weight && <span>⚖️ {item.weight}</span>}
                            </div>

                            {isOwner && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => openEditItem(item)}
                                  title="Edit dish"
                                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex', transition: 'var(--transition-fast)' }}
                                  className="btn-secondary"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMenuItem(item.itemId)}
                                  title="Delete dish"
                                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex', transition: 'var(--transition-fast)' }}
                                  className="btn-secondary"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

      </div>

      {/* ── Category Add / Edit Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        title={editingCategory ? `Edit Category` : 'Add Menu Category'}
      >
        <form onSubmit={handleSubmitCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Starters, Main Course, Drinks"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeCategoryModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MenuItem Add / Edit Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        title={editingItem ? `Edit Dish` : 'Add New Dish'}
        size="lg"
      >
        <form onSubmit={handleSubmitItem} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Dish Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Truffle Mushroom Penne"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="e.g. 14.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Brief description of the dish, ingredients, allergens..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Approx Prep Time (e.g. 15 mins)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 15m"
                value={approxTime}
                onChange={(e) => setApproxTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Portion Weight / Size (e.g. 350g)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 300g"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {/* Feature Toggles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
            <label className="form-checkbox">
              <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
              <span>Vegetarian Dish</span>
            </label>
            <label className="form-checkbox">
              <input type="checkbox" checked={isDinner} onChange={(e) => setIsDinner(e.target.checked)} />
              <span>Dinner Menu Item</span>
            </label>
            <label className="form-checkbox">
              <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
              <span>Mark as Popular</span>
            </label>
            <label className="form-checkbox">
              <input type="checkbox" checked={isNewItem} onChange={(e) => setIsNewItem(e.target.checked)} />
              <span>Mark as New</span>
            </label>
            <label className="form-checkbox">
              <input type="checkbox" checked={isChefsChoice} onChange={(e) => setIsChefsChoice(e.target.checked)} />
              <span>Chef's Choice</span>
            </label>
            <label className="form-checkbox">
              <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} />
              <span>Mark Sold Out</span>
            </label>
          </div>

          {/* Image Gallery Editor */}
          <div className="form-group">
            <label className="form-label">
              Dish Images
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                (first image is primary · add multiple)
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>

              {/* Existing images (edit mode) */}
              {existingImages.map(img => {
                const isImgPrimary = primarySelection?.type === 'existing' && primarySelection.id === img.imageId;
                return (
                  <div
                    key={img.imageId}
                    onClick={() => setPrimarySelection({ type: 'existing', id: img.imageId })}
                    style={{ position: 'relative', height: '100px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: isImgPrimary ? '3px solid var(--primary)' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  >
                    <img src={img.imageUrl} alt="dish" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isImgPrimary && (
                      <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--primary)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px' }}>PRIMARY</span>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeExistingImage(img.imageId); }} title="Remove"
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>×</button>
                  </div>
                );
              })}

              {/* Newly selected file previews */}
              {filePreviews.map((src, i) => {
                const isNewImgPrimary = primarySelection?.type === 'new' && primarySelection.index === i;
                return (
                  <div
                    key={`new-${i}`}
                    onClick={() => setPrimarySelection({ type: 'new', index: i })}
                    style={{ position: 'relative', height: '100px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: isNewImgPrimary ? '3px dashed var(--primary)' : '1px dashed var(--border-color)', cursor: 'pointer', opacity: 0.85, transition: 'border-color 0.2s' }}
                  >
                    <img src={src} alt={`new-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isNewImgPrimary && (
                      <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--primary)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px' }}>PRIMARY</span>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeNewFile(i); }} title="Remove"
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>×</button>
                  </div>
                );
              })}

              {/* Add images tile */}
              <label htmlFor="item-image-input"
                style={{ height: '100px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', gap: '6px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'}
              >
                <Plus size={22} />
                <span style={{ fontSize: '0.7rem' }}>Add Images</span>
              </label>
              <input id="item-image-input" type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />

            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>PNG, JPG, or WEBP · max 5 MB each · Click on any image to mark it as the Primary image.</p>
          </div>



          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={closeItemModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : editingItem ? 'Save Changes' : 'Create Dish'}
            </button>
          </div>

        </form>
      </Modal>

    </div>
  );
};
