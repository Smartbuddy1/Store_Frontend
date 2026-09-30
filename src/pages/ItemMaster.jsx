import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, Edit, Trash2, X, FileText, FileSpreadsheet, Eye, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const ItemMaster = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Modal Form State
  const [editingId, setEditingId] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newMinStock, setNewMinStock] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  // Fetch items and categories from API
  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.items.getAll();
      const mapped = data.map(item => ({
        id: item.id,
        code: item.itemCode,
        name: item.itemName,
        category: item.categoryName,
        minStock: item.minimumStock,
        unit: item.unit
      }));
      setItems(mapped);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    api.categories.getAll().then(data => setCategories(data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  const uniqueCategories = [...new Set(items.map(item => item.category))].filter(c => c !== 'N/A').sort();

  const recordsPerPage = 50;
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const totalPages = Math.ceil(filteredItems.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredItems.slice(indexOfFirstRecord, indexOfLastRecord);

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

  const handleEditItem = (item) => {
    setEditingId(item.id);
    setNewItemName(item.name);
    setNewItemCategory(item.category);
    setNewUnit(item.unit);
    setNewMinStock(item.minStock.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' }); // scroll up to see the form
  };

  const handleExportPDF = async () => {
    const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "UNIT", "MIN STOCK"];
    const tableRows = [];
    filteredItems.forEach(item => {
      tableRows.push([item.code, item.name, item.category, item.unit, item.minStock]);
    });
    await exportToPDF("Item Master Report", tableColumn, tableRows, "item_master.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredItems.map(item => ({
      "ITEM CODE": item.code,
      "ITEM NAME": item.name,
      "CATEGORY": item.category,
      "UNIT": item.unit,
      "MIN STOCK": item.minStock
    }));
    exportToExcel(data, "ItemMaster", "item_master.xlsx");
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setNewItemName('');
    setNewItemCategory('');
    setNewUnit('');
    setNewMinStock('');
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!newItemName || !newItemCategory || !newUnit || !newMinStock) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      if (editingId) {
        await api.items.update(editingId, {
          item_name: newItemName,
          category: newItemCategory,
          unit: newUnit,
          minimum_stock: parseInt(newMinStock)
        });
      } else {
        const catPrefix = categories.find(c => c.name === newItemCategory)?.prefix || 'X';
        const catItems = items.filter(i => i.category === newItemCategory);
        const maxNum = catItems.reduce((max, item) => {
          const num = parseInt(item.code.split('-')[1]) || 0;
          return num > max ? num : max;
        }, 0);
        const newCode = `${catPrefix}-${String(maxNum + 1).padStart(3, '0')}`;
        await api.items.create({
          item_code: newCode,
          item_name: newItemName,
          category: newItemCategory,
          unit: newUnit || 'Nos',
          minimum_stock: parseInt(newMinStock) || 5
        });
      }
      await fetchItems();
      setEditingId(null);
      setNewItemName('');
      setNewItemCategory('');
      setNewUnit('');
      setNewMinStock('');
      setIsModalOpen(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <Download size={18} /> PDF
          </button>
            <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
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
      </div>

      {/* Inline Form Section */}
      <div style={{
        backgroundColor: 'var(--surface-bg)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} color='var(--primary-color)' />
          {editingId ? t('Edit Item') : t('Add New Item')}
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
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
            <input 
              type="text" 
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="e.g. Nos, Kgs, Ltrs"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            />
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
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewItemName('');
              setNewItemCategory('');
              setNewUnit('');
              setNewMinStock('');
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
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      backgroundColor: 'var(--slate-200)', color: 'var(--slate-700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '0.9rem'
                    }}>{item.name.charAt(0)}</div>
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
          <span>Showing {filteredItems.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredItems.length)} of {filteredItems.length} entries</span>
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Item Details')}</h2>
              <button 
                onClick={() => setViewingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--slate-50)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
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

    </div>
  );
};

export default ItemMaster;
