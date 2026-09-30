import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'components');

const colorMap = {
    "'#ffffff'": "'var(--surface-bg)'",
    "'white'": "'var(--surface-bg)'",
    "'#f8fafc'": "'var(--slate-50)'",
    "'#f1f5f9'": "'var(--slate-100)'",
    "'#e2e8f0'": "'var(--slate-200)'",
    "'#cbd5e1'": "'var(--slate-300)'",
    "'#94a3b8'": "'var(--slate-400)'",
    "'#64748b'": "'var(--slate-500)'",
    "'#475569'": "'var(--slate-600)'",
    "'#334155'": "'var(--slate-700)'",
    "'#1e293b'": "'var(--slate-800)'",
    "'#0f172a'": "'var(--slate-900)'",
    "'#020617'": "'var(--slate-950)'"
};

fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        
        let original = content;
        for (const [hex, cssVar] of Object.entries(colorMap)) {
            content = content.split(hex).join(cssVar);
            content = content.split(hex.replace(/'/g, '"')).join(cssVar);
        }

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`Updated colors in ${file}`);
        }
    }
});
