// Script to find ALL external dependencies recursively
const fs = require('fs-extra');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..', '..');
const packagesDir = path.join(rootDir, 'packages');

const allDeps = new Set();

function getPackageDeps(pkgPath) {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8'));
    const deps = { ...pkgJson.dependencies };

    Object.keys(deps).forEach(dep => {
        if (!dep.startsWith('@simracing/')) {
            allDeps.add(dep);
        }
    });
}

// Scan all workspace packages
const packages = fs.readdirSync(packagesDir);
packages.forEach(pkg => {
    const pkgPath = path.join(packagesDir, pkg);
    if (fs.existsSync(path.join(pkgPath, 'package.json'))) {
        getPackageDeps(pkgPath);
    }
});

console.log(JSON.stringify([...allDeps]));
