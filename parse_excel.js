import xlsx from 'xlsx';
import fs from 'fs';

const filePath = './src/assets/Dinesh_Nahire_Store_Management_.xlsx';
const workbook = xlsx.readFile(filePath);

const data = {};

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const sheetData = xlsx.utils.sheet_to_json(sheet);
  data[sheetName] = sheetData;
});

fs.writeFileSync('./src/assets/data.json', JSON.stringify(data, null, 2));
console.log('Data successfully parsed and written to src/assets/data.json');
