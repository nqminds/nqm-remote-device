/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("methods");

  return function(config, appServer, xrhConnection) {
    var _sendAppStatusToXRH = function(cmd, app) {
      xrhConnection.call(cmd, [config.appDatasetId, app], function(err, result) {
        if (err) {
          log("command failed: %s: %j", cmd, err);
        } else {
          log("command OK: %s: %j", cmd, result);
          
          // Command successful => update local cache while waiting for sync.
          var publication = appServer.getPublication("data-" + config.appDatasetId);
          publication[app.id].status = app.status;
        }
      });
    };
    
    var _setAppStatus = function(status, app) {
      log("setAppStatus %s to %s", app.appId, status);
    
      switch (status) {
        case "run":
          app.status = "starting";
          appServer.startApp(app, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
            } else {
              app.status = "running";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          appServer.publishAppAction(app, { cmd: "start" });
          break;
        case "install":
          app.status = "installing";
          appServer.installApp(app, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
            } else {
              app.status = "stopped";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          break;
        case "stop":
          app.status = "stopping";
          appServer.publishAppAction(app, { cmd: "stop" }, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
            } else {
              app.status = "stopped";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
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
    
      _sendAppStatusToXRH("/app/dataset/data/update", app);

      return true;
    };
    
    var _completeAction = function(id, err, result) {
      appServer.completeAppAction(id, err, result);
    };
  
    var _appStartedNotification = function(instId) {
      appServer.appStartedCallback(instId);
    };
    
    return {
      appStarted: _appStartedNotification,
      setAppStatus: _setAppStatus,
      completeAction: _completeAction
    }
  };
}());