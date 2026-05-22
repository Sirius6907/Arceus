const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /Arceus-main/g, replacement: 'Arceus-main' },
  { regex: /Sirius6907\/Arceus/g, replacement: 'Sirius6907/Arceus' },
  { regex: /Abhigyan Patwari/g, replacement: 'Chandan Kumar Behera' },
  { regex: /Arceus/g, replacement: 'Arceus' },
  { regex: /arceus-web/g, replacement: 'arceus-web' },
  { regex: /arceus-shared/g, replacement: 'arceus-shared' },
  { regex: /arceus-test-setup/g, replacement: 'arceus-test-setup' },
  { regex: /arceus-claude-plugin/g, replacement: 'arceus-claude-plugin' },
  { regex: /arceus-cursor-integration/g, replacement: 'arceus-cursor-integration' },
  { regex: /arceus-monorepo/g, replacement: 'arceus-monorepo' },
  { regex: /@arceus\//g, replacement: '@arceus/' },
  { regex: /\.arceus/g, replacement: '.arc' },
  { regex: /ARCEUS_/g, replacement: 'ARC_' },
  { regex: /arceus_/g, replacement: 'arc_' },
  { regex: /arceus/g, replacement: 'arc' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'replace.js' || file === 'package-lock.json') {
      continue;
    }

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Only process text files
    const validExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.sh', '.py', '.mjs', '.cjs'];
    if (ext && !validExts.includes(ext) && !filePath.includes('Dockerfile') && !filePath.includes('.env')) {
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const r of replacements) {
      content = content.replace(r.regex, r.replacement);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (e) {
    console.error(`Error processing ${filePath}: ${e.message}`);
  }
}

processDirectory(__dirname);
console.log('Replacement complete.');
