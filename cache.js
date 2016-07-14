var exports = module.exports = {};
var https = require("https");
var fs = require('fs');

function downloadFile(url, fileName) {

	var file = fs.createWriteStream(fileName);
	https.get(url, function(res) {
		res.pipe(file);
		file.on('finish', function() {
			file.close();
		});

	}).on('error', function() {
			console.log("Could not write file");

	});
}

function cacheFiles(fileList, oldList, token) {

	for (var i = 0; i < fileList.length; i++) {
		var url = 'https://q.nqminds.com/v1/resource/' + fileList[i].id + '?access_token=' + token;
		var fileName = './public/fileCache/' + fileList[i].store;
		fs.stat(fileName, function(err, stats) {
			if (err) {
				console.log(this.fileName + " does not exist in cache, downloading")
				downloadFile(this.url, this.fileName);
			}
			else if (stats.isFile()) {
				var j = 0;
				while (j < oldList.length) {
					if (fileList[this.i].id == oldList[j].id) {
						if (fileList[this.i].modified != oldList[j].modified){
							
					    	console.log(this.fileName + " is out of date, redownloading")
					    	downloadFile(this.url, this.fileName);
						}
						j = oldList.length;
					}
					j++;
				}
			}
		}.bind({i: i, url: url, fileName: fileName}))
		
	}

}


function createCache(fileList, token, fileStruct) {
	var oldList;
	fs.readFile("fileCache.json", function(err, data) {
		if (err) {
			console.log("Meta corrupt or not found");
			oldList = [];
		}
		else { 
			try{
				oldList = JSON.parse(data);
			} catch(e) {
				oldList = [];
			}
		}

		fs.writeFile("fileCache.json", JSON.stringify(fileList), function(err) {
			if (err) console.log("Failed to write meta to cache");
			cacheFiles(fileList, oldList, token);
		})
		fs.writeFile("fileStruct.json", JSON.stringify(fileStruct), function(err) {
			if (err) console.log("Failed to write file structure to cache");
		})

	})

	

};

exports.getFiles = function(cb, token) {
	var url = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"rawFile"}';

	https.get(url, function(res) {
		var body = '';

		res.on('data', function(chunk) {
			body += chunk;
		});

		res.on('end', function() {
			var fileList = JSON.parse(body);
            
            var fileUrl = 'https://q.nqminds.com/v1/datasets?access_token=' + token + '&filter={"baseType":"resourceGroup"}';

            https.get(fileUrl, function(res) {
            	var body = '';

            	res.on('data', function(chunk) {
            		body += chunk;
            	})

            	res.on('end', function(){
            		var folderList = JSON.parse(body);
            		createCache(fileList, token, folderList);
            		cb.render("files", { config: fileList, folders: folderList});
            	})

            })


          
		});

	}).on('error', function() {
			fs.readFile('fileCache.json', function(err, data) {

              if (err) response.status(500).send('Internal Server Error');

              else {
                var fileList = JSON.parse(data);
                var folderList = [];
                fs.readFile('fileStruct.json', function(err, data) {
                	if (err) response.status(500).send('Internal Server Error');
                	else {
                		folderList = JSON.parse(data);
                		cb.render("files", { config: fileList, folders: folderList });
                	}
                })

              }
            });

	});

	
};