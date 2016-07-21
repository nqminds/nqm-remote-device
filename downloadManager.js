var exports = module.exports = {};
var https = require('https');
var fs = require('fs');

function download(file, cb) {
	var fileLocal = fs.createWriteStream(file.fileName);
	https.get(file.url, function(res) {
		res.pipe(fileLocal);
		res.on('end', function() {
			fileLocal.close();
			cb();
		});

	}).on('error', function() {
			console.log('Could not update/download file: ' + file.fileName);
      fileLocal.close();
			cb();
	});
}

function queueDownload(files) {
	if(files[0]) {
		download(files.shift(), function() {
			queueDownload(files);
		})
	}
	else return;
}

exports.startDownload = function startDownload(files) {
	queueDownload(files);
}

