const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const nodes = packageJson['node-red'].nodes;

const checkFileExists = (filePath) => {
    try {
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
};

const missingFiles = [];

Object.entries(nodes).forEach(([nodeName, jsPath]) => {
    const dir = path.dirname(jsPath);
    const baseName = path.basename(jsPath, '.js');

    const jsFilePath = path.resolve(jsPath);
    const htmlFilePath = path.resolve(dir, `${baseName}.html`);

    const jsExists = checkFileExists(jsFilePath);
    const htmlExists = checkFileExists(htmlFilePath);

    if (!jsExists || !htmlExists) {
        missingFiles.push({
            node: nodeName,
            missing: {
                js: !jsExists,
                html: !htmlExists
            }
        });
    }
});

if (missingFiles.length > 0) {
    console.error('Missing files detected:');

    missingFiles.forEach(({node, missing}) => {
        console.error(`Node: ${node}`);

        if (missing.js) {
            console.error(`Missing .js file`);
        }

        if (missing.html) {
            console.error(`Missing .html file`);
        }
    });
    throw new Error('Some node files are missing. Check the logs above for details.');
} else {
    console.log('All node files (.js and .html) exist.');
}