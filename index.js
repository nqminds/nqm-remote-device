/**
 * Created by toby on 13/10/15.
 */
  
var fileServer = require("./fileServer");

fileServer.start();

var ws = require("ws");

var socket = new ws("ws://localhost:7999","byod");
socket.on("open",function() {
  console.log("opened");
});

socket.on("error", function(err) {
  console.log(err.message);
});
