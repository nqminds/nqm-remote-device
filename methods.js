/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("methods");

  return function(config, ddpServer, xrhConnection) {
    var _config = config;
    var _xrhConnection = xrhConnection;
    var _ddpServer = ddpServer;
  
    var _setAppStatus = function(status, app) {
      log("*********** called test method ************");
      log(status);
    
      switch (status) {
        case "run":
          app.status = "running";
          break;
        case "install":
          app.status = "stopped";
          break;
        case "stop":
          app.status = "stopped";
          break;
        case "uninstall":
          app.status = "pendingInstall";
          break;
        default:
          log("unknown status: %s",status);
          break;
      }
    
      // Save command to local file cache.
      var command = {
        cmd: "/app/dataset/data/update",
        params: app,
        timestamp: Date.now(),
      };
    
      _xrhConnection.call(command.cmd, [_config.appDatasetId, command.params], function(err, result) {
        if (err) {
          log("command failed: %s: %j", command.cmd, err);
        } else {
          log("command OK: %s: %j", command.cmd, result);
          // Command successful => update local cache while waiting for sync.
          var collection = _ddpServer.getCollection("data-" + _config.appDatasetId);
          collection[app.id].status = app.status;
        }
      });
    
      return true;
    };
    
    return {
      setAppStatus: _setAppStatus
    }
  };
}());