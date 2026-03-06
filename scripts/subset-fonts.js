/**
 * Sous-ensemble des polices : réduit Merriweather au jeu Latin
 * uniquement pour les caractères réellement utilisés en français.
 *
 * Usage : node scripts/subset-fonts.js
 */

import subsetFont from 'subset-font';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Caractères conservés : ASCII + Latin-1 + extensions francaises
const LATIN_CHARS = [
  // Majuscules et minuscules latines de base
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  // Chiffres et ponctuation courante
  '0123456789 ',
  '!"%\'()*+,-./:;<=>?@[]^_`{|}~',
  // Caractères accentués français (Latin-1 Supplement)
  '\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6', // À Á Â Ã Ä Å Æ
  '\u00C7\u00C8\u00C9\u00CA\u00CB',              // Ç È É Ê Ë
  '\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1',        // Ì Í Î Ï Ð Ñ
  '\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8',        // Ò Ó Ô Õ Ö Ø
  '\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF',  // Ù Ú Û Ü Ý Þ ß
  '\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6',  // à á â ã ä å æ
  '\u00E7\u00E8\u00E9\u00EA\u00EB',              // ç è é ê ë
  '\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1',        // ì í î ï ð ñ
  '\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8',        // ò ó ô õ ö ø
  '\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u00FF',  // ù ú û ü ý þ ÿ
  // Extensions Latin
  '\u0152\u0153',     // Œ œ
  '\u0160\u0161',     // Š š
  '\u0178',           // Ÿ
  '\u017D\u017E',     // Ž ž
  // Ponctuation typographique
  '\u00A0',           // espace insécable
  '\u00AB\u00BB',     // « »
  '\u2013\u2014',     // – —
  '\u2018\u2019',     // ' '
  '\u201A\u201C\u201D\u201E', // ‚ " " „
  '\u2026',           // …
  '\u20AC',           // €
  '\u2122',           // ™
].join('');

async function main() {
  const srcPath = 'public/fonts/merriweather/Merriweather_24pt-Regular.ttf';
  const dstPath = 'public/fonts/merriweather/Merriweather_24pt-Regular-latin.woff2';

  console.log('Lecture de : ' + srcPath);
  const input = readFileSync(srcPath);

  console.log('Génération du sous-ensemble Latin WOFF2...');
  const output = await subsetFont(input, LATIN_CHARS, { targetFormat: 'woff2' });

  writeFileSync(dstPath, output);

  const kioAvant = Math.round(input.length / 1024);
  const kioApres = Math.round(output.length / 1024);
  const gain = Math.round((1 - output.length / input.length) * 100);
  console.log('Avant : ' + kioAvant + ' Kio (TTF source)');
  console.log('Après : ' + kioApres + ' Kio (WOFF2 Latin subset)');
  console.log('Gain  : -' + gain + '%');
  console.log('Fichier écrit : ' + dstPath);
}

main().catch(err => {
  console.error('Erreur lors du sous-ensemble :', err.message);
  process.exit(1);
});
