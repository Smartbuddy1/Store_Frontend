import React, { useEffect, useRef, useState } from 'react';
import RequiredMark from './RequiredMark';
import { Edit, Plus, Save, Trash2, Truck } from 'lucide-react';
import api from '../utils/api';
import { t } from '../utils/translator';

const SupplierMaster = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const nameInput = useRef(null);

  useEffect(() => {
    let active = true;
    api.suppliers.getAll().then(data => {
      if (active) setSuppliers(data);
    }).catch(err => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setError('');
  };

  const editSupplier = supplier => {
    setEditingId(supplier.id);
    setName(supplier.name);
    setError('');
    nameInput.current?.focus();
  };

  const saveSupplier = async event => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a supplier name of 1 to 150 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = editingId ? await api.suppliers.update(editingId, trimmed) : await api.suppliers.create(trimmed);
      setSuppliers(previous => [...previous.filter(supplier => supplier.id !== saved.id), saved]
        .sort((first, second) => first.name.localeCompare(second.name)));
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async supplier => {
    if (!window.confirm(`${supplier.name}\n\n${t('Delete this supplier? Existing Stock In records will keep the supplier name.')}`)) return;

    setSaving(true);
    setError('');
    try {
      await api.suppliers.delete(supplier.id);
      setSuppliers(previous => previous.filter(entry => entry.id !== supplier.id));
      if (editingId === supplier.id) resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const SaveIcon = editingId ? Save : Plus;

  return (
    <section className="supplier-master" aria-labelledby="supplier-master-title">
      <header className="supplier-master-header">
        <Truck size={20} aria-hidden="true" />
        <h2 id="supplier-master-title">{t('Supplier Master')}</h2>
      </header>
      <div className="supplier-master-body">
        <form className="supplier-master-form" onSubmit={saveSupplier}>
          <div className="form-group">
            <label className="form-label" htmlFor="supplier-master-name">{t('Supplier Name')}<RequiredMark /></label>
            <input id="supplier-master-name" ref={nameInput} className="form-input" value={name} maxLength={150} disabled={saving}
              placeholder={t('Enter supplier name')} onChange={event => setName(event.target.value)} required />
          </div>
          {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>{t('Cancel')}</button>}
          <button type="submit" className="btn btn-primary" disabled={loading || saving}>
            <SaveIcon size={16} aria-hidden="true" /> {t(editingId ? 'Save Changes' : 'Add Supplier')}
          </button>
        </form>
        {error && <p role="alert" className="auth-error">{t(error)}</p>}
        {loading && <p role="status">{t('Loading suppliers…')}</p>}
        {!loading && !error && suppliers.length === 0 && <p>{t('No suppliers added.')}</p>}
        {suppliers.length > 0 && (
          <ul className="supplier-master-list" aria-label={t('Suppliers')}>
            {suppliers.map(supplier => {
              const editLabel = `${t('Edit')} ${supplier.name}`;
              const deleteLabel = `${t('Delete')} ${supplier.name}`;
              return (
                <li key={supplier.id}>
                  <span>{supplier.name}</span>
                  <div className="supplier-master-actions">
                    <button type="button" className="btn btn-secondary supplier-master-edit" title={editLabel} aria-label={editLabel}
                      disabled={saving} onClick={() => editSupplier(supplier)}>
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-secondary supplier-master-delete" title={deleteLabel} aria-label={deleteLabel}
                      disabled={saving} onClick={() => deleteSupplier(supplier)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SupplierMaster;
