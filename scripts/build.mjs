import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

function minifyHtml(source) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function minifyCss(source) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}
function minifyJs(source) {
  const strings = [];
  const masked = source.replace(/"(?:\\.|[^"\\])*"/g, (match) => {
    strings.push(match);
    return "__STR_" + (strings.length - 1) + "__";
  });
  const compact = masked
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s*([{}();,=+:!&|?<>])\s*/g, "$1")
    .replace(/;\}/g, "}")
    .trim();
  return compact.replace(/__STR_(\d+)__/g, (_, index) => strings[Number(index)]);
}

function copyDirectoryRecursive(sourcePath, targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    const srcEntry = path.join(sourcePath, entry.name);
    const destEntry = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

copyDirectoryRecursive(publicDir, distDir);
copyDirectoryRecursive(publicDir, rootDir);

const htmlRaw = fs.readFileSync(path.join(srcDir, "index.html"), "utf8");
const cssRaw = fs.readFileSync(path.join(srcDir, "styles.css"), "utf8");
const jsRaw = fs.readFileSync(path.join(srcDir, "main.js"), "utf8");

const htmlMin = minifyHtml(htmlRaw);
const cssMin = minifyCss(cssRaw);
const jsMin = minifyJs(jsRaw);

fs.writeFileSync(path.join(distDir, "index.html"), htmlMin, "utf8");
fs.writeFileSync(path.join(distDir, "styles.min.css"), cssMin, "utf8");
fs.writeFileSync(path.join(distDir, "main.min.js"), jsMin, "utf8");

fs.writeFileSync(path.join(rootDir, "index.html"), htmlMin, "utf8");
fs.writeFileSync(path.join(rootDir, "styles.min.css"), cssMin, "utf8");
fs.writeFileSync(path.join(rootDir, "main.min.js"), jsMin, "utf8");

const verifyTargets = [
  path.join(distDir, "index.html"),
  path.join(distDir, "styles.min.css"),
  path.join(distDir, "main.min.js")
];

const forbiddenTokens = ["<".concat("!--"), "/".concat("*"), "/".concat("/"), "sourceMappingURL"];

for (const file of verifyTargets) {
  const text = fs.readFileSync(file, "utf8");
  for (const token of forbiddenTokens) {
    if (text.includes(token)) {
      throw new Error("Forbidden token found in " + path.basename(file) + ": " + token);
    }
  }
}

process.stdout.write("Build completed: dist/index.html, dist/styles.min.css, dist/main.min.js\n");
