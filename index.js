/**
 * Created by toby on 13/10/15.
 */

var _config = require("./config.json");
var _fileServer;
var _ddpServer;
var _xrhAccessToken;
var _datasets;
var _datasetData = {};
var _xrhConnection = require("./xrhConnection");

var datasetDataObserver = function(dataset) {
  return {
    added: function (dataId) {
      _datasetData[dataset.id][dataId] = _xrhConnection.collection(dataset.store)[dataId];
    },
    changed: function(dataId, oldFields, clearedFields, newFields) {
      _datasetData[dataset.id][dataId] = _xrhConnection.collection(dataset.store)[dataId];
    },
    removed: function(dataId, oldValue) {
      delete _datasetData[dataset.id][dataId];
    }
  };
};

var datasetObserver = {
  added: function(id) {
    console.log("got dataset %s", id);
    console.log("content is ", _xrhConnection.collection("Dataset")[id]);
    _datasets[id] = _xrhConnection.collection("Dataset")[id];
    _datasetData[_datasets[id].id] = _ddpServer.publish(_datasets[id].store);
    _xrhConnection.observe(_datasets[id].store, datasetDataObserver(_datasets[id]));
    _xrhConnection.subscribe(_xrhAccessToken, "datasetData", {id: _datasets[id].id});
  },
  changed: function(id, oldFields, clearedFields, newFields) {
    _datasets[id] = _xrhConnection.collection("Dataset")[id];
  },
  removed: function(id, oldValue) {
    delete _datasets[id];
  }
};

var onLogin = function(accessToken) {
  _xrhConnection.authenticate(accessToken, function(err, result) {
    if (err) {
      console.log("xrh connection auth error %s", err.message);
    } else {
      console.log("xrh connection auth result ", result);
      _xrhConnection.observe("Dataset", datasetObserver);
      _xrhConnection.subscribe(_xrhAccessToken, "datasets", { id: "NJxAJbJ8ge"});
    }
  });
};

var FileServer = require("./fileServer");
_fileServer = FileServer.start(_config, onLogin);

var DDPServer = require("ddp-server-reactive");
_ddpServer = new DDPServer({ httpServer: _fileServer });
_datasets = _ddpServer.publish("datasets");

_xrhConnection.start(_config, function(err, reconnect) {
  if (!err) {
    if (reconnect) {
      console.log("xrh re-connected");
    } else {
      console.log("xrh connected");
    }
  } else {
    console.log("xrh connection failed");
  }
});


//// Remove items
//delete todoList[1]
//
//// Create a reactive collection
//// All the changes below will automatically be sent to subscribers
//var todoList = server.publish("todolist");
//
//// Add items
//todoList[0] = { title: "Cook dinner", done: false };
//todoList[1] = { title: "Water the plants", done: true };
//
//// Change items
//todoList[0].done = true;

// Add methods
_ddpServer.methods({
  test: function() {
    return true;
  }
});

//setTimeout(function() {
//  var exec = require('child_process').exec;
//  exec('node -v', {shell:"/system/bin/sh"}, function(error, stdout, stderr) {
//    console.log('stdout: ' + stdout);
//    console.log('stderr: ' + stderr);
//    if (error !== null) {
//      console.log('exec error: ' + error);
//    }
//  });
//},20000);
