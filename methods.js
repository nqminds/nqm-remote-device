/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("methods");

  return function(config, appServer, xrhConnection) {
    var _sendCommand = function(cmd, params, cb) {
      // Save command to local file cache.
      var command = {
        cmd: cmd,
        params: params,
        timestamp: Date.now(),
      };
  
      xrhConnection.call(command.cmd, [config.appDatasetId, command.params], function(err, result) {
        if (err) {
          log("command failed: %s: %j", command.cmd, err);
        } else {
          log("command OK: %s: %j", command.cmd, result);
        }
        cb(err, result);
      });
    };
    
    var _setAppStatus = function(status, app) {
      log("setAppStatus %s to %s", app.id, status);
    
      switch (status) {
        case "run":
          app.status = "running";
          appServer.sendAppAction(app.id, { cmd: "start" });
          break;
        case "install":
          app.status = "stopped";
          break;
        case "stop":
          app.status = "stopping";
          appServer.sendAppAction(app.id, { cmd: "stop" }, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
            } else {
              app.status = "stopped";
              _sendCommand("/app/dataset/data/update", app, function() {
                // Command successful => update local cache while waiting for sync.
                var collection = appServer.getCollection("data-" + config.appDatasetId);
                collection[app.id].status = app.status;
              });
            }
          });
          break;
        case "uninstall":
          app.status = "pendingInstall";
          break;
        default:
          log("unknown status: %s",status);
          break;
      }
    
      _sendCommand("/app/dataset/data/update", app, function() {
        // Command successful => update local cache while waiting for sync.
        var collection = appServer.getCollection("data-" + config.appDatasetId);
        collection[app.id].status = app.status;
      });

      return true;
    };
    
    var _completeAction = function(id, err, result) {
      appServer.completeAppAction(id, err, result);
    };
    
    return {
      setAppStatus: _setAppStatus,
      completeAction: _completeAction
    }
  };
}());