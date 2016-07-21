var exports = module.exports = {};
var fs = require('fs');
var downloadManager = require('./downloadManager.js');

function fileStatus(files, oldFiles, filesDl, token, cb) {
	var i = 0;
	var found = false;
	var upToDate = true;

	while (i < oldFiles.length && found == false) {
		if (files[0].id == oldFiles[i].id ) {
			if (files[0].modified != oldFiles[i].modified) {
				upToDate = false;
			}
			found = true;
		}
		i++;
	}
	if (!found || !upToDate) {
		var file = {url: 'https://q.nqminds.com/v1/resource/' + files[0].id + '?access_token=' + token, fileName: './public/fileCache/' + files[0].store}
		filesDl.push(file);
	}
	files.shift();	
	if (files[0]) {
		fileStatus(files, oldFiles, filesDl, token, cb);
	}
	else {
		cb(filesDl);
	}
}

exports.createCache = function createCache(files, folders, token) {
	var oldFiles;
	fs.readFile("fileMeta.json", function(err, data) {
		if (err) {
			console.log("File meta corrupt or not found");
			oldFiles = [];
		}
		else { 
			try{
				oldFiles = JSON.parse(data);
			} catch(e) {
				oldFiles = [];
			}
		}

		fs.writeFile("fileMeta.json", JSON.stringify(files), function(err) {
			if (err) console.log("Failed to write meta to cache");
			fileStatus(files, oldFiles, [], token, function(filesDl) {
				downloadManager.startDownload(filesDl);
			});
		})
		fs.writeFile("folderMeta.json", JSON.stringify(folders), function(err) {
			if (err) console.log("Failed to write file structure to cache");
		})

	})
}