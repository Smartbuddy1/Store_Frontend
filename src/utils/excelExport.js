import * as XLSX from 'xlsx-js-style';

export const exportToExcel = (data, sheetName, fileName, multipleSheets = null) => {
  const workbook = XLSX.utils.book_new();

  const addSheet = (sheetData, name) => {
    if (!sheetData || sheetData.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(sheetData);

    // Auto-size columns
    const keys = Object.keys(sheetData[0]);
    const wscols = keys.map(key => {
      let maxLength = key.toString().length;
      sheetData.forEach(row => {
        const val = row[key] !== null && row[key] !== undefined ? row[key].toString() : '';
        if (val.length > maxLength) {
          maxLength = val.length;
        }
      });
      return { wch: Math.min(maxLength + 3, 50) }; // +3 for padding, max 50 width
    });

    worksheet['!cols'] = wscols;

    // Make headers bold
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ c: C, r: 0 }); // First row (headers)
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          font: {
            bold: true
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  };

  if (multipleSheets && multipleSheets.length > 0) {
    multipleSheets.forEach(sheet => {
      addSheet(sheet.data, sheet.name);
    });
  } else {
    addSheet(data, sheetName);
  }

  if (workbook.SheetNames.length > 0) {
    XLSX.writeFile(workbook, fileName);
  }
};
