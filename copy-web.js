const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'www');
const files = ['index.html', 'style.css', 'main.js', 'manifest.webmanifest', 'icon.svg', 'sw.js'];

fs.mkdirSync(destination, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
console.log('Arquivos do jogo copiados para www/.');
