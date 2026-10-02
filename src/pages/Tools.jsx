import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Clock, Users, Plus, CheckCircle, Search, FileText, FileSpreadsheet, Download, Edit, Trash2, X, Save } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t, formatTime12h } from '../utils/translator';
import api from '../utils/api';
import toast from 'react-hot-toast';

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

  // Edit Modal State
  const [editingLog, setEditingLog] = useState(null);
  const [editToolCode, setEditToolCode] = useState('');
  const [editHelperName, setEditHelperName] = useState('');
  const [editIssueTime, setEditIssueTime] = useState('');
  const [editReturnTime, setEditReturnTime] = useState('');
  const [editStatus, setEditStatus] = useState('');

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
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setIssueTime(timeString);
  }, []);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddToolOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

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
      toast.success('Tool added successfully!');
    } catch (error) {
      toast.error('Failed to add tool: ' + error.message);
    }
  };

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
      setSelectedTool('');
      setSelectedHelper('');
      const now = new Date();
      setIssueTime(now.toTimeString().slice(0, 5));
      toast.success('Tool issued successfully!');
    } catch (error) {
      toast.error('Failed to issue tool: ' + error.message);
    }
  };

  // Mark as Returned
  const handleMarkReturned = async (logId) => {
    const now = new Date();
    const returnTimeString = now.toTimeString().slice(0, 5);
    try {
      await api.tools.returnTool(logId, { returnTime: returnTimeString });
      await fetchData();
      toast.success('Marked as returned!');
    } catch (error) {
      toast.error('Failed to return tool: ' + error.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (log) => {
    setEditingLog(log);
    setEditToolCode(log.toolCode);
    setEditHelperName(log.helperName);
    // Ensure time is in HH:MM format for input type="time"
    const normalizeTime = (t) => {
      if (!t) return '';
      // If already HH:MM, return as-is
      const match = t.match(/^(\d{1,2}):(\d{2})/);
      if (match) return `${match[1].padStart(2,'0')}:${match[2]}`;
      return '';
    };
    setEditIssueTime(normalizeTime(log.issueTime));
    setEditReturnTime(normalizeTime(log.returnTime));
    setEditStatus((log.status || 'ISSUED').toUpperCase());
  };

  // Save Edit
  const handleSaveEdit = async () => {
    try {
      const body = {
        toolCode: editToolCode,
        helperName: editHelperName,
        issueTime: editIssueTime,
        returnTime: editReturnTime || null,
      };
      await api.tools.updateLog(editingLog.id, body);
      await fetchData();
      setEditingLog(null);
      toast.success('Log updated successfully!');
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  // Delete Log
  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      await api.tools.deleteLog(id);
      await fetchData();
      toast.success('Log deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const filteredLogs = toolsLog.filter(log => {
    const matchesSearch = log.toolName.toLowerCase().includes(searchTerm.toLowerCase()) || log.toolCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHelper = filterHelper === '' || log.helperName === filterHelper;
    const matchesStatus = filterStatus === '' || log.status?.toUpperCase() === filterStatus.toUpperCase();
    return matchesSearch && matchesHelper && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const currentRecords = filteredLogs.slice(indexOfFirst, indexOfFirst + recordsPerPage);

  const handleExportPDF = async () => {
    const tableColumn = ["DATE", "TOOL CODE", "TOOL NAME", "HELPER NAME", "OUT TIME", "RETURN TIME", "STATUS"];
    const tableRows = [];
    filteredLogs.forEach(log => {
      tableRows.push([log.date, log.toolCode, log.toolName, log.helperName, formatTime12h(log.issueTime), formatTime12h(log.returnTime) || 'Pending', log.status]);
    });
    await exportToPDF("Tools Tracking Report", tableColumn, tableRows, "tools_log.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredLogs.map(log => ({
      "DATE": log.date,
      "TOOL CODE": log.toolCode,
      "TOOL NAME": log.toolName,
      "HELPER NAME": log.helperName,
      "OUT TIME": formatTime12h(log.issueTime),
      "RETURN TIME": formatTime12h(log.returnTime) || 'Pending',
      "STATUS": log.status
    }));
    exportToExcel(data, "ToolsTracking", "tools_log.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      
      {/* Edit Modal */}
      {editingLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--slate-900)' }}>Edit Tool Log</h2>
              <button onClick={() => setEditingLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-600)', marginBottom: '0.4rem' }}>{t('Select Tool')}</label>
                <select value={editToolCode} onChange={e => setEditToolCode(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>
                  {toolsMaster.map(tool => (
                    <option key={tool.toolCode} value={tool.toolCode}>{tool.toolName} ({tool.toolCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-600)', marginBottom: '0.4rem' }}>{t('Select Helper')}</label>
                <select value={editHelperName} onChange={e => setEditHelperName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>
                  {helpers.map((h, i) => (
                    <option key={i} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editStatus?.toUpperCase() === 'RETURNED' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-600)', marginBottom: '0.4rem' }}>Issue Time</label>
                  <input type="time" value={editIssueTime} onChange={e => setEditIssueTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {editStatus?.toUpperCase() === 'RETURNED' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-600)', marginBottom: '0.4rem' }}>Return Time</label>
                    <input type="time" value={editReturnTime} onChange={e => setEditReturnTime(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setEditingLog(null)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--slate-600)', cursor: 'pointer', fontWeight: '600' }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Tools Tracking')}</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Track borrowed tools and equipment')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Download size={18} /> PDF
          </button>
          <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button onClick={handleOpenAddTool}
            style={{ backgroundColor: 'var(--primary-color)', color: '#ffffff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Plus size={18} /> {t('Add New Tool')}
          </button>
        </div>
      </div>

      {/* Add New Tool Inline Form */}
      {isAddToolOpen && (
        <div style={{ backgroundColor: '#e0f2fe', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '0.5rem' }}>{t('Tool Code')}</label>
            <input type="text" value={newToolCode} onChange={e => setNewToolCode(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none' }} />
          </div>
          <div style={{ flex: '2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '0.5rem' }}>{t('Tool Name')}</label>
            <input type="text" placeholder="e.g. Angle Grinder" value={newToolName} onChange={e => setNewToolName(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #7dd3fc', outline: 'none' }} />
          </div>
          <button onClick={handleAddNewTool} style={{ backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>
            {t('Save Tool')}
          </button>
          <button onClick={() => setIsAddToolOpen(false)} style={{ backgroundColor: 'transparent', color: '#0369a1', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '0.65rem', height: '42px' }}>
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
            <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent' }}>
              <option value="">-- Select Tool --</option>
              {toolsMaster.map(tool => (
                <option key={tool.toolCode} value={tool.toolCode}>{tool.toolName} ({tool.toolCode})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--slate-600)', marginBottom: '0.5rem' }}>{t('Select Helper')}</label>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 0.5rem' }}>
            <Users size={18} color='var(--slate-500)' />
            <select value={selectedHelper} onChange={(e) => setSelectedHelper(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent' }}>
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
            <input type="time" value={issueTime}
              onChange={e => {
                const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                setIssueTime(e.target.value > now ? now : e.target.value);
              }}
              style={{ border: 'none', outline: 'none', padding: '0.65rem', width: '100%', fontSize: '0.95rem' }} />
          </div>
        </div>

        <button onClick={handleIssueTool}
          style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '42px' }}>
          Issue Tool
        </button>
      </div>

      {/* Filters Section */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search tool name or code..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', width: '100%', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
        </div>

        <select value={filterHelper} onChange={(e) => setFilterHelper(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}>
          <option value="">All Helpers</option>
          {helpers.map((h, idx) => (
            <option key={idx} value={h.name}>{h.name}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer' }}>
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
              <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>{t('ACTION / STATUS')}</th>
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
                    {formatTime12h(log.issueTime)}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1rem' }}>
                  {log.returnTime ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {formatTime12h(log.returnTime)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.9rem' }}>Pending...</span>
                  )}
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    {log.status?.toUpperCase() === 'ISSUED' && (
                      <button onClick={() => handleMarkReturned(log.id)}
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                        <CheckCircle size={13} /> Returned
                      </button>
                    )}
                    {log.status?.toUpperCase() === 'RETURNED' && (
                      <span style={{ color: '#10b981', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <CheckCircle size={15} /> Returned
                      </span>
                    )}
                    {log.status?.toUpperCase() === 'ISSUED' && (
                      <button onClick={() => handleOpenEdit(log)}
                        title="Edit"
                        style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Edit size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteLog(log.id)}
                      title="Delete"
                      style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
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
        
        {/* Pagination */}
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem', borderTop: '1px solid #e2e8f0' }}>
          <span>Showing {filteredLogs.length > 0 ? (Math.min(indexOfFirst + recordsPerPage, filteredLogs.length)) - indexOfFirst : 0} of {filteredLogs.length} entries</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
              style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-600)' }}>
              Previous
            </button>
            <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}
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
