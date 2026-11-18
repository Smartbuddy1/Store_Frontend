import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, Hash, Tag, Layers, ArrowUpDown, Save, X, FileText, FileSpreadsheet, Edit, Trash2, Eye, Download, Camera, Image } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';
import { t, formatTime12h } from '../utils/translator';
import api from '../utils/api';
import toast from 'react-hot-toast';
const StockIn = () => {

  const parsePhotos = (photoStr) => {
    if (!photoStr) return [];
    if (photoStr.startsWith('[')) {
      try { return JSON.parse(photoStr); } catch (e) { return [photoStr]; }
    }
    return [photoStr];
  };
  const [stockEntries, setStockEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [photoSlideIndex, setPhotoSlideIndex] = useState(0);

  // Helper to extract cover photo if it's a JSON array (multiple photos)
  const getCoverPhoto = (photoData) => {
    if (!photoData) return null;
    try {
      const parsed = JSON.parse(photoData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {
      return photoData; // Not JSON, assume raw string
    }
    return null;
  };

  const getAllPhotos = (photoData) => {
    if (!photoData) return [];
    try {
      const parsed = JSON.parse(photoData);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [photoData];
    }
    return [];
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const [staffList, setStaffList] = useState([]);
  const [itemsMaster, setItemsMaster] = useState({});

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // New Filters
  const [filterType, setFilterType] = useState('fy'); // 'fy' or 'dateRange'
  const [selectedFY, setSelectedFY] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getFinancialYears = () => {

    const parsePhotos = (photoStr) => {
      if (!photoStr) return [];
      if (photoStr.startsWith('[')) {
        try { return JSON.parse(photoStr); } catch (e) { return [photoStr]; }
      }
      return [photoStr];
    };
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    return [
      `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
      `${fyStartYear - 1}-${(fyStartYear).toString().slice(-2)}`,
      `${fyStartYear - 2}-${(fyStartYear - 1).toString().slice(-2)}`
    ];
  };

  const getDatesForFY = (fyString) => {
    if (!fyString) return null;
    const startYear = parseInt(fyString.split('-')[0], 10);
    return {
      start: `${startYear}-04-01`,
      end: `${startYear + 1}-03-31`
    };
  };

  const fetchMasters = async () => {
    try {
      const [staff, items, cats, unitsData] = await Promise.all([
        api.staff.getAll(),
        api.items.getAll(),
        api.categories.getAll(),
        api.units.getAll()
      ]);
      const itemMap = {};
      items.forEach(item => {
        itemMap[item.itemCode] = { name: item.itemName, category: item.categoryName, unit: item.unit };
      });
      setItemsMaster(itemMap);
      setStaffList(staff);
      if (Array.isArray(cats)) {
        setCategoriesList(cats);
      }
      const rawUnits = Array.isArray(unitsData) ? unitsData : (unitsData && Array.isArray(unitsData.data) ? unitsData.data : []);
      if (rawUnits.length > 0) {
        const uNames = rawUnits.map(u => (typeof u === 'string' ? u : u.name));
        setUnitsList(Array.from(new Set(['Nos', 'Kgs', 'Ltr', ...uNames])));
      }
    } catch (err) { console.error('Failed to fetch masters:', err); }
  };

  const buildQueryParams = () => {

    const parsePhotos = (photoStr) => {
      if (!photoStr) return [];
      if (photoStr.startsWith('[')) {
        try { return JSON.parse(photoStr); } catch (e) { return [photoStr]; }
      }
      return [photoStr];
    };
    let params = { page: currentPage, limit: 50, search: searchQuery, category: selectedCategory, source: selectedSource };
    if (filterType === 'fy' && selectedFY) {
      const fyDates = getDatesForFY(selectedFY);
      if (fyDates) { params.from_date = fyDates.start; params.to_date = fyDates.end; }
    } else if (filterType === 'dateRange') {
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
    }
    return params;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = buildQueryParams();
      const response = await api.stockIn.getAllPaginated(params);
      const mappedEntries = (response.records || []).map(entry => ({
        id: entry.id,
        date: new Date(entry.date).toISOString().split('T')[0],
        time: entry.time,
        itemCode: entry.itemCode,
        itemName: entry.itemName,
        category: entry.category,
        quantity: entry.quantity,
        source: entry.source,
        unit: itemsMaster[entry.itemCode]?.unit || 'Nos',
        photoUrl: entry.photoUrl
      }));
      setStockEntries(mappedEntries);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalRecords(response.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []);

  useEffect(() => {
    if (Object.keys(itemsMaster).length > 0) { fetchData(); }
  }, [currentPage, searchQuery, selectedCategory, selectedSource, filterType, selectedFY, fromDate, toDate, itemsMaster]);


  // Form State
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newSource, setNewSource] = useState(localStorage.getItem('lastReceivedFrom') || 'mr. suhas bachhav');
  const [newSubUnit, setNewSubUnit] = useState('Nos');
  const [editingId, setEditingId] = useState(null);

  // Custom Dropdown State
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Add Item to Item Master Modal State
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addModalItemName, setAddModalItemName] = useState('');
  const [addModalCategory, setAddModalCategory] = useState('');
  const [addModalUnit, setAddModalUnit] = useState('Nos');
  const [addModalMinStock, setAddModalMinStock] = useState('5');
  const [addModalPhotos, setAddModalPhotos] = useState([]);
  const [showAddModalPhotoDropdown, setShowAddModalPhotoDropdown] = useState(false);
  const [isSavingMasterItem, setIsSavingMasterItem] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [unitsList, setUnitsList] = useState(['Nos', 'Kgs', 'Ltr']);

  const addModalCameraRef = React.useRef(null);
  const addModalGalleryRef = React.useRef(null);

  const handleOpenAddItemModal = (initialName = '') => {
    setShowItemDropdown(false);
    setAddModalItemName(initialName || '');
    setAddModalCategory('');
    setAddModalUnit('Nos');
    setAddModalMinStock('5');
    setAddModalPhotos([]);
    setShowAddModalPhotoDropdown(false);
    setIsAddItemModalOpen(true);
  };

  const handleAddModalPhotoUpload = (e) => {
    const file = e.target.files[0];
    setShowAddModalPhotoDropdown(false);
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('Image size should be less than 5MB'));
        return;
      }
      if (addModalPhotos.length >= 4) {
        toast.error(t('Maximum 4 photos allowed'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddModalPhotos(prev => [...prev, reader.result]);
        toast.success(t('Photo selected'));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const removeAddModalPhoto = (index) => {
    setAddModalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMasterItem = async () => {
    if (!addModalItemName?.trim() || !addModalCategory || !addModalUnit || addModalMinStock === '' || addModalMinStock === null || addModalMinStock === undefined) {
      alert(t(`Please fill all mandatory fields. (Missing: ${!addModalItemName?.trim() ? 'Name ' : ''}${!addModalCategory ? 'Category ' : ''}${!addModalUnit ? 'Unit ' : ''}${addModalMinStock === '' || addModalMinStock == null ? 'MinStock' : ''})`));
      return;
    }

    const toastId = toast.loading('Saving item to Item Master...');
    setIsSavingMasterItem(true);
    try {
      const createdItem = await api.items.create({
        item_name: addModalItemName.trim(),
        category: addModalCategory,
        unit: addModalUnit || 'Nos',
        minimum_stock: parseInt(addModalMinStock) || 5,
        photo_url: addModalPhotos.length > 0 ? JSON.stringify(addModalPhotos) : null
      });

      await fetchMasters();

      if (createdItem && createdItem.itemCode) {
        setNewItemCode(createdItem.itemCode);
        setNewItemName(createdItem.itemName || addModalItemName.trim());
        setNewCategory(createdItem.categoryName || addModalCategory);
        setNewSubUnit(createdItem.unit || addModalUnit || 'Nos');
      }

      setIsAddItemModalOpen(false);
      setAddModalItemName('');
      setAddModalCategory('');
      setAddModalUnit('Nos');
      setAddModalMinStock('5');
      setAddModalPhotos([]);
      setItemSearchTerm('');

      toast.dismiss(toastId);
      toast.success(t('Item saved to Item Master and selected!'));
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSavingMasterItem(false);
    }
  };

  // Auto-fill logic when Item Code changes
  const handleItemCodeChange = (e) => {
    const code = e.target.value.toUpperCase();
    setNewItemCode(code);

    // Auto-populate item name and category if code exists in master data
    if (itemsMaster[code]) {
      setNewItemName(itemsMaster[code].name);
      setNewCategory(itemsMaster[code].category);
      setNewSubUnit(itemsMaster[code].unit || 'Nos');
    } else {
      setNewItemName('');
      setNewCategory('');
      setNewSubUnit('Nos');
    }
  };

  const handleSaveStock = async () => {
    if (!newDate || !newItemCode || !newItemName || !newCategory || !newQuantity || !newSource) {
      alert(t('Please fill all mandatory fields.'));
      return;
    }

    try {
      let finalQty = parseFloat(newQuantity);
      if (newSubUnit === 'ml' || newSubUnit === 'gms') {
        finalQty = finalQty / 1000;
      }

      if (editingId) {
        await api.stockIn.update(editingId, {
          date: newDate,
          time: newTime,
          item_code: newItemCode,
          item_name: newItemName,
          category: newCategory,
          quantity: finalQty,
          source: newSource
        });
      } else {
        await api.stockIn.create({
          date: newDate,
          time: newTime,
          item_code: newItemCode,
          item_name: newItemName,
          category: newCategory,
          quantity: finalQty,
          source: newSource
        });
        setCurrentPage(1);
      }

      await fetchData();

      // Reset form fields
      setEditingId(null);
      setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setNewItemCode('');
      setNewItemName('');
      setNewCategory('');
      setNewQuantity('');

      localStorage.setItem('lastReceivedFrom', newSource);

      setIsModalOpen(false);
      toast.success('Successfully Stocked In!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handleEditStock = (entry) => {
    setEditingId(entry.id);
    setNewDate(entry.date);
    setNewTime(entry.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setNewItemCode(entry.itemCode);
    setNewItemName(entry.itemName);
    setNewCategory(entry.category);
    setNewQuantity(entry.quantity.toString());
    setNewSource(entry.source);
    setIsModalOpen(true);
  };

  const handleDeleteStock = async (id) => {
    if (window.confirm("Are you sure you want to delete this stock entry?")) {
      try {
        await api.stockIn.delete(id);
        await fetchData();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const handleOpenModal = () => {

    const parsePhotos = (photoStr) => {
      if (!photoStr) return [];
      if (photoStr.startsWith('[')) {
        try { return JSON.parse(photoStr); } catch (e) { return [photoStr]; }
      }
      return [photoStr];
    };
    setEditingId(null);
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setNewItemCode('');
    setNewItemName('');
    setNewCategory('');
    setNewQuantity('');
    setNewSource('Supplier');
    setIsModalOpen(true);
  };

  const formRef = React.useRef(null);

  useEffect(() => {
    if (location.state?.openAddModal) {
      handleOpenModal();
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  const fetchAllFilteredData = async () => {
    const params = buildQueryParams();
    delete params.page;
    delete params.limit;
    const entries = await api.stockIn.getAll(params);
    return entries.map(entry => ({
      ...entry,
      date: new Date(entry.date).toISOString().split('T')[0],
      unit: itemsMaster[entry.itemCode]?.unit || 'Nos'
    }));
  };

  const handleExportPDF = async () => {
    const data = await fetchAllFilteredData();
    const tableColumn = ["DATE & TIME", "ITEM CODE", "ITEM NAME", "CATEGORY", "SOURCE", "QUANTITY"];
    const tableRows = [];
    data.forEach(item => {
      tableRows.push([`${item.date} ${item.time || ''}`, item.itemCode, item.itemName, item.category, item.source, item.quantity]);
    });
    await exportToPDF("Stock In Report", tableColumn, tableRows, "stock_in.pdf");
  };

  const handleExportExcel = async () => {
    const data = await fetchAllFilteredData();
    const excelData = data.map(item => ({
      "DATE & TIME": `${item.date} ${item.time || ''}`,
      "ITEM CODE": item.itemCode,
      "ITEM NAME": item.itemName,
      "CATEGORY": item.category,
      "SOURCE": item.source,
      "QUANTITY": item.quantity
    }));
    exportToExcel(excelData, "StockIn", "stock_in.xlsx");
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--surface-bg)', minHeight: '100%' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Stock In')}</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>{t('Record incoming inventory')}</p>
        </div>
      </div>

      {/* Inline Form Section (Add New) */}
      <div ref={formRef} style={{
        backgroundColor: 'var(--surface-bg)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} color='#10b981' />
          {t('Record Stock In')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Date')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={newDate}
                onChange={(e) => {
                  const today = new Date().toISOString().split('T')[0];
                  setNewDate(e.target.value > today ? today : e.target.value);
                }}
                style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Time')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <input
                type="time"
                value={newTime}
                onChange={(e) => {
                  const today = new Date().toISOString().split('T')[0];
                  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  if (newDate === today && e.target.value > now) {
                    setNewTime(now);
                  } else {
                    setNewTime(e.target.value);
                  }
                }}
                style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Code')}</label>
            <div
              style={{ position: 'relative' }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setShowItemDropdown(false);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                <Hash size={18} color='var(--text-secondary)' />
                <input
                  type="text"
                  placeholder="e.g. E-001 (Click to search)"
                  value={newItemCode}
                  onChange={handleItemCodeChange}
                  onFocus={() => setShowItemDropdown(true)}
                  style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                />
              </div>

              {showItemDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, width: '350px', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 50, marginTop: '4px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      placeholder="Search by Item Name or Code..."
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      autoFocus
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {(() => {
                      const search = (itemSearchTerm || (showItemDropdown ? newItemCode : '')).toLowerCase().trim();
                      const filteredCodes = Object.keys(itemsMaster).filter(code => {
                        return itemsMaster[code].name.toLowerCase().includes(search) || code.toLowerCase().includes(search);
                      });

                      if (filteredCodes.length === 0) {
                        return (
                          <div style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              {t('Item not found in master')}
                            </p>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleOpenAddItemModal(itemSearchTerm || newItemCode);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                width: '100%'
                              }}
                            >
                              <Plus size={16} />
                              {t('Other (Add New Item)')}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <>
                          {filteredCodes.map(code => (
                            <div
                              key={code}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setNewItemCode(code);
                                setNewItemName(itemsMaster[code].name);
                                setNewCategory(itemsMaster[code].category);
                                setNewSubUnit(itemsMaster[code].unit || 'Nos');
                                setShowItemDropdown(false);
                                setItemSearchTerm('');
                              }}
                              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--table-hover)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{code}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{itemsMaster[code].name}</span>
                            </div>
                          ))}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleOpenAddItemModal(itemSearchTerm || newItemCode);
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              borderTop: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              color: '#10b981',
                              fontWeight: '600',
                              fontSize: '0.875rem',
                              backgroundColor: 'var(--surface-bg)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--table-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-bg)'}
                          >
                            <Plus size={16} />
                            <span>{t('Other / Add New Item')}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name (Auto)')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--slate-100)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <Tag size={18} color='var(--slate-400)' />
              <input type="text" placeholder="Auto" value={newItemName} readOnly style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--slate-600)', fontWeight: '600' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Received From')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <select value={newSource} onChange={(e) => setNewSource(e.target.value)} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
                {staffList.filter(p => p.type !== 'Helper').map((person, idx) => (
                  <option key={idx} value={person.name} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{person.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Quantity Added')}</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
              <Layers size={18} color='var(--text-secondary)' />
              <input type="number" step={['nos', 'ml', 'gms'].includes((newSubUnit || '').toLowerCase()) ? "1" : "0.01"} min={['nos', 'ml', 'gms'].includes((newSubUnit || '').toLowerCase()) ? "1" : "0.01"} placeholder="Qty" value={newQuantity} onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) > 0) setNewQuantity(val);
              }} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />

              {newItemCode && itemsMaster[newItemCode] && (
                <select
                  value={newSubUnit}
                  onChange={(e) => setNewSubUnit(e.target.value)}
                  style={{ border: 'none', outline: 'none', padding: '0.5rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 'bold', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
                >
                  <option value={itemsMaster[newItemCode].unit} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{itemsMaster[newItemCode].unit}</option>
                  {(itemsMaster[newItemCode].unit?.toLowerCase() === 'ltr' || itemsMaster[newItemCode].unit?.toLowerCase() === 'ltrs') && <option value="ml" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>ml</option>}
                  {(itemsMaster[newItemCode].unit?.toLowerCase() === 'kg' || itemsMaster[newItemCode].unit?.toLowerCase() === 'kgs') && <option value="gms" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>gms</option>}
                </select>
              )}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={() => {
                setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                setNewItemCode('');
                setNewItemName('');
                setNewCategory('');
                setNewQuantity('');
                setNewSource('mr. suhas bachhav');
              }}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSaveStock}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981',
                color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <Save size={18} />
              {t('Add Stock In')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form Section (Edit Only) */}
      {isModalOpen && editingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-bg)',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '900px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
              <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={22} color='#10b981' />
              {t('Edit Stock In')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Date')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--slate-100)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => {
                      const today = new Date().toISOString().split('T')[0];
                      setNewDate(e.target.value > today ? today : e.target.value);
                    }}
                    style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Time')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => {
                      const today = new Date().toISOString().split('T')[0];
                      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                      if (newDate === today && e.target.value > now) {
                        setNewTime(now);
                      } else {
                        setNewTime(e.target.value);
                      }
                    }}
                    style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: '600' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Code')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <Hash size={18} color='var(--text-secondary)' />
                  <input type="text" list="stockin-item-codes" placeholder="e.g. E-001" value={newItemCode} onChange={handleItemCodeChange} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />
                  <datalist id="stockin-item-codes">
                    {Object.keys(itemsMaster).map(code => (
                      <option key={code} value={code}>{itemsMaster[code].name}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Item Name (Auto)')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--slate-100)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <Tag size={18} color='var(--slate-400)' />
                  <input type="text" placeholder="Auto" value={newItemName} readOnly style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--slate-600)', fontWeight: '600' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Received From')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
                    {staffList.filter(p => p.type !== 'Helper').map((person, idx) => (
                      <option key={idx} value={person.name}>{person.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>{t('Quantity Added')}</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.5rem' }}>
                  <Layers size={18} color='var(--text-secondary)' />
                  <input type="number" step={['nos', 'ml', 'gms', 'pcs', 'box', 'set', 'pairs'].includes((newSubUnit || '').toLowerCase()) ? "1" : "0.01"} min={['nos', 'ml', 'gms', 'pcs', 'box', 'set', 'pairs'].includes((newSubUnit || '').toLowerCase()) ? "1" : "0.01"} placeholder="Qty" value={newQuantity} onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) > 0) setNewQuantity(val);
                  }} style={{ border: 'none', outline: 'none', padding: '0.75rem', width: '100%', fontSize: '0.95rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }} />

                  {newItemCode && itemsMaster[newItemCode] && (
                    <select
                      value={newSubUnit}
                      onChange={(e) => setNewSubUnit(e.target.value)}
                      style={{ border: 'none', outline: 'none', padding: '0.5rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 'bold', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      <option value={itemsMaster[newItemCode].unit}>{itemsMaster[newItemCode].unit}</option>
                      {itemsMaster[newItemCode].unit === 'Ltr' && <option value="ml">ml</option>}
                      {itemsMaster[newItemCode].unit === 'Kgs' && <option value="gms">gms</option>}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setNewTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                    setNewItemCode('');
                    setNewItemName('');
                    setNewCategory('');
                    setNewQuantity('');
                    setNewSource('mr. suhas bachhav');
                    setIsModalOpen(false);
                  }}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                    color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleSaveStock}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981',
                    color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  <Save size={18} />
                  {t('Save Changes')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={handleExportPDF} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
          <Download size={18} /> PDF
        </button>
        <button onClick={handleExportExcel} style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
          <FileSpreadsheet size={18} /> Excel
        </button>
      </div>

      {/* Filters Section */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} color='var(--slate-400)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Item Name or Code..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
        >
          <option value="" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>All Categories</option>
          {[...new Set(stockEntries.map(e => e.category))].filter(Boolean).sort().map((cat, idx) => (
            <option key={idx} value={cat} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{cat}</option>
          ))}
        </select>

        <select
          value={selectedSource}
          onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
          style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '150px', cursor: 'pointer' }}
        >
          <option value="" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>All Sources</option>
          {[...new Set([
            ...stockEntries.map(e => e.source),
            ...staffList.filter(s => s.type !== 'Helper').map(s => s.name)
          ])].filter(src => src && !staffList.filter(s => s.type === 'Helper').map(s => s.name).includes(src)).sort().map((src, idx) => (
            <option key={idx} value={src} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{src}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--surface-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>

        {/* Filter Type Options */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', color: 'var(--slate-600)', fontSize: '0.85rem' }}>Filter Type</label>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', height: '42px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--slate-700)', fontSize: '0.95rem' }}>
              <input
                type="radio"
                name="filterType"
                value="fy"
                checked={filterType === 'fy'}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Financial Year
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--slate-700)', fontSize: '0.95rem' }}>
              <input
                type="radio"
                name="filterType"
                value="dateRange"
                checked={filterType === 'dateRange'}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Date Range
            </label>
          </div>
        </div>

        {/* Dynamic Inputs Based on Filter Type */}
        {filterType === 'fy' ? (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--slate-600)', fontSize: '0.85rem' }}>Financial Year</label>
            <select
              value={selectedFY}
              onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', minWidth: '200px', cursor: 'pointer', height: '42px' }}
            >
              <option value="" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>-- Select FY --</option>
              {getFinancialYears().map((fy, idx) => (
                <option key={idx} value={fy} style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>{idx === 0 ? 'Current FY ' : idx === 1 ? 'Last FY ' : 'Previous FY '}({fy})</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--slate-600)', fontSize: '0.85rem' }}>From Date</label>
              <input
                type="date"
                max={toDate || new Date().toISOString().split('T')[0]}
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', height: '42px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--slate-600)', fontSize: '0.85rem' }}>To Date</label>
              <input
                type="date"
                min={fromDate}
                max={new Date().toISOString().split('T')[0]}
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', height: '42px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: 'var(--surface-bg)', border: 'none' }}>
        {/* Pagination logic */}
        {(() => {
          const currentRecords = stockEntries;
          return (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('DATE')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('TIME')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM CODE')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('ITEM NAME (AUTO)')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('CATEGORY (AUTO)')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('UNIT')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{t('RECEIVED FROM')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>{t('QUANTITY ADDED')}</div>
                    </th>
                    <th style={{ color: 'var(--slate-600)', padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px', textAlign: 'right' }}>
                      {t('ACTION')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{entry.date}</td>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.95rem' }}>{formatTime12h(entry.time) || 'N/A'}</td>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '0.95rem' }}>{entry.itemCode}</td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {(() => {
                            const coverPhoto = getCoverPhoto(entry.photoUrl);
                            return coverPhoto ? (
                              <img
                                src={coverPhoto}
                                alt={entry.itemName}
                                onClick={() => setViewingPhoto(entry)}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                              />
                            ) : (
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: 'var(--slate-200)', color: 'var(--slate-700)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '0.8rem'
                              }}>{entry.itemName ? entry.itemName.charAt(0) : '?'}</div>
                            );
                          })()}
                          <span style={{ color: 'var(--slate-700)', fontWeight: '600', fontSize: '0.95rem' }}>{entry.itemName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <span style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-600)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {entry.category}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                        {entry.unit}
                      </td>
                      <td style={{ padding: '1.25rem 1rem', color: 'var(--slate-600)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {entry.source}
                      </td>
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                        <span style={{
                          backgroundColor: '#dcfce7', color: '#166534',
                          padding: '0.35rem 0.75rem', borderRadius: '20px',
                          fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap'
                        }}>
                          + {(entry.unit === 'Ltr' && entry.quantity < 1)
                            ? `${entry.quantity * 1000} ml`
                            : (entry.unit === 'Kgs' && entry.quantity < 1)
                              ? `${entry.quantity * 1000} gms`
                              : `${entry.quantity} ${entry.unit}`}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button onClick={() => setViewingItem(entry)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><Eye size={16} /></button>
                          <button onClick={() => handleEditStock(entry)} style={{ backgroundColor: 'var(--surface-bg)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-600)' }}><Edit size={16} /></button>
                          <button onClick={() => handleDeleteStock(entry.id)} style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface-bg)' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stockEntries.length === 0 && !loading && (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                        No stock entries match the current filters.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                        Loading records...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination UI */}
              <div style={{ padding: '1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-500)', fontSize: '0.875rem' }}>
                <span>Showing {stockEntries.length} entries of {totalRecords} total</span>
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
            </>
          );
        })()}
      </div>



      {/* View Stock In Modal */}
      {viewingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-bg)', borderRadius: '16px', width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', margin: 0 }}>{t('Stock In Details')}</h2>
              <button
                onClick={() => setViewingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Date:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.date}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Code:</span>
                <span style={{ color: 'var(--slate-900)', fontWeight: 'bold' }}>{viewingItem.itemCode}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Item Name:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.itemName}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Category:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.category}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Unit:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.unit}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Received From:</span>
                <span style={{ color: 'var(--slate-900)' }}>{viewingItem.source}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <span style={{ color: 'var(--slate-500)', fontWeight: '600' }}>Quantity Added:</span>
                <span style={{ color: '#166534', fontWeight: 'bold' }}>+ {viewingItem.quantity}</span>
              </div>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--slate-50)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewingItem(null)}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'var(--surface-bg)',
                  color: 'var(--slate-600)', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Viewing Photo Modal (Slideshow) */}
      {viewingPhoto && viewingPhoto.photoUrl && getAllPhotos(viewingPhoto.photoUrl).length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => setViewingPhoto(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, fontSize: '1.2rem' }}
            >
              ×
            </button>
            <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--surface-bg)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
              {(() => {
                const photos = getAllPhotos(viewingPhoto.photoUrl);
                return (
                  <>
                    <img src={photos[photoSlideIndex] || photos[0]} alt={viewingPhoto.itemName} style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#f1f5f9' }} />

                    {photos.length > 1 && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(prev => prev === 0 ? photos.length - 1 : prev - 1); }} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                        <button onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(prev => prev === photos.length - 1 ? 0 : prev + 1); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={{ marginTop: '1rem', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
              {viewingPhoto.itemName}
            </div>
            {(() => {
              const photos = getAllPhotos(viewingPhoto.photoUrl);
              return photos.length > 1 ? (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {photos.map((_, idx) => (
                    <div key={idx} onClick={(e) => { e.stopPropagation(); setPhotoSlideIndex(idx); }} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: idx === photoSlideIndex ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'background-color 0.2s' }} />
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Add Item to Item Master Modal */}
      {isAddItemModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-bg)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsAddItemModalOpen(false)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={22} color='#10b981' />
              {t('Add Item to Item Master')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {t('Item Name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={addModalItemName}
                  onChange={(e) => setAddModalItemName(e.target.value)}
                  placeholder="e.g. CWX-VALVE- 1 inch"
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {t('Select Category')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={addModalCategory}
                  onChange={(e) => setAddModalCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)'
                  }}
                >
                  <option value="">-- {t('Select Category')} --</option>
                  {categoriesList.filter(c => c.name !== 'N/A').map((cat, idx) => (
                    <option key={cat.id || idx} value={cat.name}>
                      {cat.name} ({cat.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {t('Unit')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={addModalUnit}
                  onChange={(e) => setAddModalUnit(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)'
                  }}
                >
                  {unitsList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {t('Minimum Stock Alert Level')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={addModalMinStock}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) setAddModalMinStock(val);
                  }}
                  placeholder="e.g. 5"
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--slate-600)', fontWeight: '600', fontSize: '0.875rem' }}>
                  {t('Item Photo')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <input
                    ref={addModalCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAddModalPhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <input
                    ref={addModalGalleryRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAddModalPhotoUpload}
                    style={{ display: 'none' }}
                  />

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => { if (addModalPhotos.length < 4) setShowAddModalPhotoDropdown(!showAddModalPhotoDropdown); }}
                      disabled={addModalPhotos.length >= 4 || isSavingMasterItem}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', 
                        backgroundColor: addModalPhotos.length >= 4 ? 'var(--slate-100)' : 'var(--surface-bg)', 
                        border: '1px solid var(--border-color)', borderRadius: '8px', 
                        cursor: addModalPhotos.length >= 4 ? 'not-allowed' : 'pointer', 
                        color: addModalPhotos.length >= 4 ? 'var(--slate-400)' : 'var(--slate-700)', 
                        fontWeight: '500', opacity: addModalPhotos.length >= 4 ? 0.6 : 1 
                      }}
                    >
                      <Image size={18} color={addModalPhotos.length >= 4 ? "var(--slate-400)" : "#10b981"} /> 
                      {t('Upload Photo')} ({addModalPhotos.length}/4)
                    </button>
                    {showAddModalPhotoDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', backgroundColor: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10 }}>
                        <div
                          onClick={() => {
                            setShowAddModalPhotoDropdown(false);
                            addModalCameraRef.current?.click();
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--slate-700)' }}
                        >
                          <Camera size={16} color="var(--slate-600)" /> {t('Camera')}
                        </div>
                        <div
                          onClick={() => {
                            setShowAddModalPhotoDropdown(false);
                            addModalGalleryRef.current?.click();
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', cursor: 'pointer', color: 'var(--slate-700)' }}
                        >
                          <Image size={16} color="var(--slate-600)" /> {t('Gallery')}
                        </div>
                      </div>
                    )}
                  </div>

                  {addModalPhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {addModalPhotos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => removeAddModalPhoto(idx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', padding: '2px 4px', fontSize: '0.6rem', cursor: 'pointer' }}>X</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                disabled={isSavingMasterItem}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                  color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveMasterItem}
                disabled={isSavingMasterItem}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981',
                  color: '#ffffff', fontWeight: '600', cursor: isSavingMasterItem ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSavingMasterItem ? 0.7 : 1
                }}
              >
                <Save size={18} />
                {isSavingMasterItem ? t('Saving...') : t('Save & Select Item')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockIn;
