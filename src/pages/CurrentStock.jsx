import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, AlertTriangle, CheckCircle, AlertCircle, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const CurrentStock = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const data = await api.currentStock.getAll();
      setStockData(data.map(item => ({
        id: item.id,
        code: item.item_code,
        name: item.item_name,
        category: item.category,
        totalIn: item.total_in,
        totalOut: item.total_out,
        currentQty: item.current_qty,
        minStock: item.minimum_stock,
        unit: item.unit
      })));
    } catch (err) {
      console.error('Failed to fetch current stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Determine status based on quantity
  const getStatus = (current, min) => {
    if (current === 0) return { label: 'Empty', color: '#ef4444', bg: '#fee2e2', rowBg: '#fef2f2', icon: AlertTriangle };
    if (current <= min) return { label: 'Low', color: '#f59e0b', bg: '#fef3c7', rowBg: '#fefce8', icon: AlertCircle };
    return { label: 'Good', color: '#10b981', bg: '#dcfce7', rowBg: '#f0fdf4', icon: CheckCircle };
  };

  const uniqueCategories = [...new Set(stockData.map(item => item.category))].filter(c => c !== 'N/A').sort();

  const filteredData = stockData.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === '' || getStatus(item.currentQty, item.minStock).label === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const recordsPerPage = 50;
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const indexOfLast = indexOfFirst + recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirst, indexOfLast);

  const handleExportPDF = async () => {
    const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "TOTAL IN", "TOTAL OUT", "CURRENT STOCK", "STATUS"];
    const tableRows = [];
    filteredData.forEach(item => {
      let status = 'Good';
      if (item.currentQty <= 0) status = 'Empty';
      else if (item.currentQty <= item.minStock) status = 'Low';
      tableRows.push([item.code, item.name, item.category, item.totalIn, item.totalOut, item.currentQty, status]);
    });
    await exportToPDF("Current Stock Report", tableColumn, tableRows, "current_stock.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredData.map(item => {
      let status = 'Good';
      if (item.currentQty <= 0) status = 'Empty';
      else if (item.currentQty <= item.minStock) status = 'Low';
      return {
        "ITEM CODE": item.code,
        "ITEM NAME": item.name,
        "CATEGORY": item.category,
        "TOTAL IN": item.totalIn,
        "TOTAL OUT": item.totalOut,
        "CURRENT STOCK": item.currentQty,
        "STATUS": status
      };
    });
    exportToExcel(data, "CurrentStock", "current_stock.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', minHeight: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Current Stock')}</h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Real-time inventory levels and alerts</p>
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
              placeholder="Search items or code..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="Good">In Stock (Good)</option>
            <option value="Low">Low Stock (Low)</option>
            <option value="Empty">Out of Stock (Empty)</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
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
                {t('CATEGORY')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                {t('UNIT')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                {t('MIN STOCK')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                {t('TOTAL IN')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                {t('TOTAL OUT')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                {t('CURRENT QTY')}
              </th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>
                {t('STATUS')}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((item) => {
              const status = getStatus(item.currentQty, item.minStock);
              const StatusIcon = status.icon;
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: status.rowBg }}>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {item.code}
                  </td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        backgroundColor: 'var(--slate-200)', color: 'var(--slate-700)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.9rem'
                      }}>
                        {item.name.charAt(0)}
                      </div>
                      <span style={{ color: 'var(--slate-700)', fontWeight: '600', fontSize: '0.95rem' }}>
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    {item.category.toUpperCase()}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                    {item.unit}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.95rem' }}>
                    {item.minStock}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: '#10b981', whiteSpace: 'nowrap' }}>
                    + {item.totalIn}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: '#ef4444', whiteSpace: 'nowrap' }}>
                    - {item.totalOut}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    {item.currentQty}
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: status.bg,
                      color: status.color,
                      padding: '0.4rem 0.8rem',
                      borderRadius: '20px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}>
                      <StatusIcon size={16} />
                      {status.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination UI */}
        <div style={{ padding: '1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          <span>Showing {filteredData.length > 0 ? indexOfFirst + 1 : 0} to {Math.min(indexOfLast, filteredData.length)} of {filteredData.length} entries</span>
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

    </div>
  );
};

export default CurrentStock;
