import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const OUTPUT = path.join(ROOT, "encoding-report.txt");

const VALID_EXTENSIONS = [".astro", ".js", ".ts", ".jsx", ".tsx", ".html", ".css"];

const IGNORE_DIRS = ["node_modules", ".git", "dist"];

const BROKEN_UTF8_PATTERNS = [
  "Ã",
  "Â",
  "â€",
  "â€™",
  "â€œ",
  "â€",
  "â€“",
  "â€”",
  "â€¦",
  "â‚¬",
  "ï»¿",
  "�"
];

const UNUSUAL_SPACES = new Set([
  0x00A0,
  0x1680,
  0x180E,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200A,
  0x202F,
  0x205F,
  0x3000
]);

const BIDI_AND_ZERO_WIDTH = new Set([
  0x061C,
  0x200B,
  0x200C,
  0x200D,
  0x200E,
  0x200F,
  0x202A,
  0x202B,
  0x202C,
  0x202D,
  0x202E,
  0x2060,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
  0xFEFF
]);

function isInRange(cp, a, b) {
  return cp >= a && cp <= b;
}

function isPrivateUse(cp) {
  return (
    isInRange(cp, 0xE000, 0xF8FF) ||
    isInRange(cp, 0xF0000, 0xFFFFD) ||
    isInRange(cp, 0x100000, 0x10FFFD)
  );
}

function isSurrogate(cp) {
  return isInRange(cp, 0xD800, 0xDFFF);
}

function isNoncharacter(cp) {
  if (isInRange(cp, 0xFDD0, 0xFDEF)) return true;
  if ((cp & 0xFFFF) === 0xFFFE) return true;
  if ((cp & 0xFFFF) === 0xFFFF) return true;
  return false;
}

function isVariationSelector(cp) {
  return isInRange(cp, 0xFE00, 0xFE0F) || isInRange(cp, 0xE0100, 0xE01EF);
}

function isTagChar(cp) {
  return isInRange(cp, 0xE0000, 0xE007F);
}

function isControlButAllowed(cp) {
  if (cp === 0x09) return false;
  if (cp === 0x0A) return false;
  if (cp === 0x0D) return false;
  return /\p{Cc}/u.test(String.fromCodePoint(cp));
}

function isFormatChar(cp) {
  return /\p{Cf}/u.test(String.fromCodePoint(cp));
}

function isCombiningMark(cp) {
  return /\p{Mn}|\p{Me}/u.test(String.fromCodePoint(cp));
}

function isEmojiLike(cp) {
  try {
    return /\p{Extended_Pictographic}/u.test(String.fromCodePoint(cp));
  } catch {
    return false;
  }
}

function scanDir(dir, findings) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);

    if (IGNORE_DIRS.some(d => fullPath.includes(d))) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) scanDir(fullPath, findings);
    else scanFile(fullPath, findings);
  }
}

function scanFile(filePath, findings) {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    findings.push([path.relative(ROOT, filePath), "-", "-", "lecture impossible", ""]);
    return;
  }

  const rel = path.relative(ROOT, filePath);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const p of BROKEN_UTF8_PATTERNS) {
      const idx = line.indexOf(p);
      if (idx !== -1) findings.push([rel, String(i + 1), String(idx + 1), "utf8 casse", p]);
    }

    const escapeMatch = line.match(/\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/g);
    if (escapeMatch) {
      for (const m of escapeMatch) findings.push([rel, String(i + 1), "-", "escape unicode", m]);
    }

    const htmlEntityMatch = line.match(/&#x[0-9a-fA-F]+;|&#\d+;/g);
    if (htmlEntityMatch) {
      for (const m of htmlEntityMatch) findings.push([rel, String(i + 1), "-", "html entity", m]);
    }

    let col = 0;
    for (const ch of line) {
      col += 1;
      const cp = ch.codePointAt(0);

      if (BIDI_AND_ZERO_WIDTH.has(cp)) {
        findings.push([rel, String(i + 1), String(col), "bidi ou zero width", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (UNUSUAL_SPACES.has(cp)) {
        findings.push([rel, String(i + 1), String(col), "espace inhabituel", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isControlButAllowed(cp)) {
        findings.push([rel, String(i + 1), String(col), "controle unicode", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isFormatChar(cp)) {
        findings.push([rel, String(i + 1), String(col), "format unicode", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isCombiningMark(cp)) {
        findings.push([rel, String(i + 1), String(col), "combining mark", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isVariationSelector(cp)) {
        findings.push([rel, String(i + 1), String(col), "variation selector", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isTagChar(cp)) {
        findings.push([rel, String(i + 1), String(col), "tag character", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isNoncharacter(cp)) {
        findings.push([rel, String(i + 1), String(col), "noncharacter", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isSurrogate(cp)) {
        findings.push([rel, String(i + 1), String(col), "surrogate", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (isPrivateUse(cp)) {
        findings.push([rel, String(i + 1), String(col), "private use", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }

      if (cp === 0xFFFD) {
        findings.push([rel, String(i + 1), String(col), "replacement char", "U+FFFD"]);
        continue;
      }

      if (isEmojiLike(cp)) {
        findings.push([rel, String(i + 1), String(col), "emoji", "U+" + cp.toString(16).toUpperCase()]);
        continue;
      }
    }
  }
}

function writeReport(findings) {
  if (findings.length === 0) {
    fs.writeFileSync(OUTPUT, "Aucun caractere suspect detecte\n");
    console.log("Aucun probleme detecte");
    return;
  }

  let out = "";
  out += "Rapport caracteres suspects\n";
  out += "Total " + findings.length + "\n\n";

  for (const f of findings) {
    out += "Fichier " + f[0] + "\n";
    out += "Ligne " + f[1] + "\n";
    out += "Colonne " + f[2] + "\n";
    out += "Type " + f[3] + "\n";
    out += "Detail " + f[4] + "\n";
    out += "--------------------------\n";
  }

  fs.writeFileSync(OUTPUT, out);
  console.log("Rapport genere " + OUTPUT);
}

const findings = [];
scanDir(SRC_DIR, findings);
writeReport(findings);