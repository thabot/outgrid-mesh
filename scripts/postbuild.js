import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve('build');

function processHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;

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
