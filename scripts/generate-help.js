const { generateHelpJSON } = require('../src/config/helpGenerator');
const fs = require('fs');
const path = require('path');

const help = generateHelpJSON();
const outPath = path.join(__dirname, '..', 'src', 'help.json');
fs.writeFileSync(outPath, JSON.stringify(help, null, 2));
console.log(`Generated ${outPath}`);
