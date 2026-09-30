const fs = require('fs');
const path = require('path');
const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  let p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace PDF button
  content = content.replace(
    /<button style=\{\{ backgroundColor: '#fee2e2'.*?\n.*?<\/button>/gs,
    `<button style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <Download size={18} /> PDF
          </button>`
  );

  // Replace Excel button
  content = content.replace(
    /<button style=\{\{ backgroundColor: '#dcfce7'.*?\n.*?<\/button>/gs,
    `<button style={{ backgroundColor: 'transparent', color: '#059669', border: '1.5px solid #059669', padding: '0.4rem 1.25rem', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>`
  );

  // Add Download icon import if it was added and not present
  if (content.includes('<Download ') && !content.includes('Download,')) {
    content = content.replace(/import \{ (.*?) \} from 'lucide-react';/, "import { $1, Download } from 'lucide-react';");
  }

  fs.writeFileSync(p, content);
});
console.log('Buttons replaced successfully.');
