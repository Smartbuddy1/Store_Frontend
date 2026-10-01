import React, { useState, useEffect } from 'react';
import { Package, Plus, Send, CheckCircle, Tag, Hash, Users, Trash2, ClipboardList, Search, Download, FileSpreadsheet, Edit } from 'lucide-react';
import api from '../utils/api';
import { exportToExcel } from '../utils/excelExport';
import { exportToPDF } from '../utils/pdfExport';
import { formatTime12h } from '../utils/translator';

const SiteDispatch = () => {
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = (text) => {
    if (lang === 'en') return text;
    const dict = {
      'Site Dispatch (Kits/Assemblies)': 'साईट डिस्पॅच (किट्स/पॅकेज)',
      'Record bulk dispatch using predefined kits': 'पूर्वनिर्धारित किट्स वापरून बल्क डिस्पॅच रेकॉर्ड करा',
      'Select Kit': 'किट निवडा',
      'Quantity (e.g. 2 Toilets)': 'संख्या (उदा. २ टॉयलेट्स)',
      'Handover To': 'कोणाला दिले (Handover To)',
      'Generate Checklist': 'चेकलिस्ट तयार करा',
      'Cancel': 'रद्द करा',
      'Complete Dispatch': 'डिस्पॅच पूर्ण करा',
      'Dispatch Checklist': 'डिस्पॅच चेकलिस्ट',
      'Item Code': 'वस्तूचा कोड',
      'Item Name': 'वस्तूचे नाव',
      'Req. Qty': 'आवश्यक संख्या',
      'Verified': 'तपासले (Verified)',
      'Select All': 'सर्व निवडा',
      'Please verify all items before dispatching.': 'डिस्पॅच करण्यापूर्वी कृपया सर्व वस्तू तपासल्याची खात्री करा.',
      'Date': 'तारीख',
      'Time': 'वेळ',
      'Purpose/Remarks': 'उद्देश/शेरा',
      'Date & Time': 'तारीख आणि वेळ',
      'Quantity': 'संख्या',
      'Actions': 'कृती (Actions)',
      'Recent Dispatches (via Kits)': 'अलीकडील जावक (Kits द्वारे)',
      'Search by Name, Code, or Person...': 'नाव, कोड किंवा व्यक्तीनुसार शोधा...'
    };
    return dict[text] || text;
  };

  const [kits, setKits] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [selectedKitId, setSelectedKitId] = useState('');
  const [kitQuantity, setKitQuantity] = useState(1);
  const [handoverTo, setHandoverTo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  
  const [checklist, setChecklist] = useState([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [editingDispatchIds, setEditingDispatchIds] = useState(null);
  const [loading, setLoading] = useState(false);

  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentStockMap, setCurrentStockMap] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitsData, staffData, stockOutData, currentStockData] = await Promise.all([
        api.kits.getAll(),
        api.staff.getAll(),
        api.stockOut.getAll(),
        api.currentStock.getAll()
      ]);
      setKits(kitsData || []);
      setStaffList(staffData || []);
      
      const stockMap = {};
      (currentStockData || []).forEach(item => {
        stockMap[item.item_code] = item.current_qty;
      });
      setCurrentStockMap(stockMap);
      
      const historyItems = (stockOutData || []).filter(item => item.remarks === 'Auto-dispatched via Site Dispatch');
      
      const grouped = {};
      historyItems.forEach(item => {
        const key = `${item.date}-${item.time}-${item.purpose}-${item.handoverTo}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: item.id,
            ids: [],
            date: item.date,
            time: item.time,
            purpose: item.purpose,
            handoverTo: item.handoverTo
          };
        }
        grouped[key].ids.push(item.id);
      });
      
      const history = Object.values(grouped).map(group => {
        let kitName = 'Unknown Kit';
        let kitQty = 1;
        
        const match = group.purpose?.match(/Kit Dispatch: (.*?)(?:\s+\(Qty: (\d+)\))?$/);
        if (match) {
          kitName = match[1];
          if (match[2]) kitQty = parseInt(match[2], 10);
        }

        return {
          id: group.id,
          ids: group.ids,
          date: group.date,
          time: group.time,
          itemName: kitName,
          itemCode: 'KIT',
          quantity: kitQty,
          handoverTo: group.handoverTo
        };
      });

      history.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
      setDispatchHistory(history.slice(0, 20)); // show latest 20
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleGenerate = () => {
    if (!selectedKitId || kitQuantity <= 0 || !handoverTo) {
      alert('Please select a kit, valid quantity, and handover person.');
      return;
    }

    const kit = kits.find(k => k.id === selectedKitId);
    if (!kit) return;

    // Generate checklist based on kit items and quantity
    const list = kit.kitItems.map(ki => {
      let requiredQty = ki.quantity * kitQuantity;
      let displayUnit = ki.unit || ki.item.unit;
      let baseQuantity = requiredQty;

      if (ki.item.unit?.toLowerCase() === 'ltrs' || ki.item.unit?.toLowerCase() === 'ltr') {
        if (ki.unit?.toLowerCase() === 'ml') {
          baseQuantity = requiredQty / 1000;
        }
      } else if (ki.item.unit?.toLowerCase() === 'kgs' || ki.item.unit?.toLowerCase() === 'kg') {
        if (ki.unit?.toLowerCase() === 'gms') {
          baseQuantity = requiredQty / 1000;
        }
      }

      return {
        id: ki.id,
        itemCode: ki.itemCode,
        itemName: ki.item.itemName,
        category: ki.item.categoryName,
        unit: displayUnit,
        baseUnit: ki.item.unit,
        displayQty: requiredQty,
        requiredQty: baseQuantity,
        verified: false
      };
    });

    setChecklist(list);
    setIsGenerated(true);
  };

  const handlePrintChecklistPDF = async () => {
    const kitName = kits.find(k => k.id === selectedKitId)?.kitName || 'Unknown Kit';
    const tableColumn = ["Verified", "Item Code", "Item Name", "Req. Qty"];
    const rows = checklist.map(item => [
      "",
      item.itemCode,
      item.itemName,
      `${item.displayQty} ${item.unit || ''}`
    ]);
    
    await exportToPDF(`Dispatch Checklist - ${kitName}`, tableColumn, rows, `checklist_${kitName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDispatch = async () => {
    // Ensure checklist is generated
    if (checklist.length === 0) return;

    // Check current stock for all items
    for (const item of checklist) {
      const available = currentStockMap[item.itemCode] || 0;
      if (item.requiredQty > available) {
        alert(t(`Cannot dispatch! Not enough stock for ${item.itemName} (${item.itemCode}). Required: ${item.requiredQty}, Available: ${available}`));
        return;
      }
    }

    setLoading(true);
    try {
      if (editingDispatchIds) {
        await Promise.all(editingDispatchIds.map(id => api.stockOut.delete(id)));
      }

      // Bulk dispatch
      await Promise.all(checklist.map(item => {
        return api.stockOut.create({
          date,
          time,
          item_code: item.itemCode,
          item_name: item.itemName,
          category: item.category,
          quantity: item.requiredQty,
          handover_to: handoverTo,
          purpose: `Kit Dispatch: ${kits.find(k => k.id === selectedKitId)?.kitName} (Qty: ${kitQuantity})`,
          remarks: 'Auto-dispatched via Site Dispatch'
        });
      }));
      
      alert('Dispatch successful!');
      
      // Reset form
      setSelectedKitId('');
      setKitQuantity(1);
      setHandoverTo('');
      setChecklist([]);
      setIsGenerated(false);
      setEditingDispatchIds(null);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      
      // Refresh history
      fetchData();
      
    } catch (error) {
      console.error('Error in bulk dispatch:', error);
      alert('Error during dispatch. Some items may not have been recorded.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDispatch = (item) => {
    const kit = kits.find(k => k.kitName === item.itemName);
    if (kit) {
      setSelectedKitId(kit.id);
    } else {
      alert("The original kit name was not found. Please select the appropriate kit from the dropdown.");
      setSelectedKitId('');
    }
    
    setKitQuantity(item.quantity);
    setHandoverTo(item.handoverTo);
    setDate(new Date(item.date).toISOString().split('T')[0]);
    setTime(item.time);
    setEditingDispatchIds(item.ids);
    setIsGenerated(false);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDispatch = async (ids) => {
    if (window.confirm('Are you sure you want to delete this kit dispatch?')) {
      try {
        await Promise.all(ids.map(id => api.stockOut.delete(id)));
        fetchData();
        alert('Dispatch deleted successfully!');
      } catch (err) {
        alert('Failed to delete dispatch: ' + err.message);
      }
    }
  };

  const filteredHistory = dispatchHistory.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.handoverTo && item.handoverTo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportPDF = async () => {
    const tableColumn = ["DATE", "ITEM NAME", "QUANTITY", "HANDOVER TO"];
    const tableRows = [];
    filteredHistory.forEach(item => {
      tableRows.push([
        new Date(item.date).toLocaleDateString() + ' ' + item.time, 
        item.itemName, 
        item.quantity, 
        item.handoverTo || '-'
      ]);
    });
    await exportToPDF("Site Dispatch History", tableColumn, tableRows, "site_dispatch.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredHistory.map(item => ({
      "DATE": new Date(item.date).toLocaleDateString() + ' ' + item.time,
      "ITEM NAME": item.itemName,
      "QUANTITY": item.quantity,
      "HANDOVER TO": item.handoverTo || '-'
    }));
    exportToExcel(data, "SiteDispatch", "site_dispatch.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Site Dispatch (Kits/Assemblies)')}</h1>
        <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Record bulk dispatch using predefined kits')}</p>
      </div>

      {/* Setup Form */}
      <div style={{
        backgroundColor: 'var(--surface-bg)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Date')}</label>
            <input 
              type="date" 
              max={new Date().toISOString().split('T')[0]}
              value={date} 
              onChange={(e) => {
                const today = new Date().toISOString().split('T')[0];
                setDate(e.target.value > today ? today : e.target.value);
              }} 
              disabled={isGenerated} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Time')}</label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => {
                const today = new Date().toISOString().split('T')[0];
                const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                if (date === today && e.target.value > now) {
                  setTime(now);
                } else {
                  setTime(e.target.value);
                }
              }} 
              disabled={isGenerated} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Select Kit')}</label>
            <select value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)} disabled={isGenerated} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>
              <option value="">-- Select --</option>
              {kits.map(k => (
                <option key={k.id} value={k.id}>{k.kitName}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Quantity (e.g. 2 Toilets)')}</label>
            <input type="number" min="1" value={kitQuantity} onChange={(e) => setKitQuantity(Number(e.target.value))} disabled={isGenerated} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Handover To')}</label>
            <select value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} disabled={isGenerated} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>
              <option value="">-- Select --</option>
              {staffList.filter(s => s.type === 'Helper').map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!isGenerated && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleGenerate}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Package size={18} /> {t('Generate Checklist')}
            </button>
          </div>
        )}
      </div>

      {/* Checklist Section */}
      {isGenerated && (
        <div style={{
          backgroundColor: 'var(--surface-bg)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={20} color='#3b82f6' />
              {t('Dispatch Checklist')}
            </h2>
            <button onClick={handlePrintChecklistPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Download size={18} /> Print PDF
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Code')}</th>
                  <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name')}</th>
                  <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Req. Qty')}</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', color: 'var(--slate-600)', fontWeight: '500' }}>{item.itemCode}</td>
                    <td style={{ padding: '1rem', color: 'var(--slate-900)', fontWeight: '500' }}>{item.itemName}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--slate-900)' }}>{item.displayQty}</span> <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>{item.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button 
              onClick={() => { setIsGenerated(false); setChecklist([]); }}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
            >
              {t('Cancel')}
            </button>
            <button 
              onClick={handleDispatch}
              disabled={loading}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
            >
              <Send size={18} /> {loading ? 'Processing...' : t('Add Dispatch')}
            </button>
          </div>
        </div>
      )}

      {/* History Section */}
      <div style={{
        backgroundColor: 'var(--surface-bg)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} color='#10b981' />
            {t('Recent Dispatches (via Kits)')}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <Search size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder={t('Search by Name, Code, or Person...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
              />
            </div>
            <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Download size={18} /> PDF
            </button>
            <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1px solid #059669', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <FileSpreadsheet size={18} /> Excel
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Date & Time')}</th>
                <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name')}</th>
                <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Quantity')}</th>
                <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Handover To')}</th>
                <th style={{ padding: '1rem', color: 'var(--slate-500)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                    No recent site dispatches found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', color: 'var(--slate-700)' }}>
                      {new Date(item.date).toLocaleDateString()} <span style={{ color: 'var(--slate-400)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{formatTime12h(item.time)}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--slate-900)', fontWeight: '500' }}>
                      {item.itemName} <span style={{ color: 'var(--slate-400)', fontSize: '0.8rem', display: 'block' }}>{item.itemCode}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--slate-900)' }}>{item.quantity}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--slate-700)' }}>{item.handoverTo}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEditDispatch(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteDispatch(item.ids)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SiteDispatch;
