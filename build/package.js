'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const baseDir = path.join(__dirname, '..');


(function createModuleZip() {
	const zipFile = fs.createWriteStream(path.join(baseDir, 'dist', 'pings.zip'));
	const archive = archiver('zip');
	archive.pipe(zipFile);
	archive.directory('src/', 'pings');
	archive.finalize();
})();

