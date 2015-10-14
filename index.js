/**
 * Created by toby on 13/10/15.
 */

var _config = require("./config.json");
var _xrhAccessToken;

var fileServer = require("./fileServer");
fileServer.start(_config);

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

var DDPServer = require("ddp-server-reactive");

// Create a server listening on the default port 3000
var server = new DDPServer();

// Create a reactive collection
// All the changes below will automatically be sent to subscribers
var todoList = server.publish("todolist");

// Add items
todoList[0] = { title: "Cook dinner", done: false };
todoList[1] = { title: "Water the plants", done: true };

// Change items
todoList[0].done = true;

// Remove items
delete todoList[1]

// Add methods
server.methods({
  test: function() {
    return true;
  }
});

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
