import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Users, Shield, Briefcase, Search, FileText, FileSpreadsheet, Download, Edit, X, Package } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';
import { Link } from 'react-router-dom';

const defaultCategories = [
  { name: 'Electrical', prefix: 'EX' },
  { name: 'Mechanical', prefix: 'M' },
  { name: 'Plumbing', prefix: 'P' },
  { name: 'Electronics', prefix: 'E' },
  { name: 'Hardware', prefix: 'H' },
  { name: 'Tools', prefix: 'T' }
];

const defaultStaff = [
  { name: 'Ms. Kaveri Gangurde', type: 'Staff' },
  { name: 'Mr. Suhas Bachhav', type: 'Staff' },
  { name: 'Mr. Harshal Gawali', type: 'Staff' },
  { name: 'Ramesh', type: 'Helper' },
  { name: 'Supplier', type: 'Other' }
];

const Masters = () => {
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);

  // Form states for Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');
  
  // Edit Category State
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrefix, setEditCatPrefix] = useState('');

  // Form states for Staff
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonType, setNewPersonType] = useState('Staff');
  
  // Edit Staff State
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonType, setEditPersonType] = useState('Staff');

  // Search and Pagination States
  const [catSearch, setCatSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [catPage, setCatPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const recordsPerPage = 50;

  // Load from API
  const fetchCategories = async () => {
    try {
      const data = await api.categories.getAll();
      setCategories(data);
    } catch (err) { console.error(err); }
  };

  const fetchStaff = async () => {
    try {
      const data = await api.staff.getAll();
      setStaff(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchCategories();
    fetchStaff();
  }, []);

  const addCategory = async () => {
    if (!newCatName.trim() || !newCatPrefix.trim()) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.categories.create({ name: newCatName.trim(), prefix: newCatPrefix.trim().toUpperCase() });
      await fetchCategories();
      setNewCatName('');
      setNewCatPrefix('');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Step 1/3: Are you sure you want to delete this category?")) {
      if (window.confirm("Step 2/3: This action is permanent. Are you absolutely sure?")) {
        if (window.prompt("Step 3/3: Type 'YES' to confirm deletion") === "YES") {
          try {
            await api.categories.delete(id);
            await fetchCategories();
          } catch (err) { alert('Delete failed: ' + err.message); }
        } else {
          alert("Deletion cancelled.");
        }
      }
    }
  };

  const saveEditCategory = async () => {
    if (!editCatName.trim() || !editCatPrefix.trim()) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.categories.update(editingCatId, {
        name: editCatName.trim(),
        prefix: editCatPrefix.trim().toUpperCase()
      });
      await fetchCategories();
      setEditingCatId(null);
    } catch (err) { alert('Update failed: ' + err.message); }
  };

  const addStaff = async () => {
    if (!newPersonName.trim() || !newPersonType) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.staff.create({ name: newPersonName.trim(), type: newPersonType });
      await fetchStaff();
      setNewPersonName('');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const saveEditStaff = async () => {
    if (!editPersonName.trim() || !editPersonType) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.staff.update(editingStaffId, {
        name: editPersonName.trim(),
        type: editPersonType
      });
      await fetchStaff();
      setEditingStaffId(null);
    } catch (err) { alert('Update failed: ' + err.message); }
  };

  const deleteStaff = async (id) => {
    if (window.confirm("Step 1/3: Are you sure you want to delete this person?")) {
      if (window.confirm("Step 2/3: This action is permanent. Are you absolutely sure?")) {
        if (window.prompt("Step 3/3: Type 'YES' to confirm deletion") === "YES") {
          try {
            await api.staff.delete(id);
            await fetchStaff();
          } catch (err) { alert('Delete failed: ' + err.message); }
        } else {
          alert("Deletion cancelled.");
        }
      }
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase()) || 
    c.prefix.toLowerCase().includes(catSearch.toLowerCase())
  );
  
  const totalCatPages = Math.ceil(filteredCategories.length / recordsPerPage);
  const indexOfFirstCat = (catPage - 1) * recordsPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstCat, indexOfFirstCat + recordsPerPage);

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) || 
    s.type.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const totalStaffPages = Math.ceil(filteredStaff.length / recordsPerPage);
  const indexOfFirstStaff = (staffPage - 1) * recordsPerPage;
  const currentStaff = filteredStaff.slice(indexOfFirstStaff, indexOfFirstStaff + recordsPerPage);

  const handleExportPDF = async () => {
    const tableColumn = ["TYPE", "NAME", "CODE / ROLE"];
    const tableRows = [];
    filteredCategories.forEach(cat => {
      tableRows.push(["Category", cat.name, cat.prefix]);
    });
    filteredStaff.forEach(s => {
      tableRows.push(["Staff/Helper", s.name, s.type]);
    });
    await exportToPDF("Masters Report", tableColumn, tableRows, "masters.pdf");
  };

  const handleExportExcel = () => {
    const data = [];
    filteredCategories.forEach(cat => {
      data.push({
        "TYPE": "Category",
        "NAME": cat.name,
        "CODE / ROLE": cat.prefix
      });
    });
    filteredStaff.forEach(s => {
      data.push({
        "TYPE": "Staff/Helper",
        "NAME": s.name,
        "CODE / ROLE": s.type
      });
    });
    exportToExcel(data, "Masters", "masters.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Masters / Settings')}</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Manage system configurations')}</p>
        </div>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Kits Master Link Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', padding: '1.5rem', backgroundColor: 'var(--surface-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={22} color="#3b82f6" />
              Setting 1: Kits / Packages Master
            </h2>
            <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.95rem' }}>Define reusable sets of items (e.g. 1 Toilet = 1 Pan + 2 Pipes) for fast Site Dispatch.</p>
          </div>
          <Link to="/kits-master" style={{ textDecoration: 'none', backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
            Manage Kits
          </Link>
        </div>

        {/* Categories Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Tag size={20} color="#3b82f6" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: 'var(--slate-900)' }}>Setting 2: Category Master</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Category Name (e.g. Electrical)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 2, padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <input 
                type="text" 
                placeholder="Prefix (e.g. EX)"
                value={newCatPrefix}
                onChange={(e) => setNewCatPrefix(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', textTransform: 'uppercase' }}
              />
              <button 
                onClick={addCategory}
                style={{ backgroundColor: '#3b82f6', color: 'var(--surface-bg)', border: 'none', borderRadius: '6px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {/* Category Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search categories..." 
                value={catSearch}
                onChange={(e) => {
                  setCatSearch(e.target.value);
                  setCatPage(1);
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

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{t('CATEGORY NAME')}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{t('PREFIX CODE')}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{t('ACTION')}</th>
                </tr>
              </thead>
              <tbody>
                {currentCategories.map((cat, i) => {
                  return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--slate-500)' }}>{indexOfFirstCat + i + 1}</td>
                    
                    {editingCatId === cat.id ? (
                      <>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input 
                            type="text" 
                            value={editCatName} 
                            onChange={(e) => setEditCatName(e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input 
                            type="text" 
                            value={editCatPrefix} 
                            onChange={(e) => setEditCatPrefix(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={saveEditCategory} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Save</button>
                            <button onClick={() => setEditingCatId(null)} style={{ background: '#cbd5e1', color: 'var(--slate-800)', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>{cat.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {cat.prefix}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => {
                              setEditingCatId(cat.id);
                              setEditCatName(cat.name);
                              setEditCatPrefix(cat.prefix);
                            }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem' }}>
                              <Edit size={16} />
                            </button>
                            <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )})}
                {currentCategories.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: 'var(--slate-400)' }}>No categories found.</td></tr>}
              </tbody>
            </table>
            
            {/* Category Pagination */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
              <span>Showing {filteredCategories.length > 0 ? (Math.min(indexOfFirstCat + recordsPerPage, filteredCategories.length)) - (indexOfFirstCat) : 0} of {filteredCategories.length} entries</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => setCatPage(prev => Math.max(prev - 1, 1))}
                  disabled={catPage === 1}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: catPage === 1 ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: catPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
                  Previous
                </button>
                <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: 'var(--slate-900)' }}>
                  Page {catPage} of {totalCatPages || 1}
                </span>
                <button
                  onClick={() => setCatPage(prev => Math.min(prev + 1, totalCatPages))}
                  disabled={catPage === totalCatPages || totalCatPages === 0}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: (catPage === totalCatPages || totalCatPages === 0) ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: (catPage === totalCatPages || totalCatPages === 0) ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Staff/Helpers Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={20} color="#10b981" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: 'var(--slate-900)' }}>Setting 3: Staff & Helpers Master</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Full Name..."
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                style={{ flex: 2, padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
              <select
                value={newPersonType}
                onChange={(e) => setNewPersonType(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'var(--surface-bg)' }}
              >
                <option value="Staff">Staff</option>
                <option value="Helper">Helper</option>
                <option value="Other">Other</option>
              </select>
              <button 
                onClick={addStaff}
                style={{ backgroundColor: '#10b981', color: 'var(--surface-bg)', border: 'none', borderRadius: '6px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {/* Staff Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search staff or helpers..." 
                value={staffSearch}
                onChange={(e) => {
                  setStaffSearch(e.target.value);
                  setStaffPage(1);
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

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{t('NAME')}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{t('ROLE')}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{t('ACTION')}</th>
                </tr>
              </thead>
              <tbody>
                {currentStaff.map((person, i) => {
                  return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--slate-500)' }}>{indexOfFirstStaff + i + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>{person.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        backgroundColor: person.type === 'Staff' ? '#dcfce7' : person.type === 'Helper' ? '#fef3c7' : 'var(--slate-100)', 
                        color: person.type === 'Staff' ? '#166534' : person.type === 'Helper' ? '#b45309' : 'var(--slate-600)',
                        padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                      }}>
                        {person.type === 'Staff' ? <Shield size={12} /> : person.type === 'Helper' ? <Briefcase size={12} /> : <Users size={12} />}
                        {person.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          setEditingStaffId(person.id);
                          setEditPersonName(person.name);
                          setEditPersonType(person.type);
                        }}
                        style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button onClick={() => deleteStaff(person.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )})}
                {currentStaff.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: 'var(--slate-400)' }}>No persons found.</td></tr>}
              </tbody>
            </table>
            
            {/* Staff Pagination */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
              <span>Showing {filteredStaff.length > 0 ? (Math.min(indexOfFirstStaff + recordsPerPage, filteredStaff.length)) - (indexOfFirstStaff) : 0} of {filteredStaff.length} entries</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => setStaffPage(prev => Math.max(prev - 1, 1))}
                  disabled={staffPage === 1}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: staffPage === 1 ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: staffPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
                  Previous
                </button>
                <span style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold', color: 'var(--slate-900)' }}>
                  Page {staffPage} of {totalStaffPages || 1}
                </span>
                <button
                  onClick={() => setStaffPage(prev => Math.min(prev + 1, totalStaffPages))}
                  disabled={staffPage === totalStaffPages || totalStaffPages === 0}
                  style={{ padding: '0.35rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: (staffPage === totalStaffPages || totalStaffPages === 0) ? 'var(--slate-50)' : 'var(--surface-bg)', cursor: (staffPage === totalStaffPages || totalStaffPages === 0) ? 'not-allowed' : 'pointer', color: 'var(--slate-500)' }}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Staff Modal */}
      {editingStaffId !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface-bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--slate-900)' }}>Edit Person</h2>
              <button onClick={() => setEditingStaffId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--slate-700)' }}>Name</label>
              <input 
                type="text" 
                value={editPersonName}
                onChange={(e) => setEditPersonName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--slate-700)' }}>Role/Type</label>
              <select
                value={editPersonType}
                onChange={(e) => setEditPersonType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'var(--surface-bg)' }}
              >
                <option value="Staff">Staff</option>
                <option value="Helper">Helper</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setEditingStaffId(null)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'var(--surface-bg)', fontWeight: 'bold', cursor: 'pointer', color: 'var(--slate-700)' }}
              >
                Cancel
              </button>
              <button 
                onClick={saveEditStaff}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Masters;
