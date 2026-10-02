import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Search, FileText, FileSpreadsheet, Download, Loader, CheckSquare, Send } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const Requisition = () => {
  const [currentStockData, setCurrentStockData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // State for checkboxes
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // State for manually added items
  const [additionalItems, setAdditionalItems] = useState([]);
  const [addSearchTerm, setAddSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.currentStock.getAll();
        const mappedData = data.map(item => ({
          id: item.id,
          code: item.item_code,
          name: item.item_name,
          category: item.category || 'N/A',
          currentQty: item.current_qty || 0,
          minStock: item.minimum_stock || 5
        }));
        setCurrentStockData(mappedData);
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

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;
  const totalPages = Math.ceil(displayItems.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const currentRecords = displayItems.slice(indexOfFirst, indexOfFirst + recordsPerPage);

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
    setAdditionalItems(prev => [...prev, item]);
    setSelectedItems(prev => new Set([...prev, item.id])); // Auto-select added items
    setAddSearchTerm('');
  };

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
    if (selectedItems.size > 0) {
      return displayItems.filter(item => selectedItems.has(item.id));
    }
    return displayItems; // export all displayed if none specifically selected
  };

  const handleExportPDF = async () => {
    const itemsToExport = getExportData();
    if (itemsToExport.length === 0) {
      alert("No items selected or available to export.");
      return;
    }
    
    const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "CURRENT QTY", "REQ QTY", "STATUS"];
    const rows = itemsToExport.map(item => [
      item.code, 
      item.name, 
      item.category, 
      item.currentQty,
      "", // Blank column for REQ QTY
      item.currentQty <= 0 ? "OUT OF STOCK" : item.currentQty <= item.minStock ? "LOW STOCK" : "GOOD STOCK"
    ]);
    
    await exportToPDF("Material Requisition Request", tableColumn, rows, "requisition.pdf");
  };

  const handleExportExcel = () => {
    const itemsToExport = getExportData();
    if (itemsToExport.length === 0) {
      alert("No items selected or available to export.");
      return;
    }

    const data = itemsToExport.map(item => ({
      "ITEM CODE": item.code,
      "ITEM NAME": item.name,
      "CATEGORY": item.category,
      "CURRENT QTY": item.currentQty,
      "REQ QTY": "", // Blank column for writing later
      "STATUS": item.currentQty <= 0 ? "OUT OF STOCK" : item.currentQty <= item.minStock ? "LOW STOCK" : "GOOD STOCK"
    }));

    exportToExcel(data, "Requisition", "requisition.xlsx");
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
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleCheckboxChange(item.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--slate-900)', fontWeight: 'bold' }}>{item.code}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--slate-500)' }}>{item.category.toUpperCase()}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: item.currentQty <= 0 ? '#ef4444' : '#f59e0b', textAlign: 'right' }}>
                    {item.currentQty}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {/* Blank line for printing/writing */}
                    <div style={{ borderBottom: '1px solid var(--slate-400)', width: '80%', margin: '0 auto', height: '1.5rem' }}></div>
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

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Requisition')}</h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Select low stock items and generate material requisition')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
              <FileText size={18} /> {selectedItems.size > 0 ? `PDF (${selectedItems.size})` : 'PDF'}
            </button>
            <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
              <FileSpreadsheet size={18} /> {selectedItems.size > 0 ? `Excel (${selectedItems.size})` : 'Excel'}
            </button>
          </div>
        </div>
        
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
      </div>

      {/* Add Additional Items Form (Placed Above Table) */}
      <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('Add Good Stock Items')}</h2>
            <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.9rem' }}>{t('Search and add normal stock items to this requisition.')}</p>
          </div>
          
          <div style={{ position: 'relative', flex: '1', minWidth: '300px', maxWidth: '400px' }}>
            <Search size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder={t("Search by Item Name or Code...")}
              value={addSearchTerm}
              onChange={(e) => setAddSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
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
      </div>

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
    </div>
  );
};

export default Requisition;
