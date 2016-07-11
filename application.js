/**
 * Created by toby on 19/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("nqm:application");
  var express = require('express');
  var http = require("http");
  var url = require("url");
  var querystring = require("querystring");
  var path = require("path");
  var util = require("util");
  var common = require("./common");
  var _tdxConnection = require("./tdxConnection");
  var _appServer = require("./appServer");
  var _ = require("lodash");
  var _config;
  var _tdxAccessToken = "";
  var _tdxObservers = {};
  var _datasets = {};
  var _datasetData = {};
  
  var tdxConnectionHandler = function(err, reconnect) {
    if (!err) {
      log("tdx %s", (reconnect ? "re-connected" : "connected"));
      if (_tdxAccessToken) {
        _tdxLogin(_tdxAccessToken);
      }
    } else {
      log("tdx connection failed: %s",err.message);
    }
  };
  
  var _tdxLogin = function(accessToken) {
    _tdxAccessToken = accessToken;
    if (_tdxAccessToken.length > 0) {
      _tdxConnection.authenticate(_tdxAccessToken, function(err, result) {
        if (err) {
          log("tdx connection auth error %s", err.message);
          _tdxAccessToken = "";
        } else {
          log("tdx connection auth result ", result);
          if (!_tdxObservers["AS.Resource"]) {
            _tdxObservers["AS.Resource"] = _tdxConnection.observe("AS.Resource", _tdxDatasetObserver);
          }
          var datasetCollection = _appServer.getPublication("AS.Resource");
          _startSync(datasetCollection);
          _tdxConnection.subscribe("resources", { id: _config.appsInstalledDatasetId });
          _tdxConnection.subscribe("resources", { id: _config.actionsDatasetId });
          _tdxConnection.subscribe("resources", { id: _config.configurationDatasetId });
        }
      });
    } else {
      // TODO - notify ddp clients that tdx is down?
    }
  };
  
  var _startSync = function(collection) {
    for (var k in collection) {
      delete collection[k];
    }
  };
  
  var _publishData = function(dataset, doc) {
    var publish = {};
    if (dataset.id === _config.actionsDatasetId) {
      publish.collection = _appServer.getPublication("actions-" + doc.appId);
      // For actions we need to use the self-generated id.
      publish.lookup = doc.id;
    } else {
      publish.collection = _appServer.getPublication("data-" + dataset.id);
      publish.lookup = doc._id;
    }
    return publish;
  };
  
  var _tdxDatasetDataObserver = function(dataset) {
    return {
      added: function (dataId) {
        // Copy the new document from the tdx collection.
        var newDoc = _tdxConnection.collection("DatasetData")[dataId];
  
        if (newDoc._d === dataset.id) {
          // Publish the new data. 
          var publish = _publishData(dataset, newDoc);
          publish.collection[publish.lookup] = newDoc;
          
          // Store in local cache.
          _datasetData[dataset.id][publish.lookup] = newDoc; 
          if (dataset.id === _config.actionsDatasetId) {
            _processAction(newDoc);
          } else if (dataset.id === _config.appsInstalledDatasetId) {
            _processApp(newDoc);
          }
        }
      },
      changed: function(dataId, oldFields, clearedFields, newFields) {
        // Update the document using the data from the tdx collection.
        var current = _tdxConnection.collection("DatasetData")[dataId];
        
        if (current._d === dataset.id) {
          // Get the publication.
          var publish = _publishData(dataset, current);
          _datasetData[dataset.id][publish.lookup] = current;
          
          // Update publication and local cache.
          for (var clear in clearedFields) {
            delete publish.collection[publish.lookup][clear];
          }
          for (var add in newFields) {
            publish.collection[publish.lookup][add] = current[add];
          }
          if (dataset.id === _config.actionsDatasetId) {
            _processAction(current);
          } else if (dataset.id === _config.appsInstalledDatasetId) {
            _processApp(current);
          }
        }
      },
      removed: function(dataId, oldValue) {
        if (oldValue._d === dataset.id) {
          var publish = _publishData(dataset, oldValue);
          delete publish.collection[publish.lookup];
          delete _datasetData[dataset.id][publish.lookup];
        }
      }
    };
  };
  
  var _processAction = function(action) {
    if (action.status === "pending") {
      // Perform the action.
      log("perform pending action: %j", action);
      _appServer.executeAction(action, function(err, status) {
        log("_processAction: finished: %s", status);
      });
    }
  };

  var _processApp = function(app) {
    
  };
  
  var _tdxDatasetObserver = {
    added: function(id) {
      log("got dataset %s", id);
      var dataset = _tdxConnection.collection("AS.Resource")[id];
      log("content is ", dataset);
      // Store dataset in local cache.
      var collection = _appServer.getPublication("AS.Resource");
      collection[id] = dataset;
      _datasets[dataset.id] = dataset;
      _datasetData[dataset.id] = {};
      var dataCollectionName = "data-" + dataset.id;
      var dataCollection = _appServer.getPublication(dataCollectionName);
      if (!_tdxObservers[dataCollectionName]) {
        _tdxObservers[dataCollectionName] = _tdxConnection.observe("DatasetData", _tdxDatasetDataObserver(dataset));
      }
      _startSync(dataCollection);
      _tdxConnection.subscribe("datasetData", [dataset.id]);
    },
    changed: function(id, oldFields, clearedFields, newFields) {
      var dataset = _tdxConnection.collection("AS.Resource")[id];
      var collection = _appServer.getPublication("AS.Resource");
      collection[id] = dataset;
      _datasets[dataset.id] = dataset;
    },
    removed: function(id, oldValue) {
      var collection = _appServer.getPublication("AS.Resource");
      var dataset = collection[id];
      delete _datasets[dataset.id];
      delete _datasetData[dataset.id];
      delete collection[id];
    }
  };
  
  var _start = function(config) {
    _config = config;
  
    var app = express();
  
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
  
    app.get('/', function (req, res) {
      if (!_tdxAccessToken || _tdxAccessToken.length === 0) {
        res.redirect("/login");
      } else {
        res.render("apps", { config: _config });
      }
    });
    
    app.get("/login", function(req, res) {
      res.render("login");
    });
  
    app.get("/auth", function(request, response) {
      var oauthURL = util.format("%s/?rurl=%s/oauthCB", _config.authServerURL, _config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    });
    
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.access_token) {
        _tdxLogin(q.access_token);
        response.writeHead(301, {Location: _config.hostURL});
        response.end();
      }
    });
    
    app.get("/logout", function(request, response) {
      _tdxLogin("");
      response.redirect("/login");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    _tdxConnection.start(config, tdxConnectionHandler);
    _appServer.start(_datasets, _datasetData, config, server, _tdxConnection);
  };
  
  return {
    start: _start
  };
}());