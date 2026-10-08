import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Search, FileText, FileSpreadsheet, Download, Loader, CheckSquare, Send, Trash2 } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const Requisition = () => {
  const [currentStockData, setCurrentStockData] = useState([]);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab state: 'REGULAR' or 'KIT'
  const [activeTab, setActiveTab] = useState('REGULAR');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // State for checkboxes (Regular Requisition only)
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // State for requested quantities
  const [reqQuantities, setReqQuantities] = useState({});
  
  // State for manually added items
  const [additionalItems, setAdditionalItems] = useState([]);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  
  // State for kit selection
  const [selectedKitId, setSelectedKitId] = useState('');
  const [kitMultiplier, setKitMultiplier] = useState(1);

  // State for histories
  const [regularHistory, setRegularHistory] = useState([]);
  const [kitHistory, setKitHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Pagination state for history (50 per page)
  const HISTORY_PAGE_SIZE = 50;
  const [regularHistoryPage, setRegularHistoryPage] = useState(1);
  const [kitHistoryPage, setKitHistoryPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [stockRes, kitsRes, regReqRes, kitReqRes] = await Promise.all([
          api.currentStock.getAll(),
          api.kits.getAll().catch(() => []), // Fallback in case kits API fails
          api.requisitions.getAll('REGULAR').catch(() => []),
          api.requisitions.getAll('KIT').catch(() => [])
        ]);
        
        const mappedData = stockRes.map(item => ({
          id: item.id,
          code: item.item_code,
          name: item.item_name,
          category: item.category || 'N/A',
          currentQty: item.current_qty || 0,
          minStock: item.minimum_stock || 5
        }));
        setCurrentStockData(mappedData);
        setKits(kitsRes);
        setRegularHistory(regReqRes || []);
        setKitHistory(kitReqRes || []);
      } catch (err) {
        console.error('Failed to fetch requisition data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueCategories = [...new Set(currentStockData.map(item => item.category))].filter(c => c !== 'N/A').sort();

  const filteredData = currentStockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const outOfStockItems = filteredData.filter(item => item.currentQty <= 0 && !additionalItems.some(a => a.id === item.id));
  const lowStockItems = filteredData.filter(item => item.currentQty > 0 && item.currentQty <= item.minStock && !additionalItems.some(a => a.id === item.id));
  
  const allRelevantItems = [...outOfStockItems, ...lowStockItems, ...additionalItems];

  const displayItems = selectedStatus === 'OUT OF STOCK' 
    ? outOfStockItems
    : selectedStatus === 'LOW STOCK'
    ? lowStockItems
    : allRelevantItems;

  const sortedDisplayItems = [...displayItems].sort((a, b) => {
    const aSelected = selectedItems.has(a.id);
    const bSelected = selectedItems.has(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;
  const totalPages = Math.ceil(sortedDisplayItems.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const currentRecords = sortedDisplayItems.slice(indexOfFirst, indexOfFirst + recordsPerPage);

  // Search results for adding manual items
  const goodStockItems = currentStockData.filter(item => 
    item.currentQty > item.minStock && 
    !additionalItems.some(a => a.id === item.id)
  );
  
  const searchResults = addSearchTerm.trim() !== '' 
    ? goodStockItems.filter(item => 
        item.name.toLowerCase().includes(addSearchTerm.toLowerCase()) || 
        item.code.toLowerCase().includes(addSearchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleAddAdditionalItem = (item) => {
    setAdditionalItems(prev => {
      if (prev.some(a => a.id === item.id)) return prev;
      return [...prev, item];
    });
    setSelectedItems(prev => new Set([...prev, item.id]));
    setAddSearchTerm('');
  };

  const handleReqQtyChange = (id, val) => {
    setReqQuantities(prev => ({ ...prev, [id]: val }));
    // Auto-select if a quantity is entered
    if (val && Number(val) > 0) {
      setSelectedItems(prev => new Set([...prev, id]));
    }
  };

  const kitReqItems = React.useMemo(() => {
    if (!selectedKitId) return [];
    const kit = kits.find(k => k.id === selectedKitId);
    if (!kit) return [];
    
    return kit.kitItems.map(ki => {
      const stockItem = currentStockData.find(s => s.code === ki.itemCode) || {};
      return {
        id: stockItem.id || ki.itemCode,
        code: ki.itemCode,
        name: stockItem.name || 'Unknown',
        category: stockItem.category || 'N/A',
        currentQty: stockItem.currentQty || 0,
        reqQty: (ki.quantity || 1) * (Number(kitMultiplier) || 1),
        minStock: stockItem.minStock || 5
      };
    });
  }, [selectedKitId, kitMultiplier, kits, currentStockData]);

  const handleCheckboxChange = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (items) => {
    const allSelected = items.every(item => selectedItems.has(item.id));
    const newSelected = new Set(selectedItems);
    if (allSelected) {
      items.forEach(item => newSelected.delete(item.id));
    } else {
      items.forEach(item => newSelected.add(item.id));
    }
    setSelectedItems(newSelected);
  };

  const getExportData = () => {
    if (activeTab === 'KIT') {
      return kitReqItems;
    }
    
    // Regular tab - export selected items
    let items = [];
    if (selectedItems.size > 0) {
      items = currentStockData.filter(item => selectedItems.has(item.id));
    } else {
      items = currentStockData; // export all displayed if none specifically selected
    }
    
    return items.map(item => ({
      ...item,
      reqQty: Number(reqQuantities[item.id]) || 0
    }));
  };

  const saveRequisitionHistory = async (format, itemsToExport) => {
    try {
      const payload = {
        type: activeTab,
        exportFormat: format,
        items: itemsToExport.map(item => ({
          code: item.code,
          name: item.name,
          category: item.category,
          currentQty: Number(item.currentQty) || 0,
          reqQty: Number(item.reqQty) || 0
        }))
      };
      
      if (activeTab === 'KIT') {
        const kit = kits.find(k => k.id === selectedKitId);
        payload.kitName = kit ? kit.kitName : null;
        payload.kitMultiplier = kitMultiplier ? Number(kitMultiplier) : 1;
      }
      
      const newReq = await api.requisitions.create(payload);
      
      if (activeTab === 'REGULAR') {
        setRegularHistory(prev => [newReq, ...prev]);
      } else {
        setKitHistory(prev => [newReq, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save requisition history:', err);
    }
  };

  // Delete requisition history record
  const handleDeleteRequisition = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this requisition record?')) return;
    try {
      await api.requisitions.delete(id);
      if (type === 'REGULAR') {
        setRegularHistory(prev => prev.filter(r => r.id !== id));
      } else {
        setKitHistory(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete requisition:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleExportPDF = async () => {
    const itemsToExport = getExportData();
    if (itemsToExport.length === 0) {
      alert("No items selected or available to export.");
      return;
    }
    
    // Filter out items that have sufficient stock (Order Qty <= 0)
    const validItemsToExport = itemsToExport.filter(item => {
      return Math.max(0, (item.reqQty || 0) - (item.currentQty || 0)) > 0;
    });

    if (validItemsToExport.length === 0) {
      alert(t("All selected items have sufficient stock. Nothing to order."));
      return;
    }
    
    const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "ORDER QTY"];
    const rows = validItemsToExport.map(item => {
      const orderQty = Math.max(0, (item.reqQty || 0) - (item.currentQty || 0));
      return [
        item.code, 
        item.name, 
        item.category, 
        orderQty
      ];
    });
    
    await exportToPDF("Material Requisition Request", tableColumn, rows, "requisition.pdf");
    await saveRequisitionHistory('PDF', validItemsToExport);
  };

  const handleExportExcel = () => {
    const itemsToExport = getExportData();
    if (itemsToExport.length === 0) {
      alert("No items selected or available to export.");
      return;
    }

    // Filter out items that have sufficient stock (Order Qty <= 0)
    const validItemsToExport = itemsToExport.filter(item => {
      return Math.max(0, (item.reqQty || 0) - (item.currentQty || 0)) > 0;
    });

    if (validItemsToExport.length === 0) {
      alert(t("All selected items have sufficient stock. Nothing to order."));
      return;
    }

    const data = validItemsToExport.map(item => {
      const orderQty = Math.max(0, (item.reqQty || 0) - (item.currentQty || 0));
      return {
        "ITEM CODE": item.code,
        "ITEM NAME": item.name,
        "CATEGORY": item.category,
        "ORDER QTY": orderQty
      };
    });

    exportToExcel(data, "Requisition", "requisition.xlsx");
    saveRequisitionHistory('EXCEL', validItemsToExport);
  };

  const renderTable = (records, title) => {
    if (records.length === 0) return null;

    const allCurrentSelected = records.length > 0 && records.every(item => selectedItems.has(item.id));

    return (
      <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px var(--shadow-color)', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--table-header-bg)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <FileText color="var(--primary-color)" size={24} />
          <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            {title} ({displayItems.length})
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                {activeTab === 'REGULAR' && (
                  <th style={{ padding: '1rem', width: '80px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={allCurrentSelected}
                        onChange={() => handleSelectAll(records)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <span style={{ color: 'var(--slate-600)', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('SELECT')}</span>
                    </div>
                  </th>
                )}
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM CODE')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM NAME')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('CATEGORY')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('CURRENT QTY')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>{t('REQ QTY')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('STATUS')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>
                  {activeTab === 'REGULAR' && (
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleCheckboxChange(item.id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </td>
                  )}
                  <td style={{ padding: '1rem', color: 'var(--slate-900)', fontWeight: 'bold' }}>{item.code}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--slate-500)' }}>{item.category.toUpperCase()}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: item.currentQty <= 0 ? '#ef4444' : '#f59e0b', textAlign: 'right' }}>
                    {item.currentQty}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {activeTab === 'KIT' ? (
                      <span style={{ fontWeight: 'bold', color: 'var(--slate-900)' }}>{item.reqQty}</span>
                    ) : (
                      <input 
                        type="number"
                        value={reqQuantities[item.id] || ""}
                        onChange={(e) => handleReqQtyChange(item.id, e.target.value)}
                        placeholder="Qty"
                        min={['nos', 'ml', 'gms', 'pcs', 'box', 'set', 'pairs'].includes((item.unit || '').toLowerCase()) ? "1" : "0.01"}
                        step={['nos', 'ml', 'gms', 'pcs', 'box', 'set', 'pairs'].includes((item.unit || '').toLowerCase()) ? "1" : "0.01"}
                        style={{ width: '80px', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', textAlign: 'center' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: item.currentQty <= 0 ? '#ef4444' : item.currentQty <= item.minStock ? '#f59e0b' : '#10b981', textAlign: 'right' }}>
                    {item.currentQty <= 0 ? "OUT OF STOCK" : item.currentQty <= item.minStock ? "LOW STOCK" : "GOOD STOCK"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHistory = (history, title, currentPage, setPage) => {
    const totalPages = Math.ceil(history.length / HISTORY_PAGE_SIZE);
    const startIdx = (currentPage - 1) * HISTORY_PAGE_SIZE;
    const endIdx = startIdx + HISTORY_PAGE_SIZE;
    const pagedHistory = history.slice(startIdx, endIdx);

    return (
      <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginTop: '2rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="var(--primary-color)" /> {title} {t('History')}
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-500)' }}>
            {history.length} {t('records')}
          </span>
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('DATE')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('EXPORT FORMAT')}</th>
                {activeTab === 'KIT' && <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('KIT NAME')}</th>}
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>{t('ITEMS COUNT')}</th>
                <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('ACTIONS')}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'KIT' ? 5 : 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                    {t('No requisition history found yet. Export a PDF or Excel to save it here.')}
                  </td>
                </tr>
              ) : (
                pagedHistory.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', color: 'var(--slate-900)' }}>{new Date(req.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: 'bold' }}>{req.exportFormat}</td>
                    {activeTab === 'KIT' && <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{req.kitName || 'N/A'} {req.kitMultiplier ? `(x${req.kitMultiplier})` : ''}</td>}
                    <td style={{ padding: '1rem', color: 'var(--slate-500)', textAlign: 'center' }}>{req.items?.length || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => setSelectedHistory(req)}
                          style={{ backgroundColor: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          {t('View Items')}
                        </button>
                        <button
                          onClick={() => handleDeleteRequisition(req.id, req.type)}
                          title="Delete"
                          style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
              {t('Showing')} {startIdx + 1}–{Math.min(endIdx, history.length)} {t('of')} {history.length}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: currentPage === 1 ? 'var(--slate-100)' : 'var(--surface-bg)', color: currentPage === 1 ? 'var(--slate-400)' : 'var(--primary-color)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >← {t('Prev')}</button>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)', fontWeight: '600' }}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: currentPage === totalPages ? 'var(--slate-100)' : 'var(--surface-bg)', color: currentPage === totalPages ? 'var(--slate-400)' : 'var(--primary-color)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
              >{t('Next')} →</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Requisition')}</h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Generate material requisition for out of stock items or kits')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
              <FileText size={18} /> {selectedItems.size > 0 ? `PDF (${selectedItems.size})` : t('PDF')}
            </button>
            <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
              <FileSpreadsheet size={18} /> {selectedItems.size > 0 ? `Excel (${selectedItems.size})` : t('Excel')}
            </button>
          </div>
        </div>

        {/* Tabs Navigation (Matches uploaded image format) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
          <button
            onClick={() => { setActiveTab('REGULAR'); setSelectedHistory(null); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: activeTab === 'REGULAR' ? '#2563eb' : 'var(--slate-500)',
              borderBottom: activeTab === 'REGULAR' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {t('Regular Requisition')}
          </button>
          <button
            onClick={() => { setActiveTab('KIT'); setSelectedHistory(null); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: activeTab === 'KIT' ? '#2563eb' : 'var(--slate-500)',
              borderBottom: activeTab === 'KIT' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {t('Kit Requisition')}
          </button>
        </div>
        
        {activeTab === 'REGULAR' && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder={t("Search by Item Name or Code...")}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
            />
          </div>
          
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
          >
            <option value="">{t('All Categories')}</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
          >
            <option value="">{t('All Status')}</option>
            <option value="OUT OF STOCK">{t('Out of Stock')}</option>
            <option value="LOW STOCK">{t('Low Stock')}</option>
          </select>
        </div>
        )}
      </div>

      {activeTab === 'REGULAR' && (
        <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('Add Good Stock Items')}</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--slate-500)', fontSize: '0.9rem' }}>{t('Search and add normal stock items to this requisition.')}</p>
          
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder={t("Search by Item Name or Code...")}
              value={addSearchTerm}
              onChange={(e) => setAddSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
            />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {searchResults.map(item => (
                  <div 
                    key={item.id} 
                    style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => handleAddAdditionalItem(item)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-header-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--slate-900)', fontSize: '0.9rem' }}>{item.code}</div>
                      <div style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>{item.name}</div>
                    </div>
                    <button style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {addSearchTerm.trim() !== '' && searchResults.length === 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, padding: '1rem', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                {t('No good stock items found.')}
              </div>
            )}
          </div>
        </div>
      )}


      {activeTab === 'REGULAR' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader size={32} color="var(--primary-color)" className="animate-spin" />
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <div style={{ backgroundColor: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <AlertTriangle size={32} color="var(--slate-400)" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)', fontSize: '1.25rem' }}>{t('No items found')}</h3>
              <p style={{ margin: 0, color: 'var(--slate-500)' }}>{t('Try adjusting your search or filters.')}</p>
            </div>
          ) : (
            <>
              {renderTable(currentRecords, t('Requisition Items'))}

              {/* Simple Pagination Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  {t('Previous')}
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1 }}
                >
                  {t('Next')}
                </button>
              </div>
            </>
          )}

          {/* Regular History */}
          {renderHistory(regularHistory, "Regular Requisition", regularHistoryPage, setRegularHistoryPage)}
        </>
      )}

      {activeTab === 'KIT' && (
        <>
          <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('Kit Requisition')}</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--slate-500)', fontSize: '0.9rem' }}>{t('Select a kit/package to automatically generate a requisition list for its items.')}</p>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select 
                value={selectedKitId} 
                onChange={(e) => setSelectedKitId(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                <option value="" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{t('-- Select Kit/Package --')}</option>
                {kits.map(k => (
                  <option key={k.id} value={k.id} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{k.kitName}</option>
                ))}
              </select>
              
              <input 
                type="number" 
                value={kitMultiplier}
                onChange={(e) => setKitMultiplier(e.target.value)}
                min="1"
                title="Number of Kits"
                style={{ width: '100px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', textAlign: 'center' }}
              />
            </div>
          </div>
          
          {selectedKitId ? (
            renderTable(kitReqItems, t('Kit Requisition Items'))
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <div style={{ backgroundColor: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <CheckSquare size={32} color="var(--slate-400)" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)', fontSize: '1.25rem' }}>{t('No Kit Selected')}</h3>
            </div>
          )}

          {/* Kit History */}
          {renderHistory(kitHistory, "Kit Requisition", kitHistoryPage, setKitHistoryPage)}
        </>
      )}

      {/* History Items Modal */}
      {selectedHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface-bg)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1.25rem', fontWeight: 'bold' }}>{t('Requisition Items')}</h2>
              <button onClick={() => setSelectedHistory(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: 'var(--slate-500)', lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem', color: 'var(--slate-600)', fontSize: '0.85rem', fontWeight: 'bold' }}>{t('ITEM CODE')}</th>
                    <th style={{ padding: '1rem', color: 'var(--slate-600)', fontSize: '0.85rem', fontWeight: 'bold' }}>{t('ITEM NAME')}</th>
                    <th style={{ padding: '1rem', color: 'var(--slate-600)', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>{t('REQ QTY')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedHistory.items?.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', color: 'var(--slate-900)', fontWeight: 'bold' }}>{item.itemCode}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{item.itemName}</td>
                      <td style={{ padding: '1rem', color: 'var(--primary-color)', textAlign: 'right', fontWeight: 'bold' }}>{item.reqQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedHistory(null)} style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requisition;
