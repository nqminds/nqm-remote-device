/**
 * Created by toby on 18/10/15.
 */

module.exports = (function() {
  var log = require("debug")("AppProcess");
  var config = require("./config.json");
  var http = require("http");
  var https = require("https");
  var querystring = require("querystring");
  var _accessToken;
  
  function AppProcess(args, watchdog) {
    this._args = require("minimist")(args);
    this._watchdog = watchdog;
  }
  
  AppProcess.prototype.run = function() {
    var self = this;
    
    var express = require('express');
    var app = express();
    var path = require("path");
  
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    
    app.get('/', function (req, res) {
      res.render("login");
    });
    
    app.get("/oauthCB", function(req, res) {
      var code = req.query.code;
      console.log("code is: " + code);
  
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
        'code':          code,
        'client_id':     config.googleClientId,
        'client_secret': config.googleSecret,
        'redirect_uri':  config.hostURL + "/oauthCB",
        'grant_type':    'authorization_code'
      };
      basicRequest(options, querystring.stringify(postData), function (status, result) {
        log("status: %d, result: ", status, result);
        if (status === 200) {
          var token = JSON.parse(result);
          _accessToken = token.access_token;
          res.redirect("/inbox");
        } else {
          log("failed to get access token from google, status: %d", status);
          res.sendFile(path.resolve("./lib/pages/login.html"));
        }
      });
    });
    
    var findHeader = function(header, headers) {
      var val;
      for (var i = 0, len = headers.length; i < len; i++) {
        if (headers[i].name === header) {
          val = headers[i].value;
          break;
        }
      }
      return val;
    };
    
    var getMessages = function(list, msgs, idx, cb) {
      var options = {
        hostname: 'www.googleapis.com',
        port:     443,
        path:     "/gmail/v1/users/me/messages/" + msgs[idx].id + "?access_token=" + _accessToken,
        method:   'GET'
      };
  
      basicRequest(options, "", function(code, response) {
        var msg = JSON.parse(response);
        list.push({
          id: list.length,
          folder: 1,
          from: findHeader("From",msg.payload.headers),
          subject: findHeader("Subject",msg.payload.headers),
          date: findHeader("Date",msg.payload.headers)
        });
        idx++;
        if (idx < msgs.length) {
          getMessages(list, msgs, idx, cb);
        } else {
          cb();
        }
      });        
    };
    
    app.get("/inbox", function(req, res) {
      if (!_accessToken) {
        res.redirect("/");
      } else {
        log("inbox...");
        var query = "";
        var options = {
          hostname: 'www.googleapis.com',
          port:     443,
          path:     "/gmail/v1/users/me/messages?includeSpamTrash=false&maxResults=10&access_token=" + _accessToken,
          method:   'GET'
        };
  
        basicRequest(options, "", function(code, response) {
          log("response is: %j", response);
          var result = JSON.parse(response);
         
          var msgList = [];
          getMessages(msgList, result.messages, 0, function() {
            res.render("inbox", { messages: msgList.reverse() });
          });
        });
      }
    });
  
    var server = app.listen(3000, function () {
      var host = server.address().address;
      var port = server.address().port;
    
      console.log('Example app listening at http://%s:%s', host, port);
    });
  };
  
  var basicRequest = function(options, data, onResult) {
    var protocol = options.port == 443 ? https : http;
    
    // Required to avoid EAI_BADFLAGS error on android.
    options.family = 4;
    
    var req = protocol.request(options, function(res) {
      var output = '';
      log(options.hostname + ':' + res.statusCode);
      res.setEncoding('utf8');
      
      res.on('data', function (chunk) {
        output += chunk;
      });
      
      res.on('end', function() {
        onResult(res.statusCode, output);
      });
    });
    
    req.on('error', function(err) {
      log("request error: ",err);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  };
  
  return AppProcess;
}())