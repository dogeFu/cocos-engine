/**
 * Builds the parity test TypeScript modules into a single browser-compatible JS bundle.
 * Output: vite/tests/parity/dist/parity-tests.js
 */

import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildTests() {
    await build({
        configFile: false,
        logLevel: 'error',
        build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: true,
            sourcemap: false,
            minify: false,
            rollupOptions: {
                input: resolve(__dirname, 'entry.ts'),
                output: {
                    format: 'iife',
                    entryFileNames: 'parity-tests.js',
                },
            },
        },
        esbuild: {
            target: 'es2020',
        },
    });
    console.log('[parity] Test bundle built → dist/parity-tests.js');
}

// Run directly
if (process.argv[1] && process.argv[1].endsWith('build-tests.mjs')) {
    buildTests().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
