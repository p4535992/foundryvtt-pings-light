'use strict';

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

(function updateVersion() {
	const packageJson = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json')));
	const moduleJsonPath = path.join(baseDir, 'src', 'module.json');
	const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath));

	moduleJson.version = packageJson.version;

	fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, '\t') + '\n');
})();

