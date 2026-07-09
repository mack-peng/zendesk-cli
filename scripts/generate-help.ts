import { generateHelpJSON } from '../src/config/helpGenerator';
import fs from 'fs';
import path from 'path';

const help = generateHelpJSON();
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir))
  fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, 'help.json');
fs.writeFileSync(outPath, JSON.stringify(help, null, 2));
console.log(`Generated ${outPath}`);
