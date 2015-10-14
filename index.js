/**
 * Created by toby on 13/10/15.
 */

var _config = require("./config.json");
var _xrhAccessToken;

var fileServer = require("./fileServer");
fileServer.start();

var xrhConnection = require("./xrhConnection");
xrhConnection.start(_config, function(err, reconnect) {
  if (!err) {
    xrhConnection.authenticate(function(err, result) {
      if (err) {
        console.log("xhr connection auth error %s", err.message);
      } else {
        console.log("xhr connection auth result ", result);
        _xrhAccessToken = result.id;
        if (!reconnect) {
          xrhConnection.subscribe(_xrhAccessToken, "datasets", {}, function(err) {
            if (err) { console.log(err); }
          });
          xrhConnection.observe("Dataset", function(id) {
            console.log("got dataset %s",id);
            console.log("content is ", xrhConnection.collection("Dataset")[id]);
          });
        }
      }
    })
  } else {
    console.log("xhr connection failed");
  }
});

setTimeout(function() {
  var exec = require('child_process').exec;
  exec('node -v', {shell:"/system/bin/sh"}, function(error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
},20000);

//var ws = require("ws");
//
//var socket = new ws("ws://localhost:7999","byod");
//socket.on("open",function() {
//  console.log("opened");
//});
//
//socket.on("error", function(err) {
//  console.log(err.message);
//});
