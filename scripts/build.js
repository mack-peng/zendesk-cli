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

console.log('Build complete.');
