import React, { useEffect, useMemo, useRef, useState } from 'react';
import RequiredMark from '../components/RequiredMark';
import { ClipboardList, Download, Edit, Eye, FileSpreadsheet, Hash, Layers, Package, RotateCcw, Search, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import api from '../utils/api';
import { exportToExcel } from '../utils/excelExport';
import { exportToPDF } from '../utils/pdfExport';
import { formatTime12h, t } from '../utils/translator';

const siteClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

const newMovement = () => {
  const parts = Object.fromEntries(siteClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, quantity: '' };
};

const displayQuantity = (quantity, unit) => `${Number(quantity.toPrecision(12))} ${unit}`;
const displayDate = (date) => date.slice(0, 10);
const quantityLimit = quantity => Number(quantity.toPrecision(15));
const historyColumns = ['Date', 'Site Location', 'Item Code', 'Item Name', 'Category (Auto)', 'Quantity Out', 'Actions'];
const returnHasChanged = (entry, original) => entry.itemCode !== original.itemCode || Number(entry.quantity) !== original.quantity ||
  (entry.condition || null) !== original.condition;

const siteOutReportRow = (record, separator) => ({
  'DATE & TIME': `${displayDate(record.date)} ${formatTime12h(record.time)}`.trimEnd(),
  'ITEM CODE': record.itemCode,
  'ITEM NAME': record.itemName,
  'CATEGORY': record.category || '',
  'SITE LOCATION': record.location || record.projectName || '',
  'HANDOVER TO': record.handoverTo || '',
  'QUANTITY OUT': record.quantity,
  'UNIT': record.unit,
  'RETURNS': record.returns.map(entry =>
    `${entry.itemCode} - ${entry.itemName}, ${displayQuantity(entry.quantity, entry.unit)}${entry.condition ? ` (${entry.condition})` : ''}`
  ).join(separator)
});

const getCoverPhoto = (photoData) => {
  const photo = photoData?.trim();
  if (!photo?.startsWith('[')) return photo;
  try {
    return JSON.parse(photo).find(url => typeof url === 'string' && url.trim());
  } catch {
    return undefined;
  }
};

const ItemThumbnail = ({ photoData, itemName }) => {
  const source = getCoverPhoto(photoData);
  const [failedSource, setFailedSource] = useState(null);

  return source && source !== failedSource ? (
    <img className="site-out-item-thumbnail" src={source} alt="" loading="lazy"
      onError={() => setFailedSource(source)} />
  ) : (
    <span className="site-out-item-thumbnail" aria-hidden="true">{itemName?.trim().charAt(0).toUpperCase() || '—'}</span>
  );
};

const SiteOutDetails = ({ record, photoData, onReturn }) => {
  const fields = [
    ['Date', displayDate(record.date)],
    ['Time', formatTime12h(record.time)],
    ['Site Location', record.location],
    ...(record.projectName ? [['Project Name', record.projectName]] : []),
    ['Handover To', record.handoverTo],
    ['Quantity Out', displayQuantity(record.quantity, record.unit)],
    ['Returned', displayQuantity(record.returnedQuantity, record.unit)],
    ['Outstanding', displayQuantity(record.remainingQuantity, record.unit)]
  ];

  return (
    <div className="site-out-details">
      <div className="site-out-item-label">
        <ItemThumbnail photoData={photoData} itemName={record.itemName} />
        <div>
          <strong>{record.itemName}</strong>
          <span className="site-out-secondary">{record.itemCode}</span>
        </div>
      </div>
      <dl className="site-out-detail-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <section className="site-out-detail-returns" aria-labelledby="site-out-return-history-title">
        <h4 id="site-out-return-history-title">{t('Return history')}</h4>
        {record.returns.length > 0 ? (
          <ul>
            {record.returns.map(entry => (
              <li key={entry.id}>
                <strong>{entry.itemCode ?? record.itemCode} — {entry.itemName ?? record.itemName}</strong>
                <span className="site-out-secondary">
                  {displayDate(entry.date)} {formatTime12h(entry.time)} · {displayQuantity(entry.quantity, entry.unit ?? record.unit)}
                  {entry.condition && ` · ${t(entry.condition)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="site-out-secondary">{t('No returns recorded.')}</p>}
      </section>
      <div className="site-out-actions">
        <button type="button" className="btn btn-secondary" onClick={onReturn}>
          <RotateCcw size={16} aria-hidden="true" />{t('Record Return')}
        </button>
      </div>
    </div>
  );
};

const DateTimeFields = ({ prefix, values, onChange, latestDate, earliestDate }) => (
  <>
    <div className="form-group">
      <label className="form-label" htmlFor={`${prefix}-date`}>{t('Date')}<RequiredMark /></label>
      <input id={`${prefix}-date`} className="form-input" type="date" value={values.date}
        min={earliestDate} max={latestDate} onChange={event => onChange('date', event.target.value)} required />
    </div>
    <div className="form-group">
      <label className="form-label" htmlFor={`${prefix}-time`}>{t('Time')}<RequiredMark /></label>
      <input id={`${prefix}-time`} className="form-input" type="time" value={values.time}
        onChange={event => onChange('time', event.target.value)} required />
    </div>
  </>
);

const SiteItemPicker = ({ id = 'site-out-item', label = 'Item Code', placeholder = 'e.g. E-001 (Click to search)',
  items, value, selectedText = value, onSelect, clearable, disabled, required }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const picker = useRef(null);
  const trigger = useRef(null);
  const query = search.trim().toLowerCase();
  const matches = open ? items.filter(item =>
    item.item_code.toLowerCase().includes(query) || item.item_name.toLowerCase().includes(query)
  ) : [];

  useEffect(() => {
    if (!open) return;
    const dismissOutside = event => {
      if (!picker.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = itemCode => {
    onSelect(itemCode);
    close();
  };

  return (
    <div className="form-group site-out-item-picker" ref={picker}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}>
      <label className="form-label" htmlFor={id}>{t(label)}{required && <RequiredMark />}</label>
      <button id={id} ref={trigger} type="button" className="form-input site-out-item-trigger"
        disabled={disabled} aria-expanded={open} aria-controls={open ? `${id}-options` : undefined}
        aria-describedby={`${id}-value`}
        onClick={() => {
          setSearch('');
          setOpen(!open);
        }}>
        <Hash size={18} aria-hidden="true" />
        <span id={`${id}-value`} className={value ? undefined : 'site-out-item-placeholder'}>
          {selectedText || t(placeholder)}
        </span>
      </button>
      {open && (
        <div id={`${id}-options`} className="site-out-item-options">
          <div className="site-out-item-search">
            <input type="search" className="form-input" value={search} autoFocus
              aria-label={t('Search by Item Name or Code...')} placeholder={t('Search by Item Name or Code...')}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} />
          </div>
          <div className="site-out-item-results">
            {clearable && value && (
              <button type="button" className="site-out-item-option" onClick={() => choose('')}>{t('Clear selection')}</button>
            )}
            {matches.map(item => (
              <button key={item.item_code} type="button" className="site-out-item-option"
                aria-pressed={item.item_code === value} onClick={() => choose(item.item_code)}>
                <strong>{item.item_code}</strong>
                <span>{item.item_name}</span>
              </button>
            ))}
            {matches.length === 0 && <p role="status">{t('No matching items found.')}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const ReturnCondition = ({ id, value, onChange, required = true }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={id}>{t('Condition')}{required && <RequiredMark />}</label>
    <select id={id} className="form-input" value={value} onChange={event => onChange(event.target.value)} required={required}>
      <option value="">{t('Select condition')}</option>
      {['Good', 'Average', 'Bad'].map(condition => <option key={condition} value={condition}>{t(condition)}</option>)}
    </select>
  </div>
);

const SiteOut = () => {
  const [dispatch, setDispatch] = useState(() => ({
    ...newMovement(), location: '', itemCode: '', staffId: '', returnedItem: null
  }));
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stockStatus, setStockStatus] = useState('loading');
  const [staffStatus, setStaffStatus] = useState('loading');
  const [history, setHistory] = useState({ records: [], total: 0, totalPages: 0 });
  const [historyStatus, setHistoryStatus] = useState('loading');
  const [historyError, setHistoryError] = useState('');
  const [query, setQuery] = useState({
    search: '', category: '', handover_to: '', dateMode: 'fy', fiscalYear: '', from_date: '', to_date: '', page: 1
  });
  const [refresh, setRefresh] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const formSection = useRef(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [returnValues, setReturnValues] = useState(null);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState('');
  const historyParams = useMemo(() => {
    const { search, category, handover_to, dateMode, fiscalYear, from_date, to_date, page } = query;
    const params = { search, category, handover_to, page };
    if (dateMode === 'range') return { ...params, from_date, to_date };
    if (!fiscalYear) return params;
    return { ...params, from_date: `${fiscalYear}-04-01`, to_date: `${Number(fiscalYear) + 1}-03-31` };
  }, [query]);

  useEffect(() => {
    let active = true;
    setStockStatus('loading');
    api.currentStock.getAll().then(stock => {
      if (!active) return;
      setItems(stock);
      setStockStatus('ready');
    }).catch(() => {
      if (active) setStockStatus('error');
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setStaffStatus('loading');
    api.staff.getAll().then(people => {
      if (!active) return;
      setStaff(people);
      setDispatch(previous => {
        if (!previous.staffId || people.some(person => person.id === previous.staffId)) return previous;
        return { ...previous, staffId: '' };
      });
      setStaffStatus('ready');
    }).catch(() => {
      if (active) setStaffStatus('error');
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setHistoryStatus('loading');
    api.siteOut.getAll(historyParams).then(data => {
      if (!active) return;
      const lastPage = Math.max(1, data.totalPages);
      if (historyParams.page > lastPage) {
        setQuery(previous => ({ ...previous, page: lastPage }));
        return;
      }
      setHistory(data);
      setHistoryStatus('ready');
    }).catch(error => {
      if (!active) return;
      setHistoryError(error.message);
      setHistoryStatus('error');
    });
    return () => { active = false; };
  }, [historyParams, refresh]);

  const updateDispatch = (key, value) => {
    if (edit) {
      setEdit(previous => ({ ...previous, values: { ...previous.values, [key]: value } }));
    } else {
      setDispatch(previous => ({ ...previous, [key]: value }));
    }
  };
  const selectReturnedItem = (itemCode) => setDispatch(previous => {
    if (previous.returnedItem?.itemCode === itemCode) return previous;
    return { ...previous, returnedItem: itemCode ? { itemCode, quantity: '', condition: '' } : null };
  });
  const updateReturnedItem = (key, value) => setDispatch(previous => ({
    ...previous, returnedItem: { ...previous.returnedItem, [key]: value }
  }));
  const updateEditedReturn = (id, key, value) => setEdit(previous => ({
    ...previous,
    returns: previous.returns.map(entry => entry.id === id ? { ...entry, [key]: value } : entry)
  }));
  const updateReturn = (key, value) => setReturnValues(previous => ({ ...previous, [key]: value }));
  const updateFilter = (key, value) => setQuery(previous => ({ ...previous, [key]: value, page: 1 }));
  const reload = () => setRefresh(previous => previous + 1);
  const today = newMovement().date;
  const currentFiscalYear = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 4 ? 1 : 0);
  const categories = [...new Set([
    query.category, ...items.map(item => item.category), ...history.records.map(record => record.category)
  ].filter(Boolean))].sort();
  const handoverNames = [...new Set([
    query.handover_to, ...staff.map(person => person.name), ...history.records.map(record => record.handoverTo)
  ].filter(Boolean))].sort();
  const formValues = edit?.values ?? dispatch;
  const itemsByCode = useMemo(() => new Map(items.map(item => [item.item_code, item])), [items]);
  const selectedItem = itemsByCode.get(formValues.itemCode);
  const previousQuantity = edit?.record.itemCode === formValues.itemCode ? edit.record.quantity : 0;
  const maxQuantity = selectedItem ? Math.max(0, quantityLimit(selectedItem.current_qty + previousQuantity)) : undefined;
  const firstReturn = edit?.record.returns[0];
  const returnedItem = itemsByCode.get(dispatch.returnedItem?.itemCode);
  const recordedHandover = edit && !edit.record.staffId && edit.record.handoverTo;
  const canSelectStaff = staffStatus === 'ready' && (staff.length > 0 || Boolean(recordedHandover));
  const staffPlaceholder = staffStatus === 'loading' ? 'Loading staff and helpers…' :
    staffStatus === 'ready' && staff.length === 0 ? 'No staff or helpers found.' : 'Select staff or helper';
  const loadErrors = [
    stockStatus === 'error' && t('Could not load current stock.'),
    staffStatus === 'error' && t('Could not load staff and helpers.')
  ].filter(Boolean).join(' ');

  const saveDispatch = async (event) => {
    event.preventDefault();
    if (!selectedItem) {
      toast.error(t('Select item'));
      return;
    }
    setSaving(true);
    try {
      if (edit) {
        const updatedReturns = edit.returns.filter((entry, index) => returnHasChanged(entry, edit.record.returns[index]))
          .map(({ id, itemCode, quantity, condition }) => ({ id, itemCode, quantity, condition }));
        await api.siteOut.update(edit.record.id, { ...formValues, returns: updatedReturns });
        setEdit(null);
        toast.success(t('Site Out updated.'));
      } else {
        await api.siteOut.create(formValues);
        setDispatch(previous => ({ ...previous, itemCode: '', quantity: '', returnedItem: null }));
        setQuery(previous => ({ ...previous, page: 1 }));
        toast.success(t('Site Out saved.'));
      }
      reload();
    } catch (error) {
      toast.error(t(error.message));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (record) => {
    setEdit({
      record,
      returns: record.returns.map(entry => ({ ...entry, quantity: String(entry.quantity), condition: entry.condition ?? '' })),
      values: {
        date: displayDate(record.date), time: record.time, quantity: record.quantity,
        itemCode: record.itemCode, location: record.location ?? '',
        staffId: record.staffId ?? (record.handoverTo ? null : '')
      }
    });
    formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formSection.current?.querySelector('h2')?.focus({ preventScroll: true });
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const { records } = await api.siteOut.getAll({ ...historyParams, export: true });
      if (!records.length) {
        toast.error(t('No Site Out records found.'));
        return;
      }
      const rows = records.map(record => siteOutReportRow(record, format === 'pdf' ? '\n' : ' | '));
      if (format === 'pdf') {
        await exportToPDF('Site Out Report', Object.keys(rows[0]), rows.map(Object.values), 'site_out.pdf');
      } else {
        exportToExcel(rows, 'SiteOut', 'site_out.xlsx');
      }
    } catch (error) {
      toast.error(t(error.message));
    } finally {
      setExporting(false);
    }
  };

  const deleteEntry = async (record) => {
    const message = record.returns.length
      ? 'Delete this Site Out entry and its linked returns? Stock will be adjusted.'
      : 'Delete this Site Out entry and restore its stock?';
    if (!window.confirm(t(message))) return;
    setDeletingId(record.id);
    try {
      await api.siteOut.delete(record.id);
      setEdit(previous => previous?.record.id === record.id ? null : previous);
      reload();
      toast.success(t('Site Out deleted.'));
    } catch (error) {
      toast.error(t(error.message));
    } finally {
      setDeletingId(null);
    }
  };

  const openReturn = () => {
    setReturnValues({ ...newMovement(), condition: '' });
    setReturnError('');
  };

  const closeDetails = () => {
    if (returnSaving) return;
    if (returnValues) setReturnValues(null);
    else setViewingRecord(null);
  };

  const saveReturn = async (event) => {
    event.preventDefault();
    setReturnSaving(true);
    setReturnError('');
    try {
      const updated = await api.siteOut.createReturn(viewingRecord.id, returnValues);
      setViewingRecord(updated);
      setReturnValues(null);
      reload();
      toast.success(t('Site return saved.'));
    } catch (error) {
      setReturnError(error.message);
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <div className="site-out-page">
      <h1>{t('Site Out')}</h1>

      <section className="site-out-panel site-out-editor" ref={formSection} aria-labelledby="site-out-form-title">
        <h2 id="site-out-form-title" tabIndex={-1}><Package size={20} aria-hidden="true" />{t(edit ? 'Edit Site Out' : 'Record Site Out')}</h2>
        {loadErrors && (
          <p role="alert">{loadErrors} <button type="button" className="btn btn-secondary" onClick={reload}>{t('Retry')}</button></p>
        )}
        <form className="site-out-dispatch-form" onSubmit={saveDispatch}>
          <div className="site-out-fields">
            <DateTimeFields prefix="site-out" values={formValues} onChange={updateDispatch}
              latestDate={firstReturn ? displayDate(firstReturn.date) : today} />
            <SiteItemPicker items={items} value={formValues.itemCode} onSelect={code => updateDispatch('itemCode', code)} required
              disabled={stockStatus !== 'ready' || saving || Boolean(firstReturn)} />
            <div className="form-group">
              <label className="form-label" htmlFor="site-out-item-name">{t('Item Name (Auto)')}</label>
              <div className="site-out-item-auto">
                <Tag size={18} aria-hidden="true" />
                <input id="site-out-item-name" className="form-input" value={selectedItem?.item_name ?? ''}
                  placeholder={t('Auto-filled item name')} readOnly />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="site-out-item-stock">{t('Current Stock')}</label>
              <div className="site-out-item-auto">
                <Layers size={18} aria-hidden="true" />
                <input id="site-out-item-stock" className="form-input" value={selectedItem ? displayQuantity(selectedItem.current_qty, selectedItem.unit) : ''}
                  placeholder={t('Auto-filled stock quantity')} readOnly />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="site-out-location">{t('Site Location')}<RequiredMark /></label>
              <input id="site-out-location" className="form-input" value={formValues.location} maxLength={200}
                placeholder={t('Enter site location')} onChange={event => updateDispatch('location', event.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="site-out-quantity">{t('Quantity Out')}<RequiredMark /></label>
              <input id="site-out-quantity" className="form-input" type="number"
                min="0" max={maxQuantity} step="any" value={formValues.quantity}
                placeholder={t('Enter dispatch quantity')} onChange={event => updateDispatch('quantity', event.target.value)} required />
              {edit && previousQuantity > 0 && selectedItem && (
                <small className="site-out-secondary">{t('Available for this dispatch')} {displayQuantity(maxQuantity, selectedItem.unit)}</small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="site-out-staff">{t('Handover To')}<RequiredMark /></label>
              <select id="site-out-staff" className="form-input stock-person-select" value={formValues.staffId ?? 'recorded'}
                onChange={event => updateDispatch('staffId', event.target.value === 'recorded' ? null : event.target.value)}
                disabled={!canSelectStaff || saving} required>
                <option value="">{t(staffPlaceholder)}</option>
                {recordedHandover && <option value="recorded">{recordedHandover}</option>}
                {staff.map(person => <option key={person.id} value={person.id}>{person.name}{person.type && ` (${person.type})`}</option>)}
              </select>
            </div>
          </div>
          {!edit && <div className="site-out-fields site-out-return-fields">
            <SiteItemPicker id="site-out-return-item" label="Returned Item (optional)" placeholder="Search returned item"
              items={items} value={dispatch.returnedItem?.itemCode ?? ''}
              selectedText={returnedItem ? `${returnedItem.item_code} — ${returnedItem.item_name}` : dispatch.returnedItem?.itemCode}
              onSelect={selectReturnedItem} disabled={stockStatus !== 'ready' || saving} clearable />
            {dispatch.returnedItem && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="site-out-return-quantity">
                    {t('Return Quantity')}{returnedItem && ` (${returnedItem.unit})`}<RequiredMark />
                  </label>
                  <input id="site-out-return-quantity" className="form-input" type="number" min="0" step="any"
                    value={dispatch.returnedItem.quantity} placeholder={t('Enter return quantity')}
                    onChange={event => updateReturnedItem('quantity', event.target.value)} required />
                </div>
                <ReturnCondition id="site-out-return-condition" value={dispatch.returnedItem.condition}
                  onChange={value => updateReturnedItem('condition', value)} />
              </>
            )}
          </div>}
          {edit?.returns.length > 0 && (
            <section className="site-out-edit-returns" aria-labelledby="site-out-edit-returns-title">
              <h3 id="site-out-edit-returns-title">{t('Return history')}</h3>
              {edit.returns.map((entry, index) => {
                const item = itemsByCode.get(entry.itemCode);
                return (
                  <div className="site-out-fields site-out-edit-return" key={entry.id}>
                    <div>
                      <SiteItemPicker id={`site-out-edit-return-item-${entry.id}`} label="Returned Item" required
                        items={items} value={entry.itemCode} selectedText={`${entry.itemCode} — ${item?.item_name ?? entry.itemName}`}
                        disabled={saving || stockStatus !== 'ready'}
                        onSelect={code => updateEditedReturn(entry.id, 'itemCode', code)} />
                      <span className="site-out-secondary">{displayDate(entry.date)} {formatTime12h(entry.time)}</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`site-out-edit-return-quantity-${entry.id}`}>
                        {t('Return Quantity')} ({item?.unit ?? entry.unit})<RequiredMark />
                      </label>
                      <input id={`site-out-edit-return-quantity-${entry.id}`} className="form-input" type="number"
                        min="0" step="any" value={entry.quantity} placeholder={t('Enter return quantity')}
                        onChange={event => updateEditedReturn(entry.id, 'quantity', event.target.value)} required />
                    </div>
                    <ReturnCondition id={`site-out-edit-return-condition-${entry.id}`} value={entry.condition}
                      required={Boolean(edit.record.returns[index].condition) || returnHasChanged(entry, edit.record.returns[index])}
                      onChange={value => updateEditedReturn(entry.id, 'condition', value)} />
                  </div>
                );
              })}
            </section>
          )}
          <div className="site-out-actions">
            {edit && <button type="button" className="btn btn-secondary" onClick={() => setEdit(null)} disabled={saving}>{t('Cancel')}</button>}
            <button type="submit" className="btn btn-primary" disabled={saving || stockStatus !== 'ready' || !canSelectStaff}>
              {t(saving ? 'Saving…' : edit ? 'Save Changes' : 'Save Site Out')}
            </button>
          </div>
        </form>
      </section>

      <section className="site-out-panel" aria-labelledby="site-out-history-title">
        <h2 id="site-out-history-title"><ClipboardList size={20} aria-hidden="true" />{t('Site Out Records')}
          {historyStatus === 'ready' && <small className="site-out-count">{history.total} {t('records')}</small>}
        </h2>
        <div className="site-out-export-actions">
          <button type="button" className="site-out-export-pdf" onClick={() => exportReport('pdf')}
            disabled={exporting || historyStatus !== 'ready' || !history.total}>
            <Download size={18} aria-hidden="true" /> PDF
          </button>
          <button type="button" className="site-out-export-excel" onClick={() => exportReport('excel')}
            disabled={exporting || historyStatus !== 'ready' || !history.total}>
            <FileSpreadsheet size={18} aria-hidden="true" /> Excel
          </button>
        </div>
        <div className="site-out-search-filters">
          <div className="site-out-search-input">
            <Search size={18} aria-hidden="true" />
            <input id="site-out-search" className="form-input" type="search" aria-label={t('Search')}
              placeholder={t('Search by Item Name or Code...')}
              value={query.search} onChange={event => updateFilter('search', event.target.value)} />
          </div>
          <select className="form-input" aria-label={t('All Categories')} value={query.category}
            onChange={event => updateFilter('category', event.target.value)}>
            <option value="">{t('All Categories')}</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
          <select className="form-input stock-person-select" aria-label={t('All Staff/Helpers')} value={query.handover_to}
            onChange={event => updateFilter('handover_to', event.target.value)}>
            <option value="">{t('All Staff/Helpers')}</option>
            {handoverNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="site-out-date-filters">
          <fieldset>
            <legend className="form-label">{t('Filter Type')}</legend>
            <div className="site-out-date-modes">
              <label>
                <input type="radio" name="site-out-date-mode" value="fy" checked={query.dateMode === 'fy'}
                  onChange={event => updateFilter('dateMode', event.target.value)} />
                {t('Financial Year')}
              </label>
              <label>
                <input type="radio" name="site-out-date-mode" value="range" checked={query.dateMode === 'range'}
                  onChange={event => updateFilter('dateMode', event.target.value)} />
                {t('Date Range')}
              </label>
            </div>
          </fieldset>
          {query.dateMode === 'fy' ? (
            <div className="site-out-fiscal-year">
              <label className="form-label" htmlFor="site-out-fy">{t('Financial Year')}</label>
              <select id="site-out-fy" className="form-input" value={query.fiscalYear}
                onChange={event => updateFilter('fiscalYear', event.target.value)}>
                <option value="">{t('-- Select FY --')}</option>
                {['Current FY', 'Last FY', 'Previous FY'].map((label, index) => {
                  const year = currentFiscalYear - index;
                  return <option key={year} value={year}>{t(label)} ({year}-{String(year + 1).slice(-2)})</option>;
                })}
              </select>
            </div>
          ) : (
            <div className="site-out-date-range">
              <div>
                <label className="form-label" htmlFor="site-out-from">{t('From Date')}</label>
                <input id="site-out-from" className="form-input" type="date" value={query.from_date}
                  max={query.to_date || today} onChange={event => updateFilter('from_date', event.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor="site-out-to">{t('To Date')}</label>
                <input id="site-out-to" className="form-input" type="date" value={query.to_date}
                  min={query.from_date || undefined} max={today} onChange={event => updateFilter('to_date', event.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="site-out-table">
          <table className="premium-table">
            <thead>
              <tr>
                {historyColumns.map(label => (
                  <th key={label} scope="col">
                    {label === 'Category (Auto)' ? <span className="site-out-category-heading">{t(label)}</span> : t(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyStatus === 'loading' && <tr><td colSpan={historyColumns.length} role="status">{t('Loading Site Out records…')}</td></tr>}
              {historyStatus === 'error' && (
                <tr><td colSpan={historyColumns.length}><span role="alert">{t(historyError)}</span> <button type="button" className="btn btn-secondary" onClick={reload}>{t('Retry')}</button></td></tr>
              )}
              {historyStatus === 'ready' && history.records.length === 0 && <tr><td colSpan={historyColumns.length}>{t('No Site Out records found.')}</td></tr>}
              {historyStatus === 'ready' && history.records.map(record => (
                <tr key={record.id}>
                  <td>{displayDate(record.date)}</td>
                  <td>{record.location || record.projectName || '—'}</td>
                  <td>{record.itemCode}</td>
                  <td>
                    <div className="site-out-item-label">
                      <ItemThumbnail photoData={itemsByCode.get(record.itemCode)?.photo_url} itemName={record.itemName} />
                      <strong>{record.itemName}</strong>
                    </div>
                  </td>
                  <td>{record.category ? <span className="site-out-category-badge">{record.category}</span> : '—'}</td>
                  <td>{displayQuantity(record.quantity, record.unit)}</td>
                  <td>
                    <div className="site-out-record-actions">
                      <button type="button" className="btn btn-secondary site-out-action-icon site-out-view"
                        onClick={() => setViewingRecord(record)} aria-label={t('View Site Out details')}
                        title={t('View Site Out details')} disabled={Boolean(deletingId)}>
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="btn btn-secondary site-out-action-icon" onClick={() => openEdit(record)}
                        aria-label={t('Edit Site Out')} title={t('Edit Site Out')} disabled={saving || Boolean(deletingId)}>
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="btn btn-secondary site-out-action-icon site-out-delete" onClick={() => deleteEntry(record)}
                        aria-label={t('Delete Site Out')} title={t('Delete Site Out')} disabled={saving || Boolean(deletingId)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {historyStatus === 'ready' && history.totalPages > 0 && (
          <div className="pagination-container">
            <button type="button" className="pagination-btn" disabled={query.page <= 1}
              onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>{t('Previous')}</button>
            <span>{t('Page')} {query.page} / {history.totalPages}</span>
            <button type="button" className="pagination-btn" disabled={query.page >= history.totalPages}
              onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>{t('Next')}</button>
          </div>
        )}
      </section>

      {viewingRecord && (
        <Modal isOpen onClose={closeDetails} title={t(returnValues ? 'Record Return' : 'Site Out Details')}>
          {returnValues ? (
            <>
              <p>{[viewingRecord.location || viewingRecord.projectName, viewingRecord.itemName].filter(Boolean).join(' · ')}</p>
              <p className="site-out-secondary">{t('Outstanding')} {displayQuantity(viewingRecord.remainingQuantity, viewingRecord.unit)}</p>
              {returnError && <p role="alert" className="auth-error">{t(returnError)}</p>}
              <form onSubmit={saveReturn}>
                <div className="site-out-fields">
                  <DateTimeFields prefix="site-return" values={returnValues} onChange={updateReturn}
                    latestDate={today} earliestDate={displayDate(viewingRecord.date)} />
                  <div className="form-group">
                    <label className="form-label" htmlFor="site-return-quantity">{t('Return Quantity')}<RequiredMark /></label>
                    <input id="site-return-quantity" className="form-input" type="number" min="0" step="any"
                      value={returnValues.quantity} placeholder={t('Enter return quantity')}
                      onChange={event => updateReturn('quantity', event.target.value)} required />
                  </div>
                  <ReturnCondition id="site-return-condition" value={returnValues.condition}
                    onChange={value => updateReturn('condition', value)} />
                </div>
                <div className="site-out-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeDetails} disabled={returnSaving}>{t('Cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={returnSaving}>{returnSaving ? t('Saving…') : t('Save Return')}</button>
                </div>
              </form>
            </>
          ) : (
            <SiteOutDetails record={viewingRecord} photoData={itemsByCode.get(viewingRecord.itemCode)?.photo_url}
              onReturn={openReturn} />
          )}
        </Modal>
      )}
    </div>
  );
};

export default SiteOut;
