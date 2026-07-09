const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating help.json...');
execSync('npx tsx scripts/generate-help.ts', { stdio: 'inherit' });

console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

console.log('Copying help.json to dist...');
fs.copyFileSync(
  path.join(__dirname, '..', 'src', 'help.json'),
  path.join(__dirname, '..', 'dist', 'help.json')
);

// Strip source maps from dist (not needed at runtime)
const distDir = path.join(__dirname, '..', 'dist');
for (const entry of walkSync(distDir)) {
  if (entry.endsWith('.js.map') || entry.endsWith('.d.ts.map'))
    fs.unlinkSync(path.join(distDir, entry));
}

console.log('Build complete.');

function walkSync(dir, base = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(dir, base))) {
    const full = base ? path.join(base, entry) : entry;
    if (fs.statSync(path.join(dir, full)).isDirectory())
      files.push(...walkSync(dir, full));
    else
      files.push(full);
  }
  return files;
}
