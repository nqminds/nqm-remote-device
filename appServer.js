/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("appServer");
  var DDPServer = require("ddp-server-reactive");
  var shortId = require("shortid");
  var _config;
  var _ddpServer;
  var _xrh;
  var _heartbeat;
  var _appActions;
  var _methods = require("./methods");
  var _publications = {};
  var _actionCallbacks = {};
  var _appStartCallbacks = {};
  
  var _start = function(config, httpServer, xrh) {
    _config = config;
    _xrh = xrh;
    _ddpServer = new DDPServer({ httpServer: httpServer });

    _startHeartbeat(_config.heartbeatInterval);
    _startAppActions();
    
    // Add methods
    var methods = _methods(config, this, _xrh);
    _ddpServer.methods(methods);
  };

  var _startHeartbeat = function(interval) {
    // Publish heartbeat collection.
    _heartbeat = _ddpServer.publish("heartbeat");
  
    // Start heartbeat.
    setInterval(function() {
      log("sending heartbeat");
      _heartbeat[0] = { hb: 1 };
    }, interval);
  };
  
  var _startAppActions = function() {
    _appActions = {};
  };

  var _getPublication = function(name) {
    if (!_publications[name]) {
      _publications[name] = _ddpServer.publish(name);
    }
    return _publications[name];
  };
  
  var _sendAction = function(app, params, cb) {
    var name = "app-" + app.appId;
    var action = {
      id: shortId.generate(),
      params: params
    };
    _actionCallbacks[action.id] = cb;
    _appActions[name][action.id] = action;
  };
  
  var _completeAppAction = function(id, err, result) {
    log("completing action %s", id);
    if (err) {
      log("action error: %s",err.message);
    } else {
      log("action result: ",result);
    }
    if (_actionCallbacks[id]) {
      _actionCallbacks[id](err, result);
      delete _actionCallbacks[id];
    }
  };
  
  var _installApp = function(id, cb) {
    
  };
  
  var _startApp = function(app, cb) {
    var name = "app-" + app.appId;
    if (!_appActions[name]) {
      log("starting publications for application id %s [%s-actions]", name, name);
      _appActions[name] = _ddpServer.publish(name + "-actions");
    } else {
      // Clear any existing actions.
      log("clearing existing app actions for %s",name);
      var keys = Object.keys(_appActions[name]);
      for (var k in keys) {
        delete _appActions[name][keys[k]];
      }
    }
    
    var path = require("path");
    var util = require("util");
    var spawn = require('child_process').spawn;
    var nodePath = util.format("%snode",_config.nodePath);
    var appArgs = util.format("index.js --appInst=%s --server=%s --port=%d", app.appId, _config.hostname, _config.port).split(" ");
    appArgs = appArgs.concat(app.params.split(" "));
    var cwd = path.resolve(util.format("%s/%s",_config.appsPath,app.appId));
  
    _appStartCallbacks[app.appId] = cb;
    log("starting app:");
    log("%s %j", nodePath, appArgs);
    log("cwd: %s", cwd);
    spawn(nodePath, appArgs, { cwd: cwd, stdio: "inherit" });
  };
  
  var _appStartedCallback = function(instId) {
    if (_appStartCallbacks[instId]) {
      _appStartCallbacks[instId]();
    }
  };
  
  return {
    start:             _start,
    getPublication:    _getPublication,
    publishAppAction:  _sendAction,
    completeAppAction: _completeAppAction,
    installApp:        _installApp,
    startApp:          _startApp,
    appStartedCallback: _appStartedCallback
  }
}());

