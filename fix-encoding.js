import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src");

const VALID_EXTENSIONS = [
  ".astro",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
  ".css",
  ".html",
  ".md"
];

function scanDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
      continue;
    }

    const ext = path.extname(fullPath);

    if (!VALID_EXTENSIONS.includes(ext)) {
      continue;
    }

    fixFile(fullPath);
  }
}

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // suppression du BOM si présent
    const cleaned = content.replace(/^\uFEFF/, "");

    fs.writeFileSync(filePath, cleaned, {
      encoding: "utf8"
    });

    console.log("fixed:", filePath);
  } catch (err) {
    console.debug(err);
    console.log("error:", filePath);
  }
}

scanDir(ROOT);

console.log("encoding cleanup finished");