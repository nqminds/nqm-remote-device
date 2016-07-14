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
  var util = require("util");
  var _tdxConnection = require("./tdxConnection");
  var _appServer = require("./appServer");
  var _ = require("lodash");
  var _tdxAccessToken = "";
  var _subscriptionManager = require("./subscription-manager");
  var _cache = require("./cache.js");


  var ftpd = require('ftpd');
var fs = require('fs');
var path = require('path');


  var tdxConnectionHandler = function(err, reconnect) {
    if (!err) {
      log("tdx %s", (reconnect ? "re-connected" : "connected"));
      if (_tdxAccessToken) {
        _subscriptionManager.setAccessToken(_tdxAccessToken);
      }
    } else {
      log("tdx connection failed: %s",err.message);
    }
  };
  
  var _start = function(config) {  


    var keyFile;
    var certFile;
    var server;
    var options = {
      host: process.env.IP || '127.0.0.1',
      port: process.env.PORT || 7002,
      tls: null,
    };

    if (process.env.KEY_FILE && process.env.CERT_FILE) {
      console.log('Running as FTPS server');
      if (process.env.KEY_FILE.charAt(0) !== '/') {
        keyFile = path.join(__dirname, process.env.KEY_FILE);
      }
      if (process.env.CERT_FILE.charAt(0) !== '/') {
        certFile = path.join(__dirname, process.env.CERT_FILE);
      }
      options.tls = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
        ca: !process.env.CA_FILES ? null : process.env.CA_FILES
          .split(':')
          .map(function(f) {
            return fs.readFileSync(f);
          }),
      };
    } else {
      console.log();
      console.log('*** To run as FTPS server,                 ***');
      console.log('***  set "KEY_FILE", "CERT_FILE"           ***');
      console.log('***  and (optionally) "CA_FILES" env vars. ***');
      console.log();
    }

    server = new ftpd.FtpServer(options.host, {
      getInitialCwd: function() {
        return '/';
      },
      getRoot: function() {
        return process.cwd() + '/public/fileCache';
      },
      pasvPortRangeStart: 1025,
      pasvPortRangeEnd: 1050,
      tlsOptions: options.tls,
      allowUnauthorizedTls: true,
      useWriteFile: false,
      useReadFile: false,
      uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
    });

    server.on('error', function(error) {
      console.log('FTP Server error:', error);
    });

    server.on('client:connected', function(connection) {
      var username = null;
      console.log('client connected: ' + connection.remoteAddress);
      connection.on('command:user', function(user, success, failure) {
        if (user) {
          username = user;
          success();
        } else {
          failure();
        }
      });

      connection.on('command:pass', function(pass, success, failure) {
        if (pass) {
          success(username);
        } else {
          failure();
        }
      });
    });

    server.debugging = 4;
    server.listen(options.port);
    console.log('Listening on port ' + options.port);






    var app = express();
  
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    app.use('/viewer', express.static('node_modules/node-viewerjs/release'));

    app.get('/', function (req, res) {
      if (!_tdxAccessToken || _tdxAccessToken.length === 0) {
        res.redirect("/login");
      } else {
        res.render("apps", { config: config });
      }
    });
    
    app.get("/login", function(req, res) {
      res.render("login");
    });
  
    app.get("/auth", function(request, response) {
      var oauthURL = util.format("%s/?rurl=%s/oauthCB", config.authServerURL, config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    });
    
    app.get("/oauthCB", function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.access_token) {
        _tdxAccessToken = q.access_token;
        _subscriptionManager.setAccessToken(q.access_token);
        response.writeHead(301, {Location: config.hostURL});
        response.end();
      }
    });
    
    app.get("/files", function(request, response) {

      if (!_tdxAccessToken || _tdxAccessToken.length === 0) response.redirect("/login");

      else {
        _cache.getFiles(response, _tdxAccessToken);
        
      }
    });
    
    app.get("/logout", function(request, response) {
      _tdxAccessToken = "";
      _tdxLogin("");
      response.redirect("/login");
    });
        
    var server = app.listen(config.port, config.hostname, function () {
      var host = server.address().address;
      var port = server.address().port;
      log('listening at http://%s:%s', host, port);
    });
  
    _tdxConnection.start(config, tdxConnectionHandler);
    _appServer.start(config, server, _tdxConnection);
    _subscriptionManager.initialise(config, _tdxConnection, _appServer);
  };
  
  return {
    start: _start
  };
}());
