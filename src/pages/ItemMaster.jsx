import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, Edit, Trash2, X, FileText, FileSpreadsheet, Eye, Download, Camera, Image } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ItemMaster = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;

  // Modal Form State
  const [editingId, setEditingId] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newUnit, setNewUnit] = useState('Nos');
  const [newMinStock, setNewMinStock] = useState('');
  const [newItemPhotos, setNewItemPhotos] = useState([]);
  const [photoSlideIndex, setPhotoSlideIndex] = useState(0);
  const [showPhotoDropdown, setShowPhotoDropdown] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const formRef = useRef(null);

  // Fetch items and categories from API
  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.items.getAllPaginated({
        page: currentPage,
        limit: recordsPerPage,
        search: searchQuery,
        category: selectedCategory
      });
      const mapped = data.records.map(item => {
        let photos = [];
        if (item.photoUrl) {
          if (item.photoUrl.startsWith('[')) {
            try { photos = JSON.parse(item.photoUrl); } catch (e) { photos = [item.photoUrl]; }
          } else {
            photos = [item.photoUrl];
          }
        }
        return {
          id: item.id,
          code: item.itemCode,
          name: item.itemName,
          category: item.categoryName,
          minStock: item.minimumStock,
          unit: item.unit,
          photos: photos
        };
      });
      setItems(mapped);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalRecords(data.pagination.total || 0);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add debounce for search query
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    api.categories.getAll().then(data => setCategories(data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.openAddModal) {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  // Use categories from API for dropdown instead of mapping current page items
  const uniqueCategories = categories.map(c => c.name).filter(c => c !== 'N/A').sort();

  // For rendering, currentRecords is just the items array (since it's already paginated from server)
  const currentRecords = items;

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.items.delete(id);
        await fetchItems();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };


  const openPhotoView = (item) => {
    setViewingPhoto(item);
    setPhotoSlideIndex(0);
  };

  const handleEditItem = (item) => {
    setEditingId(item.id);
    setNewItemName(item.name);
    setNewItemCategory(item.category);
    setNewUnit(item.unit);
    setNewMinStock(item.minStock.toString());
    setNewItemPhotos(item.photos || []);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExportPDF = async () => {
    try {
      // Fetch all matching data without pagination for export
      const allData = await api.items.getAll({ search: searchQuery, category: selectedCategory });
      const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "UNIT", "MIN STOCK"];
      const tableRows = [];
      allData.forEach(item => {
        tableRows.push([item.itemCode, item.itemName, item.categoryName, item.unit, item.minimumStock]);
      });
      await exportToPDF("Item Master Report", tableColumn, tableRows, "item_master.pdf");
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const allData = await api.items.getAll({ search: searchQuery, category: selectedCategory });
      const data = allData.map(item => ({
        "ITEM CODE": item.itemCode,
        "ITEM NAME": item.itemName,
        "CATEGORY": item.categoryName,
        "UNIT": item.unit,
        "MIN STOCK": item.minimumStock
      }));
      exportToExcel(data, "ItemMaster", "item_master.xlsx");
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setNewItemName('');
    setNewItemCategory('');
    setNewUnit('Nos');
    setNewMinStock('');
    setNewItemPhotos([]);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveItem = async () => {
    if (!newItemName?.trim() || !newItemCategory || !newUnit || newMinStock === '' || newMinStock === null || newMinStock === undefined) {
      alert(t(`Please fill all mandatory fields. (Missing: ${!newItemName?.trim() ? 'Name ' : ''}${!newItemCategory ? 'Category ' : ''}${!newUnit ? 'Unit ' : ''}${newMinStock === '' || newMinStock == null ? 'MinStock' : ''})`));
      return;
    }
    try {
      if (editingId) {
        await api.items.update(editingId, {
          item_name: newItemName,
          category: newItemCategory,
          unit: newUnit,
          minimum_stock: parseInt(newMinStock),
          photo_url: newItemPhotos.length > 0 ? JSON.stringify(newItemPhotos) : null
        });
      } else {
        await api.items.create({
          item_name: newItemName,
          category: newItemCategory,
          unit: newUnit || 'Nos',
          minimum_stock: parseInt(newMinStock) || 5,
          photo_url: newItemPhotos.length > 0 ? JSON.stringify(newItemPhotos) : null
        });
      }
      await fetchItems();
      setEditingId(null);
      setNewItemName('');
      setNewItemCategory('');
      setNewUnit('Nos');
      setNewMinStock('');
      setNewItemPhotos([]);
      toast.success('Saved successfully!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    setShowPhotoDropdown(false); // Close dropdown on select
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(t('Image size should be less than 5MB'));
        return;
      }
      if (newItemPhotos.length >= 4) {
        toast.error(t('Maximum 4 photos allowed'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    setNewItemPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Item Master')}</h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Manage all store items')}</p>
          </div>
        </div>
      </div>

      {/* Inline Form Section (Add New) */}
      <div ref={formRef} style={{
        backgroundColor: 'var(--surface-bg)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} color='var(--primary-color)' />
          {t('Add New Item')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name')}</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. CWX-VALVE- 1 inch"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Select Category')}</label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)'
              }}
            >
              <option value="">-- Select a Category --</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat.name}>{cat.name} ({cat.prefix})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Unit')}</label>
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)'
              }}
            >
              <option value="Nos">Nos</option>
              <option value="Kgs">Kgs</option>
              <option value="Ltr">Ltr</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Minimum Stock Alert Level')}</label>
            <input
              type="number"
              min="0"
              value={newMinStock}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) setNewMinStock(val);
              }}
              placeholder="e.g. 5"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 4' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Photo')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

              <div style={{ position: 'relative' }}>
                {newItemPhotos.length < 4 && (
                  <button
                    onClick={() => setShowPhotoDropdown(!showPhotoDropdown)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--slate-700)', fontWeight: '500' }}
                  >
                    <Image size={18} color="var(--primary-color)" /> {t('Upload Photo')} ({newItemPhotos.length}/4)
                  </button>
                )}
                {showPhotoDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                      <Camera size={16} color="var(--slate-600)" /> {t('Camera')}
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
                      <Image size={16} color="var(--slate-600)" /> {t('Gallery')}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              {newItemPhotos.length > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  {newItemPhotos.map((photo, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                      <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', padding: '2px 4px', fontSize: '0.6rem', cursor: 'pointer' }}>X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              onClick={() => {
                setNewItemName('');
                setNewItemCategory('');
                setNewUnit('Nos');
                setNewMinStock('');
                setNewItemPhotos([]);
              }}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSaveItem}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)',
                color: '#ffffff', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {t('Save')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form Section (Edit Only) */}
      {isModalOpen && editingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-bg)',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '650px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
              <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={22} color='var(--primary-color)' />
              {t('Edit Item')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name')}</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. CWX-VALVE- 1 inch"
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Select Category')}</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)'
                  }}
                >
                  <option value="">-- Select a Category --</option>
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat.name}>{cat.name} ({cat.prefix})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Unit')}</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)'
                  }}
                >
                  <option value="Nos">Nos</option>
                  <option value="Kgs">Kgs</option>
                  <option value="Ltr">Ltr</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Minimum Stock Alert Level')}</label>
                <input
                  type="number"
                  min="0"
                  step={['nos', 'ml', 'gms', 'pcs', 'box', 'set', 'pairs'].includes((newUnit || '').toLowerCase()) ? "1" : "0.01"}
                  value={newMinStock}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) setNewMinStock(val);
                  }}
                  placeholder="e.g. 5"
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Photo')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowPhotoDropdown(!showPhotoDropdown)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--slate-700)', fontWeight: '500' }}
                    >
                      <Image size={18} color="var(--primary-color)" /> {newItemPhoto ? t('Change Photo') : t('Upload Photo')}
                    </button>
                    {showPhotoDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                          <Camera size={16} color="var(--slate-600)" /> {t('Camera')}
                          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
                          <Image size={16} color="var(--slate-600)" /> {t('Gallery')}
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {newItemPhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {newItemPhotos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', padding: '2px 4px', fontSize: '0.6rem', cursor: 'pointer' }}>X</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => {
                  setEditingId(null);
                  setNewItemName('');
                  setNewItemCategory('');
                  setNewUnit('Nos');
                  setNewMinStock('');
                  setNewItemPhotos([]);
                  setIsModalOpen(false);
                }}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                  color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleSaveItem}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)',
                  color: '#ffffff', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {t('Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
          <Download size={18} /> PDF
        </button>
        <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
          <FileSpreadsheet size={18} /> Excel
        </button>
      </div>

      {/* Search and Filter Section (Above Table) */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              outline: 'none',
              width: '100%',
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            outline: 'none',
            backgroundColor: 'var(--surface-bg)',
            color: 'var(--text-primary)',
            minWidth: '200px',
            cursor: 'pointer'
          }}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table Section */}
      <div style={{
        backgroundColor: 'var(--surface-bg)',
        border: 'none',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM CODE')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM NAME')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('CATEGORY')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>{t('UNIT')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>{t('MIN STOCK')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>{t('ACTION')}</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{item.code}</td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {item.photos && item.photos.length > 0 ? (
                      <div style={{ position: 'relative', display: 'inline-block' }} onClick={() => openPhotoView(item)}>
                        <img
                          src={item.photos[0]}
                          alt={item.name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: 'var(--slate-200)', color: 'var(--slate-700)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.9rem'
                      }}>{item.name.charAt(0)}</div>
                    )}
                    <span style={{ color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '0.95rem' }}>{item.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 'bold' }}>{item.category.toUpperCase()}</td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.9rem' }}>{item.unit}</td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-900)', fontWeight: '600', fontSize: '0.95rem' }}>{item.minStock}</td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={() => setViewingItem(item)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Eye size={16} /></button>
                    <button onClick={() => handleEditItem(item)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-600)' }}><Edit size={16} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface-bg)' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          <span>Showing {items.length} of {totalRecords} entries</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: currentPage === 1 ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: 'var(--slate-900)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: (currentPage === totalPages || totalPages === 0) ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
              Next
            </button>
          </div>
        </div>
      </div>


      {/* View Item Modal */}
      {viewingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-bg)', borderRadius: '16px', width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Item Details')}</h2>
              <button
                onClick={() => setViewingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Code:</span>
                <span style={{ color: 'var(--slate-900)', fontWeight: 'bold' }}>{viewingItem.code}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Name:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Category:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.category}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Unit:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.unit}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Min Stock:</span>
                <span style={{ color: 'var(--slate-900)', fontWeight: 'bold' }}>{viewingItem.minStock}</span>
              </div>
              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Photos:</span>
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {viewingItem.photos.map((photo, idx) => (
                      <div key={idx} onClick={() => { setPhotoSlideIndex(idx); openPhotoView(viewingItem); }} style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }}>
                        <img src={photo} alt={`${viewingItem.name} ${idx + 1}`} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--slate-50)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={() => setViewingItem(null)}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'var(--surface-bg)',
                  color: 'var(--slate-600)', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Viewing Photo Modal (Slideshow) */}
      {viewingPhoto && viewingPhoto.photos && viewingPhoto.photos.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => setViewingPhoto(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, fontSize: '1.2rem' }}
            >
              ×
            </button>
            <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--surface-bg)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
              <img src={viewingPhoto.photos[photoSlideIndex]} alt={viewingPhoto.name} style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#f1f5f9' }} />

              {viewingPhoto.photos.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(prev => prev === 0 ? viewingPhoto.photos.length - 1 : prev - 1); }} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <button onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(prev => prev === viewingPhoto.photos.length - 1 ? 0 : prev + 1); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                </>
              )}
            </div>

            <div style={{ marginTop: '1rem', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
              {viewingPhoto.name}
            </div>
            {viewingPhoto.photos.length > 1 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                {viewingPhoto.photos.map((_, idx) => (
                  <div key={idx} onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(idx); }} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: idx === photoSlideIndex ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'background-color 0.2s' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ItemMaster;
