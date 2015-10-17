/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("ddpServer");
  var DDPServer = require("ddp-server-reactive");
  var _config;
  var _ddpServer;
  var _xrh;
  var _heartbeat;
  var _methods = require("./methods");
  var _collections = {};

  var _start = function(config, httpServer, xrh) {
    _config = config;
    _xrh = xrh;
    _ddpServer = new DDPServer({ httpServer: httpServer });

    _startHeartbeat(_config.heartbeatInterval);
    
    // Add methods
    var methods = _methods(config, this,_xrh);
    _ddpServer.methods(methods);
  };

  var _startHeartbeat = function(interval) {
    // Publish heartbeat collection.
    _heartbeat = _ddpServer.publish("heartbeat");
  
    // Start heartbeat.
    setInterval(function() {
      log("sending heartbeat");
      _heartbeat[0] = { hb: Date.now() };
    }, interval);
  };

  var _getCollection = function(name) {
    if (!_collections[name]) {
      _collections[name] = _ddpServer.publish(name);
    }
    return _collections[name];
  };
  
  return {
    start: _start,
    getCollection: _getCollection
  }
}());

