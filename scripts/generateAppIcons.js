/**
 * OutGrid Mesh - Automated App Icon & Brand Assets Generator
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Sprint A: Brand Assets & World Basemap L2 (Task A.1)
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_SOURCE = 'C:\\Users\\thabo\\.gemini\\antigravity\\brain\\ffa0b5fe-f7a1-41f1-af87-7a7f56fd816b\\outgrid_mesh_logo_1789888894200.jpg';
const STATIC_DIR = path.resolve(__dirname, '../static');
const ANDROID_RES = path.resolve(__dirname, '../android/app/src/main/res');

if (!fs.existsSync(STATIC_DIR)) {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
}

// 1. Generate Static Web Assets using PowerShell System.Drawing
const psScript = `
Add-Type -AssemblyName System.Drawing

$srcPath = "${LOGO_SOURCE.replace(/\\/g, '\\\\')}"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source logo not found at $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Resize-And-Save($targetWidth, $targetHeight, $destPath, $format) {
    $destDir = Split-Path -Parent $destPath
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    
    $destBitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $graphics.DrawImage($srcImage, 0, 0, $targetWidth, $targetHeight)
    $graphics.Dispose()
    
    $destBitmap.Save($destPath, $format)
    $destBitmap.Dispose()
    Write-Host "Created: $destPath ($targetWidth x $targetHeight)"
}

# Web Assets
Resize-And-Save 512 512 "${STATIC_DIR.replace(/\\/g, '\\\\')}\\logo.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 180 180 "${STATIC_DIR.replace(/\\/g, '\\\\')}\\apple-touch-icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 32 32 "${STATIC_DIR.replace(/\\/g, '\\\\')}\\favicon.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# Android Mipmap Icons
Resize-And-Save 48 48 "${ANDROID_RES.replace(/\\/g, '\\\\')}\\mipmap-mdpi\\ic_launcher.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 72 72 "${ANDROID_RES.replace(/\\/g, '\\\\')}\\mipmap-hdpi\\ic_launcher.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 96 96 "${ANDROID_RES.replace(/\\/g, '\\\\')}\\mipmap-xhdpi\\ic_launcher.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 144 144 "${ANDROID_RES.replace(/\\/g, '\\\\')}\\mipmap-xxhdpi\\ic_launcher.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-And-Save 192 192 "${ANDROID_RES.replace(/\\/g, '\\\\')}\\mipmap-xxxhdpi\\ic_launcher.png" ([System.Drawing.Imaging.ImageFormat]::Png)

$srcImage.Dispose()
`;

const psFile = path.resolve(__dirname, 'temp_icon_gen.ps1');
fs.writeFileSync(psFile, psScript, 'utf8');

try {
  console.log('Generating multi-DPI brand icons from Version 1 logo...');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { stdio: 'inherit' });
} finally {
  if (fs.existsSync(psFile)) fs.unlinkSync(psFile);
}

// 2. Write Web App Manifest
const manifest = {
  name: 'OutGrid Mesh',
  short_name: 'OutGrid',
  description: 'Autonomous, Decentralized Spatial Mesh Communication Grid',
  start_url: '/',
  display: 'standalone',
  background_color: '#090d16',
  theme_color: '#090d16',
  icons: [
    {
      src: '/favicon.png',
      sizes: '32x32',
      type: 'image/png'
    },
    {
      src: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png'
    },
    {
      src: '/logo.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
};

fs.writeFileSync(path.join(STATIC_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('✅ Generated static/manifest.json');
