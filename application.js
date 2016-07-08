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
  var _xrhConnection = require("./xrhConnection");
  var _appServer = require("./appServer");
  var _config;
  var _xrhAccessToken = "";
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
          _xrhAccessToken = "";
        } else {
          log("xrh connection auth result ", result);
          if (!_xrhObservers["AS.Resource"]) {
            _xrhObservers["AS.Resource"] = _xrhConnection.observe("AS.Resource", _datasetObserver);
          }
          var datasetCollection = _appServer.getPublication("AS.Resource");
          _startSync(datasetCollection);
          _xrhConnection.subscribe("resources", { id: _config.appDatasetId});
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
        var dataCollection = _appServer.getPublication("DatasetData");
        var data = _xrhConnection.collection("DatasetData")[dataId];
        log("content is ", data);
        dataCollection[dataId] = data; 
      },
      changed: function(dataId, oldFields, clearedFields, newFields) {
        var dataCollection = _appServer.getPublication("DatasetData");
        var current = _xrhConnection.collection("DatasetData")[dataId];
        for (var clear in clearedFields) {
          delete dataCollection[dataId][clear];
        }
        for (var add in newFields) {
          dataCollection[dataId][add] = current[add];
        }
      },
      removed: function(dataId, oldValue) {
        var dataCollection = _appServer.getPublication("DatasetData");
        delete dataCollection[dataId];
      }
    };
  };
  
  var _datasetObserver = {
    added: function(id) {
      log("got dataset %s", id);
      var dataset = _xrhConnection.collection("AS.Resource")[id];
      log("content is ", dataset);
      // Store dataset in local cache.
      var collection = _appServer.getPublication("AS.Resource");
      collection[id] = dataset;
      var dataCollection = _appServer.getPublication("DatasetData");
      if (!_xrhObservers["DatasetData"]) {
        _xrhObservers["DatasetData"] = _xrhConnection.observe("DatasetData", _datasetDataObserver(dataset));
      }
      _startSync(dataCollection);
      _xrhConnection.subscribe("datasetData", [dataset.id]);
    },
    changed: function(id, oldFields, clearedFields, newFields) {
      var dataset = _xrhConnection.collection("AS.Resource")[id];
      var collection = _appServer.getPublication("AS.Resource");
      collection[id] = dataset;
    },
    removed: function(id, oldValue) {
      var collection = _appServer.getPublication("AS.Resource");
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
        res.redirect("/login");
      } else {
        res.render("apps");
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
        _xrhLogin(q.access_token);
        response.writeHead(301, {Location: _config.hostURL});
        response.end();
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
    _appServer.start(config, server, _xrhConnection);
  
  };
  
  return {
    start: _start
  };
}());