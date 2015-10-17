/**
 * Created by toby on 13/10/15.
 */

var log = require("debug")("index");
var _config = require("./config.json");
var Application = require("./application");
Application.start(_config);

var fs = require("fs");
var unzip = require("unzip");
fs.createReadStream('./ztest.zip').pipe(unzip.Extract({ path: './uz' }));


//setTimeout(function() {
//  var exec = require('child_process').exec;
//  exec('node -v', {shell:"/system/bin/sh"}, function(error, stdout, stderr) {
//    log('stdout: ' + stdout);
//    log('stderr: ' + stderr);
//    if (error !== null) {
//      log('exec error: ' + error);
//    }
//  });
//},20000);
