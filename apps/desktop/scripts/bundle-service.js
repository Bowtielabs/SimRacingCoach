import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');
const desktopDir = path.resolve(__dirname, '..');
const resourcesDir = path.join(desktopDir, 'resources');

console.log('📦 Bundling service for production...');

// Create resources directory
fs.ensureDirSync(path.join(resourcesDir, 'service'));
fs.ensureDirSync(path.join(resourcesDir, 'adapters'));

// Copy service
console.log('  Copying service...');
const serviceSrc = path.join(rootDir, 'apps/service/dist');
const serviceDest = path.join(resourcesDir, 'service');

if (!fs.existsSync(serviceSrc)) {
    console.error(`❌ Service not built! Missing: ${serviceSrc}`);
    console.error('   Run "pnpm build" from the root directory first.');
    process.exit(1);
}

fs.copySync(serviceSrc, serviceDest);

// Copy service package.json
fs.copySync(
    path.join(rootDir, 'apps/service/package.json'),
    path.join(serviceDest, 'package.json')
);

// Copy packages dependencies
console.log('  Copying package dependencies...');
const packages = ['adapters-runtime', 'api-client', 'config', 'core', 'diagnostics', 'speech'];

packages.forEach(pkg => {
    const pkgSrc = path.join(rootDir, `packages/${pkg}/dist`);
    const pkgDest = path.join(resourcesDir, 'service', 'node_modules', `@simracing/${pkg}`, 'dist');

    if (!fs.existsSync(pkgSrc)) {
        console.error(`❌ Package @simracing/${pkg} not built! Missing: ${pkgSrc}`);
        console.error('   Run "pnpm build" from the root directory first.');
        process.exit(1);
    }

    fs.ensureDirSync(path.dirname(pkgDest));
    fs.copySync(pkgSrc, pkgDest);

    // Copy package.json
    const pkgJsonSrc = path.join(rootDir, `packages/${pkg}/package.json`);
    if (fs.existsSync(pkgJsonSrc)) {
        fs.copySync(pkgJsonSrc, path.join(path.dirname(pkgDest), 'package.json'));
    }
});

// Copy ALL external npm dependencies from pnpm store
console.log('  Copying ALL external npm dependencies from pnpm...');
const pnpmBaseDir = path.join(rootDir, 'node_modules', '.pnpm');
const serviceNodeModules = path.join(resourcesDir, 'service', 'node_modules');

if (fs.existsSync(pnpmBaseDir)) {
    const pnpmDirs = fs.readdirSync(pnpmBaseDir);
    let copiedCount = 0;

    pnpmDirs.forEach(dir => {
        // Skip workspace packages (those starting with @simracing+)
        if (dir.startsWith('@simracing+') || dir.startsWith('simracing')) {
            return;
        }

        const pnpmPkgDir = path.join(pnpmBaseDir, dir);
        const nodeModulesInPnpm = path.join(pnpmPkgDir, 'node_modules');

        if (fs.existsSync(nodeModulesInPnpm)) {
            // Copy all packages from this pnpm package's node_modules
            const packages = fs.readdirSync(nodeModulesInPnpm);
            packages.forEach(pkg => {
                const pkgSrc = path.join(nodeModulesInPnpm, pkg);
                const pkgDest = path.join(serviceNodeModules, pkg);

                // Skip if already copied or is a workspace package
                if (fs.existsSync(pkgDest) || pkg.startsWith('@simracing')) {
                    return;
                }

                try {
                    fs.copySync(pkgSrc, pkgDest);
                    copiedCount++;
                } catch (err) {
                    // Ignore copy errors
                }
            });
        }
    });

    console.log(`    ✓ Copied ${copiedCount} external packages from pnpm`);
} else {
    console.warn('    ⚠ pnpm store not found');
}

// Copy adapters
console.log('  Copying adapters...');
const adaptersSrc = path.join(rootDir, 'apps/adapters');
const adaptersDest = path.join(resourcesDir, 'adapters');

if (!fs.existsSync(adaptersSrc)) {
    console.error(`❌ Adapters directory not found! Missing: ${adaptersSrc}`);
    process.exit(1);
}

fs.copySync(adaptersSrc, adaptersDest, {
    filter: (src) => {
        // Skip node_modules and source maps
        return !src.includes('node_modules') && !src.endsWith('.map');
    }
});

// Explicitly ensure critical dependencies are copied
console.log('  Ensuring critical dependencies...');
const criticalDeps = ['irsdk-node', 'pino', 'edge-tts'];
const rootNodeModules = path.join(rootDir, 'node_modules');

criticalDeps.forEach(dep => {
    const depSrc = path.join(rootNodeModules, dep);
    const depDest = path.join(serviceNodeModules, dep);

    if (fs.existsSync(depSrc) && !fs.existsSync(depDest)) {
        try {
            fs.copySync(depSrc, depDest);
            console.log(`    ✓ ${dep}`);
        } catch (err) {
            console.warn(`    ⚠ Failed to copy ${dep}`);
        }
    }
});

console.log('✅ Service bundled successfully!');
