
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Assuming script is in repo/scripts/bundle-backend.js
const repoRoot = path.resolve(__dirname, '..');

async function build() {
    const commonOptions = {
        bundle: true,
        platform: 'node',
        target: 'node18',
        external: ['electron', 'irsdk-node', 'uiohook-napi', 'node-llama-cpp', 'onnxruntime-node'], // Exclude native only
        format: 'cjs',
        minify: false, // Debugging easier if not minified initially
        sourcemap: false
    };

    // 1. Build Service
    // Run from apps/service to ensure node resolution works
    const serviceDir = path.join(repoRoot, 'apps/service');
    const serviceOut = path.join(repoRoot, 'apps/desktop/resources/service/index.js');

    console.log('Building Service from:', serviceDir);
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['./src/index.ts'], // Relative to absWorkingDir
        outfile: serviceOut,
        absWorkingDir: serviceDir
    });
    console.log('Built Service');

    // 2. Build Adapters
    // Adapters have their own deps? Usually just types if they are simple.
    // Adapters: apps/adapters/acc/adapter.mjs
    // They depend on @simracing/core etc.
    // Let's build them from repo root or their own dir if they have package.json?
    // They are in apps/adapters/... and don't have package.json usually, they rely on root or packages/.
    // 'packages/adapters/acc' has package.json. 'apps/adapters/acc' is just entry.
    // Let's build from repo root for adapters, or specific adapter app dir.

    const adapters = ['acc', 'ams2', 'actc', 'mock-iracing'];

    for (const adapter of adapters) {
        const entryRel = `apps/adapters/${adapter}/adapter.mjs`;
        const entryAbs = path.join(repoRoot, entryRel);

        if (fs.existsSync(entryAbs)) {
            console.log(`Building Adapter: ${adapter}`);
            await esbuild.build({
                ...commonOptions,
                entryPoints: [entryAbs],
                outfile: path.join(repoRoot, `apps/desktop/resources/adapters/${adapter}/adapter.js`),
                absWorkingDir: repoRoot, // Run from root to find 'packages/' via tsconfig paths if installed?
                // If resolution fails, we might need to point to specific package dirs.
                // But apps/adapters imports from packages/adapters/...
                // If pnpm workspace is healthy, root resolution works.
            });
        }
    }
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
