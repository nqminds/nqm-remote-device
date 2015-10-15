/**
 * Created by toby on 14/10/15.
 */
  
module.exports = (function() {
  "use strict";
  var _config;
  var _accessToken;
  var _ddpClient;
  var _connected = false;
  
  var ddpInitialise = function(config, onConnect) {
    var DDPClient = require("ddp");
    if (_ddpClient) return;
    
    _config = config;
    
    _ddpClient = new DDPClient({
      host : _config.xrhServer,
      port : _config.xrhPort,
      ssl  : _config.ssl || false,
      autoReconnect : true,
      autoReconnectTimer : _config.autoReconnectTimer || 5000,
      maintainCollections : true,
      ddpVersion : '1',
      useSockJs: false
    });

    _ddpClient.connect(function(err, reconnect) {
      if (err) {
        console.log("DDP connection error: " + err.toString());
        _connected = false;
        onConnect(err);
      } else {
        _connected = true;
        _accessToken = "";
        onConnect(null,reconnect);
        if (reconnect) {
          console.log("DDP re-connected");
        }
        console.log("DDP connected");
      }
    });
  
    _ddpClient.on("socket-close", function() {
      _connected = false;
    });
  
    _ddpClient.on("socket-error", function(err) {
      console.log("socket error: %s",err.message);
      _connected = false;
    });     
  };
  
  /*
   * Authenticate using a capability token.
   * Needs work.
   */
  var ddpAuthenticateCapability = function(cb) {
    if (!_connected) {
      console.log("not connected");
    }
    _ddpClient.call("/app/auth", [_config.capCredentials], function(err, result) {
      console.log("callback");
      cb(err, result);
    });
  };
  
  /*
   * Authenticate using a google access token.
   */
  var ddpAuthenticate = function(token, cb) {
    if (!_connected) {
      console.log("not connected");
    }
    _ddpClient.call("/app/oauth", ["google",token], function(err, result) {
      console.log("callback");
      cb(err, result);
    });
  };
  
  var ddpSubscribe = function(accessToken, publication, params, cb) {
    if (!_connected) {
      console.log("ddpSubscribe - not connected");
      process.nextTick(function() { cb(new Error("not connected")); });
    }
    params.accessToken = accessToken;
    _ddpClient.subscribe(publication, [params], cb);
  };
  
  var ddpObserve = function(collection, handlers) {
    var observer = _ddpClient.observe(collection);
    observer.added = function(id) {
      console.log("[ADDED] to " + observer.name + ":  " + id);
      if (handlers.added) {
        handlers.added(id);
      }
    };
    observer.changed = function(id, oldFields, clearedFields, newFields) {
      console.log("[CHANGED] in " + observer.name + ":  " + id);
      console.log("[CHANGED] old field values: ", oldFields);
      console.log("[CHANGED] cleared fields: ", clearedFields);
      console.log("[CHANGED] new fields: ", newFields);
      if (handlers.changed) {
        handlers.changed(id, oldFields, clearedFields, newFields);
      }
    };
    observer.removed = function(id, oldValue) {
      console.log("[REMOVED] in " + observer.name + ":  " + id);
      console.log("[REMOVED] previous value: ", oldValue);
      if (handlers.removed) {
        handlers.removed(id, oldValue);
      }
    };
  };
  
  var getCollection = function(name) {
    return _ddpClient.collections[name];
  };
  
  return {
    start: ddpInitialise,
    authenticate: ddpAuthenticate,
    subscribe: ddpSubscribe,
    observe: ddpObserve,
    collection: getCollection
  }
}());

