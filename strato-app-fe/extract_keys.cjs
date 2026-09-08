const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    try {
        fs.readdirSync(dir).forEach(f => {
            let dirPath = path.join(dir, f);
            let isDirectory = fs.statSync(dirPath).isDirectory();
            if (isDirectory) {
                walkDir(dirPath, callback);
            } else {
                callback(path.join(dir, f));
            }
        });
    } catch (e) {
        // ignore access errors
    }
}

const keys = [];
const srcDir = 'c:\\src\\PavelProjects\\arborist-fe\\src';

walkDir(srcDir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Regex to match t('key') or t('key', 'default')
        // We look for t( followed by quote.
        const regex = /[^a-zA-Z0-9_]t\s*\(\s*(['"])(.*?)\1\s*(?:,\s*(['"])(.*?)\3)?/g;

        // Also check to begin line cases? usually t is indented. But just in case.
        // Actually, [^a-zA-Z0-9] might miss `t('foo')` at start of file or line.
        // But in TSX it's usually inside `{t('...')}` or `label: t('...')`.

        let match;
        while ((match = regex.exec(content)) !== null) {
            keys.push({
                key: match[2],
                defaultValue: match[4] || match[2],
                file: filePath
            });
        }
    }
});

fs.writeFileSync('found_keys.json', JSON.stringify(keys, null, 2));
console.log('Done writing keys to found_keys.json');
