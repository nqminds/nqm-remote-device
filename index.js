/**
 * Created by toby on 13/10/15.
 */

var log = require("debug")("index");
var _ = require("lodash");
var _config = require("./config.json");
var FileServer = require("./fileServer");
var _xrhConnection = require("./xrhConnection");
var _ddpServer = require("./ddpServer");
var _fileServer;
var _xrhAccessToken;
var _xrhObservers = {};

var datasetDataObserver = function(dataset) {
  return {
    added: function (dataId) {
      var dataCollection = _ddpServer.getCollection("data-" + dataset.id);
      dataCollection[dataId] = _xrhConnection.collection(dataset.store)[dataId];
    },
    changed: function(dataId, oldFields, clearedFields, newFields) {
      var dataCollection = _ddpServer.getCollection("data-" + dataset.id);
      var current = _xrhConnection.collection(dataset.store)[dataId];
      for (var clear in clearedFields) {
        delete dataCollection[dataId][clear];  
      }
      for (var add in newFields) {
        dataCollection[dataId][add] = current[add];
      }
    },
    removed: function(dataId, oldValue) {
      var dataCollection = _ddpServer.getCollection("data-" + dataset.id);
      delete dataCollection[dataId];
    }
  };
};

var datasetObserver = {
  added: function(id) {
    log("got dataset %s", id);
    var dataset = _xrhConnection.collection("Dataset")[id];
    log("content is ", dataset);
    // Store dataset in local cache.
    var collection = _ddpServer.getCollection("Dataset");
    collection[id] = dataset;
    var dataCollection = _ddpServer.getCollection("data-" + dataset.id);
    if (!_xrhObservers[dataset.store]) {
      _xrhObservers[dataset.store] = _xrhConnection.observe(dataset.store, datasetDataObserver(dataset));
    }
    startSync(dataCollection);
    _xrhConnection.subscribe("datasetData", {id: dataset.id});
  },
  changed: function(id, oldFields, clearedFields, newFields) {
    var dataset = _xrhConnection.collection("Dataset")[id];
    var collection = _ddpServer.getCollection("Dataset");
    collection[id] = dataset;
  },
  removed: function(id, oldValue) {
    var collection = _ddpServer.getCollection("Dataset");
    delete collection[id];
  }
};

var startSync = function(collection) {
  for (var k in collection) {
    delete collection[k];
  }
};

var _onXRHLogin = function(accessToken) {
  _xrhAccessToken = accessToken;
  _xrhConnection.authenticate(_xrhAccessToken, function(err, result) {
    if (err) {
      log("xrh connection auth error %s", err.message);
      _xrhAccessToken = "";
      FileServer.clearAccessToken();
    } else {
      log("xrh connection auth result ", result);
      if (!_xrhObservers["Dataset"]) {
        _xrhObservers["Dataset"] = _xrhConnection.observe("Dataset", datasetObserver);
      }
      var datasetCollection = _ddpServer.getCollection("Dataset");
      startSync(datasetCollection);
      _xrhConnection.subscribe("datasets", { id: _config.appDatasetId});
    }
  });
};

_fileServer = FileServer.start(_config, _onXRHLogin);
_ddpServer.start(_config, _fileServer, _xrhConnection);
_xrhConnection.start(_config, function(err, reconnect) {
  if (!err) {
    log("xrh %s", (reconnect ? "re-connected" : "connected"));
    if (_xrhAccessToken) {
      _onXRHLogin(_xrhAccessToken);
    }
  } else {
    log("xrh connection failed: %s",err.message);
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
