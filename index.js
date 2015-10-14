/**
 * Created by toby on 13/10/15.
 */

var config = require("./config.json");

var fileServer = require("./fileServer");
fileServer.start();

var DDPClient = require("ddp");
var _ddpclient = new DDPClient({
    host : config.xrhServer,
    port : config.xrhPort,
    ssl  : config.ssl || false,
    autoReconnect : true,
    autoReconnectTimer : config.autoReconnectTimer || 5000,
    maintainCollections : true,
    ddpVersion : '1',
    useSockJs: false
  });

var _connected = false;
_ddpclient.connect(function(error, reconnect) {
  if (error) {
    console.log("DDP connection error: " + error.toString());
  } else {
    _connected = true;
    if (reconnect) {
      console.log("DDP re-connected");
    }
    console.log("DDP connected");
    _ddpclient.call("/app/auth", [config.capCredentials], function(err, result) {
      console.log("callback");
      if (err) {
        console.log("/app/auth error %s", err.message);
      } else {
        console.log("/app/auth result: %s", JSON.stringify(result));
        _ddpclient.subscribe("datasets",[{accessToken: result.id}],function() {
          console.log("%j",_ddpclient.collections.Dataset);
        });
      }
    }, function() {
      console.log("updated callback");
    });
  }
});

setTimeout(function() {
  var exec = require('child_process').exec;
  exec('node -v', function(error, stdout, stderr) {
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
