const fs = require('fs');
const path = require('path');
const dir = './src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
let changedCount = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const original = content;
  content = content.replace(/<span>Showing \{([^>]+) > 0 \? ([^:]+) : 0\} to \{([^}]+)\} of \{([^}]+)\} entries<\/span>/g, (match, arrayName, startExpr, endExpr, totalExpr) => {
    const startIndex = startExpr.replace(' + 1', '').trim();
    return `<span>Showing {${arrayName} > 0 ? (${endExpr}) - (${startIndex}) : 0} of {${totalExpr}} entries</span>`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    changedCount++;
    console.log(`Updated ${file}`);
  }
}
console.log(`Finished updating ${changedCount} files.`);
