/**
 * Génère une version minimale de Merriweather pour le site.
 *
 * Usage
 * node scripts/subset-fonts.js
 */

import subsetFont from 'subset-font';
import { readFileSync, writeFileSync } from 'fs';

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  ' ' +
  '.,!?\'"()-' +
  'ÀÂÆÇÈÉÊËÎÏÔŒÙÛÜŸ' +
  'àâæçèéêëîïôœùûüÿ';

async function main() {
  const srcPath = 'public/fonts/merriweather/Merriweather_24pt-Regular.ttf';
  const dstPath = 'public/fonts/merriweather/Merriweather_24pt-Regular-latin.woff2';

  const input = readFileSync(srcPath);

  const output = await subsetFont(input, CHARS, {
    targetFormat: 'woff2',
  });

  writeFileSync(dstPath, output);

  const beforeKb = Math.round(input.length / 1024);
  const afterKb = Math.round(output.length / 1024);
  const gain = Math.round((1 - output.length / input.length) * 100);

  console.log('Avant ' + beforeKb + ' Kio');
  console.log('Après ' + afterKb + ' Kio');
  console.log('Gain -' + gain + '%');
  console.log('Fichier écrit dans ' + dstPath);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});