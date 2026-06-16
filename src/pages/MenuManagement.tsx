import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Compass, Layers, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { Category, MenuItem } from '../types';
import { Modal } from '../components/Modal';

export const MenuManagement: React.FC = () => {
  const [role] = useState(() => localStorage.getItem('role') || 'Staff');
  const isOwner = role === 'Owner';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // New Category Field
  const [newCategoryName, setNewCategoryName] = useState('');

  // New MenuItem Fields
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Fetch all categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.menu.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
        if (res.data.length > 0 && selectedCategoryId === null) {
          setSelectedCategoryId(res.data[0].categoryId);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch menu categories.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch items for selected category
  const loadMenuItems = async (catId: number) => {
    try {
      setItemsLoading(true);
      setError('');
      const res = await api.menu.getItems(catId);
      if (res.success && res.data) {
        setMenuItems(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch menu items.');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId !== null) {
      loadMenuItems(selectedCategoryId);
    } else {
      setMenuItems([]);
    }
  }, [selectedCategoryId]);

  // Handle category creation
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError('');

    try {
      await api.menu.addCategory({
        categoryName: newCategoryName,
        isActive: true
      });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed to add category.');
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category? All its items will be removed.')) return;
    setError('');

    try {
      await api.menu.deleteCategory(id);
      setSelectedCategoryId(null);
      loadCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category.');
    }
  };

  // Handle Image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // Handle item creation + optional image upload
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !price || selectedCategoryId === null) return;
    setError('');
    setLoading(true);

    try {
      // 1. Create the item
      const itemDto = {
        itemId: 0,
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

      const res = await api.menu.addMenuItem(itemDto);

      // 2. Upload image if selected
      if (res.success && res.menuItemId && selectedFile) {
        const formData = new FormData();
        formData.append('Images', selectedFile);
        formData.append('MenuItemId', res.menuItemId.toString());
        formData.append('IsPrimary', 'true');

        await api.images.upload(formData);
      }

      // Reset Form fields
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
      setSelectedFile(null);
      setFilePreview(null);
      
      setIsItemModalOpen(false);
      loadMenuItems(selectedCategoryId);
    } catch (err: any) {
      setError(err?.message || 'Failed to add menu item.');
    } finally {
      setLoading(false);
    }
  };

  // Handle item deletion
  const handleDeleteMenuItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    setError('');

    try {
      await api.menu.deleteMenuItem(itemId);
      if (selectedCategoryId !== null) {
        loadMenuItems(selectedCategoryId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete menu item.');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {error && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of categories sidebar & items */}
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
                  onClick={() => setIsCategoryModalOpen(true)}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <div className="spinner" style={{ color: 'var(--primary)' }} />
              </div>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.categoryId);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
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
                  <button className="btn btn-primary" onClick={() => setIsItemModalOpen(true)}>
                    <Plus size={18} />
                    <span>Add New Dish</span>
                  </button>
                )}
              </div>

              {/* Items Grid */}
              {itemsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <div className="spinner" style={{ width: '30px', height: '30px', color: 'var(--primary)' }} />
                </div>
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
                            <img 
                              src={primaryImage} 
                              alt={item.foodName} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
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
                              <button 
                                onClick={() => handleDeleteMenuItem(item.itemId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  transition: 'var(--transition-fast)'
                                }}
                                className="btn-secondary"
                              >
                                <Trash2 size={16} />
                              </button>
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

      {/* Category Creation Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Menu Category"
      >
        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Starters, Main Course, Drinks"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Category
            </button>
          </div>
        </form>
      </Modal>

      {/* MenuItem Creation Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="Add New Dish"
        size="lg"
      >
        <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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

          {/* Image Upload Area */}
          <div className="form-group">
            <label className="form-label">Dish Image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                style={{ 
                  flexGrow: 1, 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '20px', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
                <ImageIcon size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Click or drag image file here
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  PNG, JPG, or WEBP up to 5MB
                </p>
              </div>

              {filePreview && (
                <div style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <img src={filePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Create Dish'}
            </button>
          </div>

        </form>
      </Modal>

    </div>
  );
};
