import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import pkg from './package.json' with { type: 'json' };

// Get short git SHA for local dev (fallback to 'local' if not in a git repo)
let commitSha = 'local';
try {
  commitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* Not in a git repo */ }

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    // Inject version info into import.meta.env for Svelte components
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION ?? pkg.version),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify(process.env.VITE_APP_COMMIT ?? commitSha),
    'import.meta.env.VITE_APP_BUILD_DATE': JSON.stringify(
      process.env.VITE_APP_BUILD_DATE ?? new Date().toISOString().slice(0, 10)
    ),
  }
});
