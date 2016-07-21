var exports = module.exports = {};
var fs = require('fs');
var https = require("https");

function loadMeta(fileName, cb) {
  fs.readFile(fileName, function(err, data) {
    if (err) {
      cb('failure');
    }
    else {
      cb(data);
    }
  })
}

function saveMeta(fileName, data) {
  fs.writeFile(fileName, JSON.stringify(data), function(err) {
    if (err) console.log('Failed to save ' + fileName);
  })
}

function updateMeta(fileName, url, cb) {
  https.get(url, function(res) {
    var body
  })
}