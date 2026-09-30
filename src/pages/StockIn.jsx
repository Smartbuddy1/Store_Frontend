import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, Hash, Tag, Layers, ArrowUpDown, Save, X, FileText, FileSpreadsheet, Edit, Trash2, Eye, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';
const StockIn = () => {
  const [stockEntries, setStockEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [viewingItem, setViewingItem] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const [staffList, setStaffList] = useState([]);
  const [itemsMaster, setItemsMaster] = useState({});

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [entries, staff, items] = await Promise.all([
        api.stockIn.getAll(),
        api.staff.getAll(),
        api.items.getAll()
      ]);
      
      const itemMap = {};
      items.forEach(item => {
        itemMap[item.itemCode] = {
          name: item.itemName,
          category: item.categoryName,
          unit: item.unit
        };
      });
      setItemsMaster(itemMap);

      const mappedEntries = entries.map(entry => ({
        id: entry.id,
        date: new Date(entry.date).toISOString().split('T')[0],
        time: entry.time,
        itemCode: entry.itemCode,
        itemName: entry.itemName,
        category: entry.category,
        quantity: entry.quantity,
        source: entry.source,
        unit: itemMap[entry.itemCode]?.unit || 'Nos'
      }));
      setStockEntries(mappedEntries);
      setStaffList(staff);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form State
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newSource, setNewSource] = useState('Supplier');
  const [editingId, setEditingId] = useState(null);

  // Auto-fill logic when Item Code changes
  const handleItemCodeChange = (e) => {
    const code = e.target.value.toUpperCase();
    setNewItemCode(code);
    
    // Auto-populate item name and category if code exists in master data
    if (itemsMaster[code]) {
      setNewItemName(itemsMaster[code].name);
      setNewCategory(itemsMaster[code].category);
    } else {
      setNewItemName('');
      setNewCategory('');
    }
  };

  const handleSaveStock = async () => {
    if (!newDate || !newItemCode || !newItemName || !newCategory || !newQuantity || !newSource) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }

    try {
      if (editingId) {
        await api.stockIn.update(editingId, {
          date: newDate,
          time: newTime,
          item_code: newItemCode,
          item_name: newItemName,
          category: newCategory,
          quantity: parseInt(newQuantity, 10),
          source: newSource
        });
      } else {
        await api.stockIn.create({
          date: newDate,
          time: newTime,
          item_code: newItemCode,
          item_name: newItemName,
          category: newCategory,
          quantity: parseInt(newQuantity, 10),
          source: newSource
        });
        setCurrentPage(1);
      }
      
      await fetchData();
      
      // Reset form fields
      setEditingId(null);
      setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setNewItemCode('');
      setNewItemName('');
      setNewCategory('');
      setNewQuantity('');
      setNewSource('Supplier');
      setIsModalOpen(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  const handleEditStock = (entry) => {
    setEditingId(entry.id);
    setNewDate(entry.date);
    setNewTime(entry.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setNewItemCode(entry.itemCode);
    setNewItemName(entry.itemName);
    setNewCategory(entry.category);
    setNewQuantity(entry.quantity.toString());
    setNewSource(entry.source);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStock = async (id) => {
    if (window.confirm("Are you sure you want to delete this stock entry?")) {
      try {
        await api.stockIn.delete(id);
        await fetchData();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setNewItemCode('');
    setNewItemName('');
    setNewCategory('');
    setNewQuantity('');
    setNewSource('Supplier');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  // Make sure we have filtered entries for export
  const filteredEntriesForExport = stockEntries.filter(entry => {
    const matchesSearch = (entry.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (entry.itemCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || entry.category === selectedCategory;
    const matchesSource = selectedSource === '' || entry.source === selectedSource;
    return matchesSearch && matchesCategory && matchesSource;
  });

  const handleExportPDF = async () => {
    const tableColumn = ["DATE", "ITEM CODE", "ITEM NAME", "CATEGORY", "SOURCE", "QUANTITY"];
    const tableRows = [];
    filteredEntriesForExport.forEach(item => {
      tableRows.push([item.date, item.itemCode, item.itemName, item.category, item.source, item.quantity]);
    });
    await exportToPDF("Stock In Report", tableColumn, tableRows, "stock_in.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredEntriesForExport.map(item => ({
      "DATE": item.date,
      "ITEM CODE": item.itemCode,
      "ITEM NAME": item.itemName,
      "CATEGORY": item.category,
      "SOURCE": item.source,
      "QUANTITY": item.quantity
    }));
    exportToExcel(data, "StockIn", "stock_in.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Stock In')}</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Record incoming inventory')}</p>
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
          <Plus size={20} color='#10b981' />
          {editingId ? t('Edit Stock In') : t('Record Stock In')}
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Date')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Time')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Code')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <Hash size={18} color='var(--text-secondary)' />
              <input type="text" list="stockin-item-codes" placeholder="e.g. E-001" value={newItemCode} onChange={handleItemCodeChange} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
              <datalist id="stockin-item-codes">
                {Object.keys(itemsMaster).map(code => (
                  <option key={code} value={code}>{itemsMaster[code].name}</option>
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name (Auto)')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--slate-100)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <Tag size={18} color='var(--slate-400)' />
              <input type="text" placeholder="Auto-populated" value={newItemName} readOnly style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--slate-600)', fontWeight: '600' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Received From')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <select value={newSource} onChange={(e) => setNewSource(e.target.value)} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
                {staffList.filter(p => p.type !== 'Helper').map((person, idx) => (
                  <option key={idx} value={person.name}>{person.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Quantity Added')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <Layers size={18} color='var(--text-secondary)' />
              <input type="number" min="1" placeholder="Qty" value={newQuantity} onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) > 0) setNewQuantity(val);
              }} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '1rem' }}>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
              setNewItemCode('');
              setNewItemName('');
              setNewCategory('');
              setNewQuantity('');
              setNewSource('Supplier');
            }}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
              color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
            }}
          >
            {t('Cancel')}
          </button>
          <button 
            onClick={handleSaveStock}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981',
              color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Save size={18} />
            {editingId ? t('Save Changes') : t('Add Stock In')}
          </button>
        </div>
      </div>
    </div>



      {/* Filters Section */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by Item Name or Code..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
        >
          <option value="">All Categories</option>
          {[...new Set(stockEntries.map(e => e.category))].filter(Boolean).sort().map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          value={selectedSource}
          onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
        >
          <option value="">All Sources</option>
          {[...new Set([
            ...stockEntries.map(e => e.source),
            ...staffList.filter(s => s.type !== 'Helper').map(s => s.name)
          ])].filter(src => src && !staffList.filter(s => s.type === 'Helper').map(s => s.name).includes(src)).sort().map((src, idx) => (
            <option key={idx} value={src}>{src}</option>
          ))}
        </select>
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: 'var(--surface-bg)', border: 'none' }}>
        {/* Pagination logic */}
        {(() => {
          const filteredEntries = stockEntries.filter(entry => {
            const matchesSearch = ((entry.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (entry.itemCode || '').toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === '' || entry.category === selectedCategory;
            const matchesSource = selectedSource === '' || entry.source === selectedSource;
            return matchesSearch && matchesCategory && matchesSource;
          });

          const recordsPerPage = 50;
          const totalPages = Math.ceil(filteredEntries.length / recordsPerPage);
          const indexOfFirst = (currentPage - 1) * recordsPerPage;
          const indexOfLast = indexOfFirst + recordsPerPage;
          const currentRecords = filteredEntries.slice(indexOfFirst, indexOfLast);
          return (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('DATE')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('TIME')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM CODE')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM NAME (AUTO)')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('CATEGORY (AUTO)')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('UNIT')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('RECEIVED FROM')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>{t('QUANTITY ADDED')}</div>
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>
                {t('ACTION')}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{entry.date}</td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{entry.time || 'N/A'}</td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '0.95rem' }}>{entry.itemCode}</td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      backgroundColor: 'var(--slate-200)', color: 'var(--slate-700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '0.8rem'
                    }}>{entry.itemName ? entry.itemName.charAt(0) : '?'}</div>
                    <span style={{ color: 'var(--slate-700)', fontWeight: '600', fontSize: '0.95rem' }}>{entry.itemName}</span>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  <span style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-600)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {entry.category}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                  {entry.unit}
                </td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {entry.source}
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                  <span style={{ 
                    backgroundColor: '#dcfce7', color: '#166534', 
                    padding: '0.35rem 0.75rem', borderRadius: '20px', 
                    fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap'
                  }}>
                    + {entry.quantity}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={() => setViewingItem(entry)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Eye size={16} /></button>
                    <button onClick={() => handleEditStock(entry)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-600)' }}><Edit size={16} /></button>
                    <button onClick={() => handleDeleteStock(entry.id)} style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface-bg)' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                  No stock entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination UI */}
        <div style={{ padding: '1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          <span>Showing {filteredEntries.length > 0 ? indexOfFirst + 1 : 0} to {Math.min(indexOfLast, filteredEntries.length)} of {filteredEntries.length} entries</span>
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
      </>
    );
  })()}
  </div>



      {/* View Stock In Modal */}
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Stock In Details')}</h2>
              <button 
                onClick={() => setViewingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Date:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.date}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Code:</span>
                <span style={{ color: 'var(--slate-900)', fontWeight: 'bold' }}>{viewingItem.itemCode}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Name:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.itemName}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Category:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.category}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Unit:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.unit}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Received From:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.source}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Quantity Added:</span>
                <span style={{ color: '#166534', fontWeight: 'bold' }}>+ {viewingItem.quantity}</span>
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

export default StockIn;
