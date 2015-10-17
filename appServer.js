/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("appServer");
  var DDPServer = require("ddp-server-reactive");
  var _config;
  var _ddpServer;
  var _xrh;
  var _heartbeat;
  var _appActions;
  var _methods = require("./methods");
  var _collections = {};
  var _actionCallbacks = {};
  
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

  var _getCollection = function(name) {
    if (!_collections[name]) {
      _collections[name] = _ddpServer.publish(name);
    }
    return _collections[name];
  };
  
  var _sendAction = function(appId, params, cb) {
    var name = "app-" + appId;
    var action = {
      id: Math.random(),
      params: params
    };
    _actionCallbacks[action.id] = cb;
    
    if (params.cmd === "start") {
      log("starting publications for %s-actions", name);
      _appActions[name] = _ddpServer.publish(name + "-actions");
    }
    
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
  
  return {
    start: _start,
    getCollection: _getCollection,
    sendAppAction: _sendAction,
    completeAppAction: _completeAppAction
  }
}());

