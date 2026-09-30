const fs = require('fs');
const path = require('path');
const dir = './src/pages';

const fileHeaders = {
  'Dashboard.jsx': ['Dashboard', ''],
  'ItemMaster.jsx': ['Item Master', 'Manage all store items'],
  'StockIn.jsx': ['Stock In', 'Record incoming inventory'],
  'StockOut.jsx': ['Stock Out', 'Record outgoing inventory and dispatches'],
  'CurrentStock.jsx': ['Current Stock', 'View real-time inventory status'],
  'Alerts.jsx': ['Alerts', 'Monitor items that need immediate attention or restocking'],
  'Tools.jsx': ['Tools Tracker', 'Track borrowed tools and equipment'],
  'Masters.jsx': ['Masters / Settings', 'Manage system configurations']
};

const tableHeaders = {
  'ItemMaster.jsx': ['ITEM CODE', 'ITEM NAME', 'CATEGORY', 'UNIT', 'MIN STOCK', 'ACTION'],
  'StockIn.jsx': ['DATE', 'ITEM CODE', 'ITEM NAME', 'CATEGORY', 'SOURCE', 'QUANTITY', 'ACTION'],
  'StockOut.jsx': ['DATE', 'ITEM CODE', 'ITEM NAME', 'CATEGORY', 'HANDOVER TO', 'QUANTITY', 'ACTION'],
  'CurrentStock.jsx': ['ITEM CODE', 'ITEM NAME', 'CATEGORY', 'UNIT', 'CURRENT STOCK', 'STATUS'],
  'Alerts.jsx': ['ITEM CODE', 'ITEM NAME', 'CATEGORY', 'UNIT', 'MIN STOCK', 'CURRENT QTY', 'STATUS'],
  'Tools.jsx': ['DATE', 'TOOL NAME', 'HELPER NAME', 'QUANTITY', 'STATUS', 'ACTION'],
  'Masters.jsx': [] // Has multiple tabs, need to be careful
};

const formLabels = {
  'Item Code': 'Item Code',
  'Item Name': 'Item Name',
  'Item Name (Auto)': 'Item Name (Auto)',
  'Category': 'Category',
  'Category (Auto)': 'Category (Auto)',
  'Quantity Added': 'Quantity Added',
  'Quantity Dispatched': 'Quantity Dispatched',
  'Received From': 'Received From',
  'Handover To': 'Handover To',
  'Date': 'Date',
  'Minimum Stock Alert Level': 'Minimum Stock Alert Level',
  'Unit': 'Unit'
};

const buttonHeaders = {
  'ItemMaster.jsx': 'Add New Item',
  'StockIn.jsx': 'Add Stock In',
  'StockOut.jsx': 'Add Dispatch',
  'Tools.jsx': 'Record Tool Handover'
};

const fsFiles = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

fsFiles.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix h1 and p
  content = content.replace(/<h1[^>]*>\{t\(\'\'\)\}<\/h1>/g, (match) => {
    return match.replace("{t('')}", `{t('${fileHeaders[file][0]}')}`);
  });

  content = content.replace(/<p style={{ color: 'var\(--slate-500\)', marginTop: '0\.25rem' }}>\{t\(\'\'\)\}<\/p>/g, (match) => {
    return match.replace("{t('')}", `{t('${fileHeaders[file][1]}')}`);
  });

  // Fix table headers for the main table (not Masters.jsx since it has multiple tables)
  if (file !== 'Masters.jsx' && tableHeaders[file]) {
    let thIdx = 0;
    content = content.replace(/<th[^>]*>([\s\S]*?)<\/th>/g, (match, inner) => {
      if (inner.includes("{t('')}")) {
        const replacement = tableHeaders[file][thIdx];
        thIdx++;
        return match.replace("{t('')}", `{t('${replacement}')}`);
      }
      return match;
    });
  }

  // Also fix Modal headers
  content = content.replace(/\{editingId \? t\(\'\'\) : t\(\'\'\)\}/g, '{editingId ? t(\'Edit Item\') : t(\'Add New Item\')}');
  
  // Fix Add buttons
  if (buttonHeaders[file]) {
    content = content.replace(/<button[^>]*>[\s\S]*?<Plus size=\{18\} \/>\s*\{t\(\'\'\)\}\s*<\/button>/, (match) => {
      return match.replace("{t('')}", `{t('${buttonHeaders[file]}')}`);
    });
  }

  // Fix Save / Cancel buttons and form labels
  content = content.replace(/\{t\(\'\'\)\}/g, (match, offset, string) => {
     const before = string.slice(Math.max(0, offset - 100), offset);
     
     if (before.includes('<Database')) return "{t('Save Changes')}";
     if (before.includes('<Send')) return "{t('Dispatch')}";
     if (before.includes('onClick={() => setIsModalOpen(false)}')) return "{t('Cancel')}";
     if (before.includes('<label')) {
       // Guess the label based on input type or other surrounding text
       if (string.slice(offset, offset + 150).includes('placeholder="e.g. E-001"')) return "{t('Item Code')}";
       if (string.slice(offset, offset + 150).includes('placeholder="e.g. PRESSURE PUMP"')) return "{t('Item Name')}";
       if (string.slice(offset, offset + 150).includes('Auto-populated')) return "{t('Item Name (Auto)')}";
       if (string.slice(offset, offset + 150).includes('placeholder="e.g. 5"')) return "{t('Min Stock')}";
       if (string.slice(offset, offset + 150).includes('placeholder="Qty"')) {
           if (file === 'StockIn.jsx') return "{t('Quantity Added')}";
           return "{t('Quantity Dispatched')}";
       }
       if (string.slice(offset, offset + 150).includes('supplier') || before.includes('newSource')) return "{t('Received From')}";
       if (string.slice(offset, offset + 150).includes('newHandoverTo')) return "{t('Handover To')}";
       if (string.slice(offset, offset + 150).includes('newCategory')) return "{t('Category')}";
       if (string.slice(offset, offset + 150).includes('newDate')) return "{t('Date')}";
       if (string.slice(offset, offset + 150).includes('newUnit')) return "{t('Unit')}";
     }

     return match; // return unmodified if unknown
  });

  fs.writeFileSync(filePath, content);
});

console.log('Fixed headers');
