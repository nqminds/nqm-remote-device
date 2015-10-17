/**
 * Created by toby on 13/10/15.
 */
  
module.exports = (function() {
  "use strict";

  var log = require("debug")("application");
  var http = require("http");
  var _config;
  var _xrhAccessToken = "";
  var _router = require("./router");
  var _xrhConnection = require("./xrhConnection");
  var _appServer = require("./appServer");
  var _xrhObservers = {};

  var xrhConnectionHandler = function(err, reconnect) {
    if (!err) {
      log("xrh %s", (reconnect ? "re-connected" : "connected"));
      if (_xrhAccessToken) {
        _xrhLogin(_xrhAccessToken);
      }
    } else {
      log("xrh connection failed: %s",err.message);
    }
  };
  
  var _xrhLogin = function(accessToken) {
    _xrhAccessToken = accessToken;
    if (_xrhAccessToken.length > 0) {
      _xrhConnection.authenticate(_xrhAccessToken, function(err, result) {
        if (err) {
          log("xrh connection auth error %s", err.message);
          _clearAccessToken();
        } else {
          log("xrh connection auth result ", result);
          if (!_xrhObservers["Dataset"]) {
            _xrhObservers["Dataset"] = _xrhConnection.observe("Dataset", _datasetObserver);
          }
          var datasetCollection = _appServer.getCollection("Dataset");
          _startSync(datasetCollection);
          _xrhConnection.subscribe("datasets", { id: _config.appDatasetId});
        }
      });
    } else {
      // TODO - notify ddp clients that xrh is down?
    }
  };
  
  var _startSync = function(collection) {
    for (var k in collection) {
      delete collection[k];
    }
  };
  
  var _datasetDataObserver = function(dataset) {
    return {
      added: function (dataId) {
        var dataCollection = _appServer.getCollection("data-" + dataset.id);
        dataCollection[dataId] = _xrhConnection.collection(dataset.store)[dataId];
      },
      changed: function(dataId, oldFields, clearedFields, newFields) {
        var dataCollection = _appServer.getCollection("data-" + dataset.id);
        var current = _xrhConnection.collection(dataset.store)[dataId];
        for (var clear in clearedFields) {
          delete dataCollection[dataId][clear];
        }
        for (var add in newFields) {
          dataCollection[dataId][add] = current[add];
        }
      },
      removed: function(dataId, oldValue) {
        var dataCollection = _appServer.getCollection("data-" + dataset.id);
        delete dataCollection[dataId];
      }
    };
  };
  
  var _datasetObserver = {
    added: function(id) {
      log("got dataset %s", id);
      var dataset = _xrhConnection.collection("Dataset")[id];
      log("content is ", dataset);
      // Store dataset in local cache.
      var collection = _appServer.getCollection("Dataset");
      collection[id] = dataset;
      var dataCollection = _appServer.getCollection("data-" + dataset.id);
      if (!_xrhObservers[dataset.store]) {
        _xrhObservers[dataset.store] = _xrhConnection.observe(dataset.store, _datasetDataObserver(dataset));
      }
      _startSync(dataCollection);
      _xrhConnection.subscribe("datasetData", {id: dataset.id});
    },
    changed: function(id, oldFields, clearedFields, newFields) {
      var dataset = _xrhConnection.collection("Dataset")[id];
      var collection = _appServer.getCollection("Dataset");
      collection[id] = dataset;
    },
    removed: function(id, oldValue) {
      var collection = _appServer.getCollection("Dataset");
      delete collection[id];
    }
  };
  
  function _start(config, loginCB) {
    _config = config;
    _router.setLoginCallback(_xrhLogin);
    
    var server = http.createServer(_router.routeRequest);

    server.listen(8125);
    log("Server running at http://127.0.0.1:8125/");
  
    _xrhConnection.start(config, xrhConnectionHandler);
    _appServer.start(config, server, _xrhConnection);
  
    return server;
  }
  
  function _clearAccessToken() {
    _xrhAccessToken = "";
  }
  
  return {
    start: _start
  }
}());  
