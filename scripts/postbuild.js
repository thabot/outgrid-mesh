import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve('build');

function processHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  // If BASE_PATH is set (e.g. GitHub Pages build), do not convert to relative ./app/
  if (process.env.BASE_PATH) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Replace root-absolute /app/ with relative ./app/
  if (content.includes('href="/app/') || content.includes('import("/app/') || content.includes('src="/app/')) {
    content = content
      .replaceAll('href="/app/', 'href="./app/')
      .replaceAll('import("/app/', 'import("./app/')
      .replaceAll('src="/app/', 'src="./app/');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[postbuild] Converted paths to relative (./app/) in ${path.basename(filePath)}`);
  }
}

const targetFiles = ['index.html', '200.html', '404.html'];
for (const file of targetFiles) {
  processHtmlFile(path.join(buildDir, file));
}

// Ensure 404.html exists for GitHub Pages SPA routing fallback
const indexPath = path.join(buildDir, 'index.html');
const notFoundPath = path.join(buildDir, '404.html');
if (fs.existsSync(indexPath) && !fs.existsSync(notFoundPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log('[postbuild] Created 404.html from index.html for SPA routing fallback');
}

