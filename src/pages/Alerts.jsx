import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, ArrowUpDown, Search, FileText, FileSpreadsheet, Download, Loader } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const Alerts = () => {
  const [currentStockData, setCurrentStockData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

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
          minStock: item.minimum_stock || 5,
          unit: item.unit || 'Nos'
        }));
        setCurrentStockData(mappedData);
      } catch (err) {
        console.error('Failed to fetch alerts data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.selectedStatus) {
      setSelectedStatus(location.state.selectedStatus);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  
  const [outPage, setOutPage] = useState(1);
  const [lowPage, setLowPage] = useState(1);
  const recordsPerPage = 50;

  const uniqueCategories = [...new Set(currentStockData.map(item => item.category))].filter(c => c !== 'N/A').sort();

  const filteredData = currentStockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const outOfStockItems = filteredData.filter(item => item.currentQty <= 0);
  const lowStockItems = filteredData.filter(item => item.currentQty > 0 && item.currentQty <= item.minStock);

  const totalOutPages = Math.ceil(outOfStockItems.length / recordsPerPage);
  const indexOfFirstOut = (outPage - 1) * recordsPerPage;
  const currentOutRecords = outOfStockItems.slice(indexOfFirstOut, indexOfFirstOut + recordsPerPage);

  const totalLowPages = Math.ceil(lowStockItems.length / recordsPerPage);
  const indexOfFirstLow = (lowPage - 1) * recordsPerPage;
  const currentLowRecords = lowStockItems.slice(indexOfFirstLow, indexOfFirstLow + recordsPerPage);

  const getExportData = () => {
    if (selectedStatus === 'OUT OF STOCK') return outOfStockItems;
    if (selectedStatus === 'LOW STOCK') return lowStockItems;
    return filteredData.filter(item => item.currentQty <= item.minStock);
  };

  const handleExportPDF = async () => {
    const tableColumn = ["ITEM CODE", "ITEM NAME", "CATEGORY", "UNIT", "MIN STOCK", "CURRENT QTY", "STATUS"];
    
    if (selectedStatus === 'OUT OF STOCK') {
      const rows = outOfStockItems.map(item => [item.code, item.name, item.category, item.unit, item.minStock, item.currentQty, "OUT OF STOCK"]);
      await exportToPDF("Stock Alerts Report", tableColumn, rows, "stock_alerts.pdf");
    } else if (selectedStatus === 'LOW STOCK') {
      const rows = lowStockItems.map(item => [item.code, item.name, item.category, item.unit, item.minStock, item.currentQty, "LOW STOCK"]);
      await exportToPDF("Stock Alerts Report", tableColumn, rows, "stock_alerts.pdf");
    } else {
      // Both tables
      const outRows = outOfStockItems.map(item => [item.code, item.name, item.category, item.unit, item.minStock, item.currentQty, "OUT OF STOCK"]);
      const lowRows = lowStockItems.map(item => [item.code, item.name, item.category, item.unit, item.minStock, item.currentQty, "LOW STOCK"]);
      
      const multipleTables = [
        { subtitle: "OUT OF STOCK ITEMS", rows: outRows },
        { subtitle: "LOW STOCK ITEMS", rows: lowRows }
      ];
      await exportToPDF("Stock Alerts Report", tableColumn, null, "stock_alerts.pdf", multipleTables);
    }
  };

  const handleExportExcel = () => {
    const mapItem = (item, status) => ({
      "ITEM CODE": item.code,
      "ITEM NAME": item.name,
      "CATEGORY": item.category,
      "UNIT": item.unit,
      "MIN STOCK": item.minStock,
      "CURRENT QTY": item.currentQty,
      "STATUS": status
    });

    if (selectedStatus === 'OUT OF STOCK') {
      const data = outOfStockItems.map(item => mapItem(item, "OUT OF STOCK"));
      exportToExcel(data, "Out of Stock", "stock_alerts.xlsx");
    } else if (selectedStatus === 'LOW STOCK') {
      const data = lowStockItems.map(item => mapItem(item, "LOW STOCK"));
      exportToExcel(data, "Low Stock", "stock_alerts.xlsx");
    } else {
      // Both sheets
      const multipleSheets = [
        { name: "Out of Stock", data: outOfStockItems.map(item => mapItem(item, "OUT OF STOCK")) },
        { name: "Low Stock", data: lowStockItems.map(item => mapItem(item, "LOW STOCK")) }
      ];
      exportToExcel(null, null, "stock_alerts.xlsx", multipleSheets);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Alerts')}</h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Monitor items that need immediate attention or restocking')}</p>
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
          >
            <option value="">All Alerts</option>
            <option value="OUT OF STOCK">Out of Stock</option>
            <option value="LOW STOCK">Low Stock</option>
          </select>
        </div>
      </div>

      {/* Out of Stock Section */}
      {(selectedStatus === '' || selectedStatus === 'OUT OF STOCK') && (
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#b91c1c', margin: 0 }}>Out of Stock</h2>
          <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {outOfStockItems.length} Items
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #fecaca', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                <th style={{ color: '#991b1b', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM CODE')}</th>
                <th style={{ color: '#991b1b', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM NAME')}</th>
                <th style={{ color: '#991b1b', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('CATEGORY')}</th>
                <th style={{ color: '#991b1b', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('UNIT')}</th>
                <th style={{ color: '#991b1b', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('CURRENT QTY')}</th>
              </tr>
            </thead>
            <tbody>
              {currentOutRecords.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #fef2f2' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#7f1d1d' }}>{item.code}</td>
                  <td style={{ padding: '1rem', color: '#991b1b', fontWeight: '600' }}>{item.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>{item.category}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#991b1b', fontWeight: '500' }}>{item.unit}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    {item.currentQty}
                  </td>
                </tr>
              ))}
              {outOfStockItems.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>
                    Great! No items are currently out of stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI for Out of Stock */}
        <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          <span>Showing {outOfStockItems.length > 0 ? (Math.min(indexOfFirstOut + recordsPerPage, outOfStockItems.length)) - (indexOfFirstOut) : 0} of {outOfStockItems.length} entries</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setOutPage(prev => Math.max(prev - 1, 1))}
              disabled={outPage === 1}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: outPage === 1 ? '#fef2f2' : '#ffffff', cursor: outPage === 1 ? 'not-allowed' : 'pointer', color: '#991b1b' }}>
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: '#7f1d1d' }}>
              Page {outPage} of {totalOutPages || 1}
            </span>
            <button
              onClick={() => setOutPage(prev => Math.min(prev + 1, totalOutPages))}
              disabled={outPage === totalOutPages || totalOutPages === 0}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: (outPage === totalOutPages || totalOutPages === 0) ? '#fef2f2' : '#ffffff', cursor: (outPage === totalOutPages || totalOutPages === 0) ? 'not-allowed' : 'pointer', color: '#991b1b' }}>
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Low Stock Section */}
      {(selectedStatus === '' || selectedStatus === 'LOW STOCK') && (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={24} color="#f59e0b" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#b45309', margin: 0 }}>Low Stock</h2>
          <span style={{ backgroundColor: '#fef3c7', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            {lowStockItems.length} Items
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #fde68a', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM CODE')}</th>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ITEM NAME')}</th>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('CATEGORY')}</th>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('UNIT')}</th>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('MIN STOCK')}</th>
                <th style={{ color: '#92400e', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('CURRENT QTY')}</th>
              </tr>
            </thead>
            <tbody>
              {currentLowRecords.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #fffbeb' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#78350f' }}>{item.code}</td>
                  <td style={{ padding: '1rem', color: '#92400e', fontWeight: '600' }}>{item.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>{item.category}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#92400e', fontWeight: '500' }}>{item.unit}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: '#b45309', fontWeight: '600' }}>
                    {item.minStock}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#f59e0b', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    {item.currentQty}
                  </td>
                </tr>
              ))}
              {lowStockItems.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>
                    All items have sufficient stock above minimum levels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI for Low Stock */}
        <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
          <span>Showing {lowStockItems.length > 0 ? (Math.min(indexOfFirstLow + recordsPerPage, lowStockItems.length)) - (indexOfFirstLow) : 0} of {lowStockItems.length} entries</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setLowPage(prev => Math.max(prev - 1, 1))}
              disabled={lowPage === 1}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #fde68a', borderRadius: '4px', backgroundColor: lowPage === 1 ? '#fffbeb' : '#ffffff', cursor: lowPage === 1 ? 'not-allowed' : 'pointer', color: '#92400e' }}>
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: '#78350f' }}>
              Page {lowPage} of {totalLowPages || 1}
            </span>
            <button
              onClick={() => setLowPage(prev => Math.min(prev + 1, totalLowPages))}
              disabled={lowPage === totalLowPages || totalLowPages === 0}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #fde68a', borderRadius: '4px', backgroundColor: (lowPage === totalLowPages || totalLowPages === 0) ? '#fffbeb' : '#ffffff', cursor: (lowPage === totalLowPages || totalLowPages === 0) ? 'not-allowed' : 'pointer', color: '#92400e' }}>
              Next
            </button>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};

export default Alerts;
