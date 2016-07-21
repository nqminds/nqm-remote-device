var exports = module.exports = {};
var https = require('https');
var fs = require('fs');
var cacheManager = require('./cacheManager.js');

function loadLocalMeta(fileName, cb) {
	fs.readFile(fileName, function(err, data) {
		if (err) {
			cb([]);
			console.log('Viewer fatal error, failed to load local or online file list');
		}
		else {
			cb(JSON.parse(data));
		}
	})
}

function downloadMeta(url,fileName, cb) {
	https.get(url, function(res) {
		var body = '';
		res.on('data', function(chunk) {
			body += chunk;
		})
		res.on('end', function() {
			cb(JSON.parse(body));
		})
	}).on('error', function() { 
		loadLocalMeta(fileName, cb);
	})
}

function getFolderMeta(token, files, cb) {
	var url = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"resourceGroup"}';
	downloadMeta(url, 'folderMeta.json', function(folders) {
		cacheManager.createCache(files, folders, token);
		cb.render('files', {config: files, folders: folders});
	});
}

function getFileMeta(token, cb) {
	var url = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"rawFile"}';
	downloadMeta(url, 'fileMeta.json', function(files) {
		getFolderMeta(token, files, cb);
	});

}

exports.start = function (token, cb) {
  getFileMeta(token, cb);
}
