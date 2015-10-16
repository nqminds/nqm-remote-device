/**
 * Created by toby on 13/10/15.
 */

var log = require("debug")("index");
var _ = require("lodash");
var _config = require("./config.json");
var _fileServer;
var _ddpServer;
var _xrhAccessToken;
var _datasets;
var _datasetData = {};
var _xrhObservers = {};
var _xrhConnection = require("./xrhConnection");

var datasetDataObserver = function(dataset) {
  return {
    added: function (dataId) {
      _datasetData[dataset.id][dataId] = _xrhConnection.collection(dataset.store)[dataId];
    },
    changed: function(dataId, oldFields, clearedFields, newFields) {
      var current = _xrhConnection.collection(dataset.store)[dataId];
      for (var clear in clearedFields) {
        delete _datasetData[dataset.id][dataId][clear];  
      }
      for (var add in newFields) {
        _datasetData[dataset.id][dataId][add] = current[add];
      }
    },
    removed: function(dataId, oldValue) {
      delete _datasetData[dataset.id][dataId];
    }
  };
};

var datasetObserver = {
  added: function(id) {
    log("got dataset %s", id);
    log("content is ", _xrhConnection.collection("Dataset")[id]);
    _datasets[id] = _xrhConnection.collection("Dataset")[id];
    if (!_datasetData[_datasets[id].id]) {
      _datasetData[_datasets[id].id] = _ddpServer.publish(_datasets[id].store);
    }
    if (!_xrhObservers[_datasets[id].store]) {
      _xrhObservers[_datasets[id].store] = _xrhConnection.observe(_datasets[id].store, datasetDataObserver(_datasets[id]));
    }
    startSync(_datasetData[_datasets[id].id]);
    _xrhConnection.subscribe("datasetData", {id: _datasets[id].id});
  },
  changed: function(id, oldFields, clearedFields, newFields) {
    _datasets[id] = _xrhConnection.collection("Dataset")[id];
  },
  removed: function(id, oldValue) {
    delete _datasets[id];
  }
};

var startSync = function(collection) {
  for (var k in collection) {
    delete collection[k];
  }
};

var onLogin = function(accessToken) {
  _xrhAccessToken = accessToken;
  _xrhConnection.authenticate(_xrhAccessToken, function(err, result) {
    if (err) {
      log("xrh connection auth error %s", err.message);
    } else {
      log("xrh connection auth result ", result);
      if (!_xrhObservers["Dataset"]) {
        _xrhObservers["Dataset"] = _xrhConnection.observe("Dataset", datasetObserver);
      }
      startSync(_datasets);
      _xrhConnection.subscribe("datasets", { id: "NJxAJbJ8ge"});
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
      log("xrh re-connected");
    } else {
      log("xrh connected");
    }
    if (_xrhAccessToken) {
      onLogin(_xrhAccessToken);
    }
  } else {
    log("xrh connection failed");
  }
});

// Add methods
_ddpServer.methods({
  test: function() {
    return true;
  }
});

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
