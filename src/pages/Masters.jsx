import React, { useState, useEffect } from 'react';
import RequiredMark, { RequiredField } from '../components/RequiredMark';
import { Plus, Trash2, Tag, Users, Shield, Briefcase, Search, FileText, FileSpreadsheet, Download, Edit, X, Package, Scale } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t } from '../utils/translator';
import api from '../utils/api';
import Modal from '../components/Modal';
import SupplierMaster from '../components/SupplierMaster';
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
  const [roles, setRoles] = useState([]);
  const roleNames = roles.map(role => role.name);
  const [units, setUnits] = useState([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [roleDraft, setRoleDraft] = useState({ id: null, name: '' });
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [replacementRoleId, setReplacementRoleId] = useState('');
  const [roleError, setRoleError] = useState('');
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [savingRole, setSavingRole] = useState(false);

  // Edit Unit State
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Form states for Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');

  // Edit Category State
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrefix, setEditCatPrefix] = useState('');

  // Form states for Staff
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonType, setNewPersonType] = useState('');

  // Edit Staff State
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonType, setEditPersonType] = useState('');
  const currentEditType = staff.find(person => person.id === editingStaffId)?.type || '';

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

  const fetchRoles = async () => {
    setLoadingRoles(true);
    setRoleError('');
    try {
      setRoles(await api.staff.getRoles());
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.units.getAll();
      const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      setUnits(list);
    } catch (err) {
      console.error('Failed to fetch units:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStaff();
    fetchRoles();
    fetchUnits();
  }, []);

  const resetRoleDraft = () => {
    setRoleDraft({ id: null, name: '' });
    setRoleError('');
  };

  const openRoleManager = () => {
    resetRoleDraft();
    setRoleToDelete(null);
    setShowRoleManager(true);
    fetchRoles();
  };

  const closeRoleManager = () => {
    if (!savingRole) setShowRoleManager(false);
  };

  const updateRoleAssignments = (previous, next) => {
    setStaff(people => people.map(person => person.type === previous ? { ...person, type: next } : person));
    setNewPersonType(value => value === previous ? next : value);
    setEditPersonType(value => value === previous ? next : value);
  };

  const saveRole = async (event) => {
    event.preventDefault();
    const name = roleDraft.name.trim();
    if (!name) {
      setRoleError(t('Please enter a role name.'));
      return;
    }
    setSavingRole(true);
    setRoleError('');
    try {
      const previous = roles.find(role => role.id === roleDraft.id);
      if (roleDraft.id) {
        const saved = await api.staff.updateRole(roleDraft.id, name);
        setRoles(list => list.map(role => role.id === saved.id ? saved : role));
        updateRoleAssignments(previous?.name, saved.name);
        await Promise.all([fetchRoles(), fetchStaff()]);
      } else {
        const saved = await api.staff.createRole(name);
        setRoles(list => [...list, saved]);
        await fetchRoles();
      }
      setRoleDraft({ id: null, name: '' });
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  const startRoleDeletion = (role) => {
    setRoleToDelete(role);
    setReplacementRoleId('');
    setRoleError('');
  };

  const deleteRole = async (event) => {
    event.preventDefault();
    setSavingRole(true);
    setRoleError('');
    try {
      const removed = await api.staff.deleteRole(roleToDelete.id, replacementRoleId || null);
      setRoles(list => list.filter(role => role.id !== removed.id));
      updateRoleAssignments(removed.name, removed.replacement);
      setRoleToDelete(null);
      if (roleDraft.id === removed.id) setRoleDraft({ id: null, name: '' });
      await Promise.all([fetchRoles(), fetchStaff()]);
    } catch (err) {
      setRoleError(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  const addUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) {
      alert(t('Please enter a unit name.'));
      return;
    }
    if (units.some(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(t('This unit already exists!'));
      return;
    }
    try {
      await api.units.create({ name: trimmed });
      await fetchUnits();
      setNewUnitName('');
    } catch (err) {
      alert('Failed to add unit: ' + err.message);
    }
  };

  const deleteUnit = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete unit "${name}"?`)) {
      try {
        await api.units.delete(id);
        await fetchUnits();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const handleOpenEditUnit = (unit) => {
    setEditingUnitId(unit.id);
    setEditUnitName(unit.name);
  };

  const saveEditUnit = async () => {
    const trimmed = editUnitName.trim();
    if (!trimmed) {
      alert(t('Please enter a unit name.'));
      return;
    }
    const duplicate = units.some(u => u.id !== editingUnitId && u.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      alert(t('This unit already exists!'));
      return;
    }

    setIsSavingUnit(true);
    try {
      await api.units.update(editingUnitId, { name: trimmed });
      await fetchUnits();
      setEditingUnitId(null);
      setEditUnitName('');
    } catch (err) {
      alert('Failed to update unit: ' + err.message);
    } finally {
      setIsSavingUnit(false);
    }
  };

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
      setNewPersonType('');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const saveEditStaff = async () => {
    if (!editPersonName.trim() || (currentEditType && !editPersonType)) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }
    try {
      await api.staff.update(editingStaffId, {
        name: editPersonName.trim(),
        ...(editPersonType && { type: editPersonType })
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
              <RequiredField style={{ flex: 2 }}>
                <input
                  type="text"
                  placeholder="Category Name (e.g. Electrical)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </RequiredField>
              <RequiredField style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Prefix (e.g. EX)"
                  value={newCatPrefix}
                  onChange={(e) => setNewCatPrefix(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', textTransform: 'uppercase' }}
                />
              </RequiredField>
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
                            <RequiredField>
                              <input
                                type="text"
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                            </RequiredField>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <RequiredField>
                              <input
                                type="text"
                                value={editCatPrefix}
                                onChange={(e) => setEditCatPrefix(e.target.value.toUpperCase())}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                            </RequiredField>
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
                  )
                })}
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
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>
              <RequiredField style={{ flex: 2 }}>
                <input
                  type="text"
                  placeholder="Full Name..."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </RequiredField>
              <RequiredField style={{ flex: 1 }}>
                <select
                  aria-label={t('Select a role')}
                  value={newPersonType}
                  onChange={(e) => setNewPersonType(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'var(--surface-bg)' }}
                >
                  <option value="" disabled>{t('Select a role')}</option>
                  {roleNames.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </RequiredField>
              <button
                type="button"
                onClick={openRoleManager}
                title="Manage Staff Roles"
                style={{
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={16} /> Roles
              </button>
              <button
                onClick={addStaff}
                style={{ backgroundColor: '#10b981', color: 'var(--surface-bg)', border: 'none', borderRadius: '6px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
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
                          backgroundColor: person.type === 'Staff' ? '#dcfce7' : person.type === 'Helper' ? '#fef3c7' : '#e0f2fe',
                          color: person.type === 'Staff' ? '#166534' : person.type === 'Helper' ? '#b45309' : '#0369a1',
                          padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem',
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          {person.type === 'Staff' ? <Shield size={12} /> : person.type === 'Helper' ? <Briefcase size={12} /> : <Users size={12} />}
                          {person.type || t('Unassigned')}
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
                  )
                })}
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

        {/* Setting 4: Units Master Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Scale size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: 'var(--slate-900)' }}>Setting 4: Units Master</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <RequiredField style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Unit Name (e.g. Mtr, Box, Pcs, Roll)..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addUnit(); }}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </RequiredField>
              <button
                onClick={addUnit}
                style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {/* Unit Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search units..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
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

            {/* Units Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '60px' }}>#</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{t('UNIT NAME')}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '100px' }}>{t('ACTION')}</th>
                </tr>
              </thead>
              <tbody>
                {units
                  .filter(u => (u.name || '').toLowerCase().includes(unitSearch.toLowerCase()))
                  .map((u, i) => (
                    <tr key={u.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--slate-500)' }}>{i + 1}</td>
                      {editingUnitId === u.id ? (
                        <>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <RequiredField>
                              <input
                                type="text"
                                value={editUnitName}
                                onChange={(e) => setEditUnitName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditUnit();
                                  if (e.key === 'Escape') setEditingUnitId(null);
                                }}
                                autoFocus
                                style={{ width: '100%', maxWidth: '250px', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
                              />
                            </RequiredField>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={saveEditUnit}
                                disabled={isSavingUnit}
                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: isSavingUnit ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                {isSavingUnit ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingUnitId(null)}
                                style={{ background: '#cbd5e1', color: 'var(--slate-800)', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--slate-700)' }}>
                            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                              {u.name}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                onClick={() => handleOpenEditUnit(u)}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem' }}
                                title="Edit Unit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteUnit(u.id, u.name)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                title="Delete Unit"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                {units.filter(u => (u.name || '').toLowerCase().includes(unitSearch.toLowerCase())).length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--slate-400)' }}>
                      No units found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <SupplierMaster />
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--slate-700)' }}>Name<RequiredMark /></label>
              <input
                type="text"
                value={editPersonName}
                onChange={(e) => setEditPersonName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label htmlFor="staff-edit-role" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', color: 'var(--slate-700)' }}>Role/Type{currentEditType && <RequiredMark />}</label>
              <select
                id="staff-edit-role"
                value={editPersonType}
                onChange={(e) => setEditPersonType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'var(--surface-bg)' }}
              >
                <option value="" disabled={Boolean(currentEditType)}>{t(currentEditType ? 'Select a role' : 'Unassigned')}</option>
                {currentEditType && !roleNames.includes(currentEditType) && <option value={currentEditType}>{currentEditType}</option>}
                {roleNames.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
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

      <Modal isOpen={showRoleManager} onClose={closeRoleManager} title="Manage Staff Roles">
        {roleToDelete ? (
          <form className="staff-role-form" onSubmit={deleteRole}>
            <h4>{t('Delete role')} “{roleToDelete.name}”?</h4>
            <p>{t('Choose a replacement for assigned staff or leave them unassigned.')}</p>
            <label className="form-label" htmlFor="staff-role-replacement">{t('Replacement role')}</label>
            <select id="staff-role-replacement" className="form-input" value={replacementRoleId}
              onChange={event => setReplacementRoleId(event.target.value)} disabled={savingRole}>
              <option value="">{t('Leave unassigned')}</option>
              {roles.filter(role => role.id !== roleToDelete.id).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <div className="staff-role-actions">
              <button type="button" className="btn btn-secondary" disabled={savingRole}
                onClick={() => { setRoleToDelete(null); setRoleError(''); }}>{t('Cancel')}</button>
              <button type="submit" className="btn btn-secondary staff-role-delete" disabled={savingRole}>
                <Trash2 size={16} aria-hidden="true" /> {t('Delete role')}
              </button>
            </div>
          </form>
        ) : (
          <form className="staff-role-form" onSubmit={saveRole}>
            <label className="form-label" htmlFor="staff-role-name">Role Name<RequiredMark /></label>
            <input id="staff-role-name" className="form-input" type="text" placeholder="e.g. Site Supervisor"
              maxLength={100} value={roleDraft.name} disabled={savingRole} autoFocus
              onChange={event => setRoleDraft({ ...roleDraft, name: event.target.value })} />
            <div className="staff-role-actions">
              {roleDraft.id && <button type="button" className="btn btn-secondary" onClick={resetRoleDraft} disabled={savingRole}>Cancel edit</button>}
              <button type="submit" className="btn btn-primary" disabled={savingRole}>
                {roleDraft.id ? 'Save Changes' : 'Add Role'}
              </button>
            </div>
          </form>
        )}

        {roleError && <p className="staff-role-error" role="alert">{roleError}</p>}
        {loadingRoles ? (
          <p role="status">Loading roles…</p>
        ) : roles.length === 0 ? (
          <p>{t('No roles added.')}</p>
        ) : (
          <div className="staff-role-list">
            <table className="premium-table">
              <thead><tr><th scope="col">Role</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {roles.map(role => {
                  const editLabel = `Edit ${role.name}`;
                  const deleteLabel = `Delete ${role.name}`;
                  return (
                    <tr key={role.id}>
                      <td>{role.name}</td>
                      <td>
                        <div className="staff-role-actions">
                          <button type="button" className="btn btn-secondary" title={editLabel} aria-label={editLabel}
                            disabled={savingRole} onClick={() => { setRoleToDelete(null); setRoleDraft(role); setRoleError(''); }}>
                            <Edit size={16} aria-hidden="true" />
                          </button>
                          <button type="button" className="btn btn-secondary staff-role-delete" title={deleteLabel} aria-label={deleteLabel}
                            disabled={savingRole} onClick={() => startRoleDeletion(role)}>
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Masters;
