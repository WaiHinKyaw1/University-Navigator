const fs = require('fs');
const content = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
const lines = content.split('\n');
const newLines = lines.filter(line => !line.includes('": "-"') && !line.includes('": \'-\''));
fs.writeFileSync('pnpm-workspace.yaml', newLines.join('\n'));
