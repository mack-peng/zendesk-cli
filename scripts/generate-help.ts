import { generateHelpJSON } from '../src/config/helpGenerator';
import fs from 'fs';
import path from 'path';

const help = generateHelpJSON();
const outPath = path.join(__dirname, '..', 'src', 'help.json');
fs.writeFileSync(outPath, JSON.stringify(help, null, 2));
console.log(`Generated ${outPath}`);
