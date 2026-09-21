import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// Get short git SHA for local dev (fallback to 'local' if not in a git repo)
let commitSha = 'local';
try {
  commitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* Not in a git repo */ }

const isAndroidBuild = process.env.VITE_ANDROID_BUILD === 'true';

export default defineConfig({
  plugins: [
    sveltekit(),
    ...(isAndroidBuild ? [viteSingleFile({ useRecommendedBuildConfig: false })] : [])
  ],
  define: {
    // Inject version info into import.meta.env for Svelte components
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION ?? pkg.version),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(process.env.VITE_APP_COMMIT ?? commitSha),
    'import.meta.env.VITE_APP_BUILD_DATE': JSON.stringify(
      process.env.VITE_APP_BUILD_DATE ?? new Date().toISOString().slice(0, 10)
    ),
  }
});
