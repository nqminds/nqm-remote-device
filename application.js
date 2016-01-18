/**
 * Created by toby on 19/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("Application");
  var express = require('express');
  var http = require("http");
  var url = require("url");
  var querystring = require("querystring");
  var path = require("path");
  var util = require("util");
  var common = require("./common");
  var _xrhConnection = require("./xrhConnection");
  var _appServer = require("./appServer");
  var _ = require("lodash");
  var _config;
  var _xrhAccessToken = "";
  var _xrhObservers = {};
  var _datasets = {};
  var _datasetData = {};
  
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
          _xrhAccessToken = "";
        } else {
          log("xrh connection auth result ", result);
          if (!_xrhObservers["Dataset"]) {
            _xrhObservers["Dataset"] = _xrhConnection.observe("Dataset", _datasetObserver);
          }
          var datasetCollection = _appServer.getPublication("Dataset");
          _startSync(datasetCollection);
          _xrhConnection.subscribe("datasets", { id: {$in: [_config.appListDatasetId, _config.appsInstalledDatasetId ]} });
          _xrhConnection.subscribe("datasets", { id: _config.actionsDatasetId });
          _xrhConnection.subscribe("datasets", { id: _config.configurationDatasetId });
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
  
  var _datasetDataObserver = function(dataset) {
    return {
      added: function (dataId) {
        // Copy the new document from the xrh collection.
        var newDoc = _xrhConnection.collection(dataset.store)[dataId];
  
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
      },
      changed: function(dataId, oldFields, clearedFields, newFields) {
        // Update the document using the data from the xrh collection.
        var current = _xrhConnection.collection(dataset.store)[dataId];
        
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
      },
      removed: function(dataId, oldValue) {
        var publish = _publishData(dataset, oldValue);
        delete publish.collection[publish.lookup];
        delete _datasetData[dataset.id][publish.lookup];
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
  
  var _datasetObserver = {
    added: function(id) {
      log("got dataset %s", id);
      var dataset = _xrhConnection.collection("Dataset")[id];
      log("content is ", dataset);
      // Store dataset in local cache.
      var collection = _appServer.getPublication("Dataset");
      collection[id] = dataset;
      _datasets[dataset.id] = dataset;
      _datasetData[dataset.id] = {};
      var dataCollection = _appServer.getPublication("data-" + dataset.id);
      if (!_xrhObservers[dataset.store]) {
        _xrhObservers[dataset.store] = _xrhConnection.observe(dataset.store, _datasetDataObserver(dataset));
      }
      _startSync(dataCollection);
      _xrhConnection.subscribe("datasetData", {id: dataset.id});
    },
    changed: function(id, oldFields, clearedFields, newFields) {
      var dataset = _xrhConnection.collection("Dataset")[id];
      var collection = _appServer.getPublication("Dataset");
      collection[id] = dataset;
      _datasets[dataset.id] = dataset;
    },
    removed: function(id, oldValue) {
      var collection = _appServer.getPublication("Dataset");
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
      if (!_xrhAccessToken || _xrhAccessToken.length === 0) {
        // Hack for demo at Oxford Uni as Wifi there doesn't play well with google oauth.
//        res.redirect("/login");
        _xrhLogin("demo-hack");
        res.render("apps", { config: _config });

      } else {
        res.render("apps", { config: _config });
      }
    });
    
    app.get("/login", function(req, res) {
      res.render("login");
    });
  
    app.get("/auth", function(request, response) {
      var oauthURL = util.format("https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=%s&redirect_uri=%s/oauthCB&scope=email%20profile", _config.googleClientId, _config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    });
    
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.code) {
        var options = {
          hostname: 'www.googleapis.com',
          port:     443,
          path:     "/oauth2/v3/token",
          method:   'POST',
          headers:  {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        };
        var postData = {
          'code':          q.code,
          'client_id':     _config.googleClientId,
          'client_secret': _config.googleSecret,
          'redirect_uri':  _config.hostURL + "/oauthCB",
          'grant_type':    'authorization_code'
        };
        common.httpRequest(options, querystring.stringify(postData), function (status, result) {
          log("status: %d, result: ", status, result);
          if (status === 200) {
            var token = JSON.parse(result);
            _xrhLogin(token.access_token);
          }
          response.writeHead(301, {Location: _config.hostURL});
          response.end();
        });
      }
    });
    
    app.get("/logout", function(request, response) {
      _xrhLogin("");
      response.redirect("/login");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    _xrhConnection.start(config, xrhConnectionHandler);
    _appServer.start(_datasets, _datasetData, config, server, _xrhConnection);
  };
  
  return {
    start: _start
  };
}());