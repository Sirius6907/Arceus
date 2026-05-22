const fs = require('fs');
const path = require('path');

function renamePaths(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (file === 'node_modules' || file === '.git') {
      continue;
    }
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      renamePaths(fullPath);
    }
    
    if (file.toLowerCase().includes('arceus')) {
      // For files/dirs inside eval/, use arc_
      let newName = file.replace(/arceus/gi, 'arc');
      
      const newFullPath = path.join(dir, newName);
      try {
        fs.renameSync(fullPath, newFullPath);
        console.log(`Renamed: ${fullPath} -> ${newFullPath}`);
      } catch (e) {
        console.error(`Failed to rename ${fullPath}: ${e.message}`);
      }
    }
  }
}

renamePaths(__dirname);
console.log('Renaming complete.');
