import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit, Save, X, Search } from 'lucide-react';
import api from '../utils/api';

const KitsMaster = () => {
  const [lang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = (text) => text; // Implement actual translations if needed

  const [kits, setKits] = useState([]);
  const [items, setItems] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState(null);
  
  const [kitName, setKitName] = useState('');
  const [description, setDescription] = useState('');
  const [kitItems, setKitItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitsRes, itemsRes] = await Promise.all([
        api.kits.getAll(),
        api.items.getAll()
      ]);
      setKits(kitsRes || []);
      setItems(itemsRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingKitId(null);
    setKitName('');
    setDescription('');
    setKitItems([]);
    setIsModalOpen(true);
  };

  const openEditModal = (kit) => {
    setEditingKitId(kit.id);
    setKitName(kit.kitName);
    setDescription(kit.description || '');
    setKitItems(kit.kitItems.map(ki => ({
      itemCode: ki.itemCode,
      itemName: ki.item?.itemName || '',
      quantity: ki.quantity,
      unit: ki.unit || ki.item?.unit || '',
      baseUnit: ki.item?.unit || ''
    })));
    setIsModalOpen(true);
  };

  const addKitItemRow = () => {
    setKitItems([...kitItems, { itemCode: '', quantity: 1, unit: '', baseUnit: '' }]);
  };

  const updateKitItem = (index, field, value) => {
    const updated = [...kitItems];
    updated[index][field] = value;
    
    // Auto-fill item name and units if itemCode changes
    if (field === 'itemCode') {
      const foundItem = items.find(it => it.itemCode === value);
      if (foundItem) {
        updated[index].itemName = foundItem.itemName;
        updated[index].baseUnit = foundItem.unit;
        updated[index].unit = foundItem.unit; // Default to base unit
      } else {
        updated[index].itemName = '';
        updated[index].baseUnit = '';
        updated[index].unit = '';
      }
    }
    
    setKitItems(updated);
  };

  const removeKitItem = (index) => {
    const updated = [...kitItems];
    updated.splice(index, 1);
    setKitItems(updated);
  };

  const handleSaveKit = async () => {
    if (!kitName.trim()) {
      alert('Kit name is required.');
      return;
    }
    if (kitItems.length === 0) {
      alert('Add at least one item to the kit.');
      return;
    }
    // Validate items
    for (let i=0; i<kitItems.length; i++) {
      if (!kitItems[i].itemCode || kitItems[i].quantity <= 0) {
        alert('Please provide valid item code and quantity for all items.');
        return;
      }
    }

    try {
      const body = { kitName, description, items: kitItems };
      if (editingKitId) {
        await api.kits.update(editingKitId, body);
        alert('Kit updated successfully!');
      } else {
        await api.kits.create(body);
        alert('Kit created successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save kit: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this kit?')) {
      try {
        await api.kits.delete(id);
        fetchData();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>Kits / Packages Master</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Define reusable sets of items for bulk dispatch</p>
        </div>
        <button onClick={openAddModal} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <Plus size={18} /> Add New Kit
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {kits.map(kit => (
          <div key={kit.id} style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontWeight: 'bold', color: 'var(--slate-900)' }}>{kit.kitName}</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => openEditModal(kit)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(kit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--slate-500)', fontSize: '0.875rem' }}>{kit.description || 'No description provided.'}</p>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--slate-400)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>Item</th>
                    <th style={{ textAlign: 'right', paddingBottom: '0.5rem' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {kit.kitItems.map((ki, i) => (
                    <tr key={i} style={{ borderBottom: i !== kit.kitItems.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--slate-700)' }}>{ki.item.itemName}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--slate-900)' }}>{ki.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        {kits.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--slate-400)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
            No kits defined yet. Click "Add New Kit" to get started.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{editingKitId ? 'Edit Kit' : 'Create New Kit'}</h2>
            
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Kit Name</label>
                <input type="text" value={kitName} onChange={e => setKitName(e.target.value)} placeholder="e.g. Toilet Assembly" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description (Optional)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Includes pan, pipe, and cement" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 'bold' }}>Kit Items</h3>
              <button onClick={addKitItemRow} style={{ backgroundColor: 'var(--slate-100)', color: '#3b82f6', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Add Item
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--slate-50)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Item Code / Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '220px' }}>Quantity</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {kitItems.map((ki, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                      <input 
                        type="text" 
                        list="item-codes"
                        value={ki.itemCode}
                        onChange={e => updateKitItem(i, 'itemCode', e.target.value)}
                        placeholder="Type Code or Name..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                      {ki.itemName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                          {ki.itemName}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          min="0.01" 
                          step="0.01"
                          value={ki.quantity}
                          onChange={e => updateKitItem(i, 'quantity', e.target.value)}
                          style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        />
                        {(ki.baseUnit?.toLowerCase() === 'ltr' || ki.baseUnit?.toLowerCase() === 'ltrs' || ki.baseUnit?.toLowerCase() === 'ml') ? (
                          <select 
                            value={ki.unit || 'Ltrs'}
                            onChange={e => updateKitItem(i, 'unit', e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                          >
                            <option value="Ltrs">Ltrs</option>
                            <option value="ml">ml</option>
                          </select>
                        ) : (ki.baseUnit?.toLowerCase() === 'kg' || ki.baseUnit?.toLowerCase() === 'kgs' || ki.baseUnit?.toLowerCase() === 'gms') ? (
                          <select 
                            value={ki.unit || 'Kgs'}
                            onChange={e => updateKitItem(i, 'unit', e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                          >
                            <option value="Kgs">Kgs</option>
                            <option value="gms">gms</option>
                          </select>
                        ) : (
                          <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>{ki.unit || ki.baseUnit || '-'}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                      <button onClick={() => removeKitItem(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {kitItems.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      Click "Add Item" to start adding items to this kit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <datalist id="item-codes">
              {items.map(item => (
                <option key={item.itemCode} value={item.itemCode}>{item.itemName}</option>
              ))}
            </datalist>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancel
              </button>
              <button onClick={handleSaveKit} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                Save Kit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitsMaster;
