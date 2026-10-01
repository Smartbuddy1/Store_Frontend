import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Clock, Users, Plus, CheckCircle, ArrowUpDown, Search, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';

const Tools = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // States for Master Tools
  const [toolsMaster, setToolsMaster] = useState([]);
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [newToolCode, setNewToolCode] = useState('');

  // States for Helpers
  const [helpers, setHelpers] = useState([]);

  // States for Tool Issuance Log
  const [toolsLog, setToolsLog] = useState([]);

  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHelper, setFilterHelper] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  // States for Issue Form
  const [selectedTool, setSelectedTool] = useState('');
  const [selectedHelper, setSelectedHelper] = useState('');
  const [issueTime, setIssueTime] = useState('');

  // Load initial data
  const fetchData = async () => {
    try {
      const [tools, staff, logs] = await Promise.all([
        api.tools.getAllTools(),
        api.staff.getAll(),
        api.tools.getAllLogs()
      ]);
      setToolsMaster(tools);
      setHelpers(staff.filter(p => p.type === 'Helper'));
      setToolsLog(logs);
    } catch (error) {
      console.error('Failed to fetch tools data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    // Set default time to now
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5); // HH:MM format
    setIssueTime(timeString);
  }, []);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddToolOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Add New Tool to Master
  const handleAddNewTool = async () => {
    if (!newToolName.trim() || !newToolCode.trim()) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.tools.createTool({
        toolCode: newToolCode.toUpperCase(),
        toolName: newToolName
      });
      await fetchData();
      setNewToolName('');
      setNewToolCode('');
      setIsAddToolOpen(false);
      alert('Tool added successfully');
    } catch (error) {
      alert('Failed to add tool: ' + error.message);
    }
  };

  // Auto-generate code helper
  const handleOpenAddTool = () => {
    const nextNum = toolsMaster.length + 1;
    setNewToolCode(`T-${nextNum.toString().padStart(3, '0')}`);
    setIsAddToolOpen(true);
  };

  // Issue Tool to Helper
  const handleIssueTool = async () => {
    if (!selectedTool || !selectedHelper || !issueTime) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.tools.issueTool({
        toolCode: selectedTool,
        helperName: selectedHelper,
        issueTime: issueTime
      });
      await fetchData();
      
      // Reset Form
      setSelectedTool('');
      setSelectedHelper('');
      const now = new Date();
      setIssueTime(now.toTimeString().slice(0, 5));
      alert('Tool issued successfully!');
    } catch (error) {
      alert('Failed to issue tool: ' + error.message);
    }
  };

  // Mark as Returned
  const handleMarkReturned = async (logId) => {
    const now = new Date();
    const returnTimeString = now.toTimeString().slice(0, 5);

    try {
      await api.tools.returnTool(logId, { returnTime: returnTimeString });
      await fetchData();
    } catch (error) {
      alert('Failed to return tool: ' + error.message);
    }
  };

  const filteredLogs = toolsLog.filter(log => {
    const matchesSearch = log.toolName.toLowerCase().includes(searchTerm.toLowerCase()) || log.toolCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHelper = filterHelper === '' || log.helperName === filterHelper;
    const matchesStatus = filterStatus === '' || log.status === filterStatus;
    return matchesSearch && matchesHelper && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const currentRecords = filteredLogs.slice(indexOfFirst, indexOfFirst + recordsPerPage);

  const handleExportPDF = async () => {
    const tableColumn = ["DATE", "TOOL CODE", "TOOL NAME", "HELPER NAME", "OUT TIME", "RETURN TIME", "STATUS"];
    const tableRows = [];
    filteredLogs.forEach(log => {
      tableRows.push([log.date, log.toolCode, log.toolName, log.helperName, log.issueTime, log.returnTime || 'Pending', log.status]);
    });
    await exportToPDF("Tools Tracking Report", tableColumn, tableRows, "tools_log.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredLogs.map(log => ({
      "DATE": log.date,
      "TOOL CODE": log.toolCode,
      "TOOL NAME": log.toolName,
      "HELPER NAME": log.helperName,
      "OUT TIME": log.issueTime,
      "RETURN TIME": log.returnTime || 'Pending',
      "STATUS": log.status
    }));
    exportToExcel(data, "ToolsTracking", "tools_log.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Tools Tracking')}</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Track borrowed tools and equipment')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <Download size={18} /> PDF
          </button>
          <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button 
          onClick={handleOpenAddTool}
          style={{ backgroundColor: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Plus size={18} /> {t('Add New Tool')}
        </button>
        </div>
      </div>

      {/* Add New Tool Inline Form (Visible when button is clicked) */}
      {isAddToolOpen && (
        <div style={{ backgroundColor: '#e0f2fe', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '0.5rem' }}>{t('Tool Code')}</label>
            <input 
              type="text" 
              value={newToolCode}
              onChange={e => setNewToolCode(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none' }}
            />
          </div>
          <div style={{ flex: '2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '0.5rem' }}>{t('Tool Name')}</label>
            <input 
              type="text" 
              placeholder="e.g. Angle Grinder"
              value={newToolName}
              onChange={e => setNewToolName(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none' }}
            />
          </div>
          <button 
            onClick={handleAddNewTool}
            style={{ backgroundColor: '#0ea5e9', color: 'var(--surface-bg)', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}
          >
            {t('Save Tool')}
          </button>
          <button 
            onClick={() => setIsAddToolOpen(false)}
            style={{ backgroundColor: 'transparent', color: '#0369a1', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '0.65rem', height: '42px' }}
          >
            {t('Cancel')}
          </button>
        </div>
      )}

      {/* Issue Tool Form */}
      <div style={{ backgroundColor: 'var(--slate-50)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', marginBottom: '0.5rem' }}>{t('Select Tool')}</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 0.5rem' }}>
            <PenTool size={18} color='var(--slate-500)' />
            <select 
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent' }}
            >
              <option value="">-- Select Tool --</option>
              {toolsMaster.map(t => (
                <option key={t.toolCode} value={t.toolCode}>{t.toolName} ({t.toolCode})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', marginBottom: '0.5rem' }}>{t('Select Helper')}</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 0.5rem' }}>
            <Users size={18} color='var(--slate-500)' />
            <select 
              value={selectedHelper}
              onChange={(e) => setSelectedHelper(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent' }}
            >
              <option value="">-- Select Helper --</option>
              {helpers.map((h, i) => (
                <option key={i} value={h.name}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', marginBottom: '0.5rem' }}>{t('Issue Time')}</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 0.5rem' }}>
            <Clock size={18} color='var(--slate-500)' />
            <input 
              type="time" 
              value={issueTime}
              onChange={e => setIssueTime(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem' }} 
            />
          </div>
        </div>

        <button 
          onClick={handleIssueTool}
          style={{ backgroundColor: '#8b5cf6', color: 'var(--surface-bg)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '42px' }}
        >
          Issue Tool
        </button>
      </div>

      {/* Filters Section */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search tool name or code..." 
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
          value={filterHelper}
          onChange={(e) => setFilterHelper(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
        >
          <option value="">All Helpers</option>
          {[...new Set(toolsLog.map(log => log.helperName))].filter(Boolean).sort().map((h, idx) => (
            <option key={idx} value={h}>{h}</option>
          ))}
        </select>

        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          <option value="Issued">Issued (Not Returned)</option>
          <option value="Returned">Returned</option>
        </select>
      </div>

      {/* Tools Log Table */}
      <div style={{ backgroundColor: 'var(--surface-bg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('DATE')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('TOOL CODE')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('TOOL NAME')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('HELPER NAME')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('OUT TIME')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('RETURN TIME')}</th>
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'right' }}>{t('ACTION / STATUS')}</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{log.date}</td>
                <td style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--slate-900)' }}>{log.toolCode}</td>
                <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-700)' }}>{log.toolName}</td>
                <td style={{ padding: '1.25rem 1rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>{log.helperName}</td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {log.issueTime}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  {log.returnTime ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {log.returnTime}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.9rem' }}>Pending...</span>
                  )}
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                  {log.status === 'Issued' ? (
                    <button 
                      onClick={() => handleMarkReturned(log.id)}
                      style={{ backgroundColor: '#10b981', color: 'var(--surface-bg)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <CheckCircle size={14} /> Mark Returned
                    </button>
                  ) : (
                    <span style={{ color: '#10b981', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={16} /> Returned
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                  No tools match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination UI */}
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem', borderTop: '1px solid #e2e8f0' }}>
          <span>Showing {filteredLogs.length > 0 ? indexOfFirst + 1 : 0} to {Math.min(indexOfFirst + recordsPerPage, filteredLogs.length)} of {filteredLogs.length} entries</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-600)' }}>
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: (currentPage === totalPages || totalPages === 0) ? '#f8fafc' : '#ffffff', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', color: 'var(--slate-600)' }}>
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Tools;
