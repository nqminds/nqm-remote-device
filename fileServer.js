/**
 * Created by toby on 13/10/15.
 */
  
module.exports = (function() {
  "use strict";

  var log = require("debug")("fileServer");
  var http = require("http");
  var https = require("https");
  var fs = require("fs");
  var path = require("path");
  var util = require("util");
  var url = require("url");
  var querystring = require("querystring");
  var TemplateEngine = require("./templateEngine");
  var menuCompiler = require("./menuCompiler");
  var layoutCompiler = require("./layoutCompiler");
  var _config;
  var _loginCB;
  var _basePath = "./content";
  var _templatePath = "./templates";
  var _accessToken = "";
  var _mainMenu = {
    items: [
      {name: "Apps"},
      {name: "Config"},
      {name: "Databases"}
    ]
  };
  
  var _router = {
    "/": function(request, response, data) {
      if (_accessToken.length === 0) {
        sendLayoutFile("layout.html", response, [], "login.html");
      } else {
        sendLayoutFile("layout.html", response, _mainMenu, "apps.html");
      }
    },
    "/auth": function(request, response) {
      var oauthURL = util.format("https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=%s&redirect_uri=%s/oauthCB&scope=email%20profile", _config.googleClientId, _config.hostURL);
      response.writeHead(301, {Location: oauthURL});
      response.end();
    },
    "/oauthCB": function(request, response) {
      var up = url.parse(request.url);
      var q = querystring.parse(up.query);
      if (q.code) {
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
          'code':          q.code,
          'client_id':     _config.googleClientId,
          'client_secret': _config.googleSecret,
          'redirect_uri':  _config.hostURL + "/oauthCB",
          'grant_type':    'authorization_code'
        };
        basicRequest(options, querystring.stringify(postData), function (status, result) {
          log("status: %d, result: ", result);
          if (status === 200) {
            var token = JSON.parse(result);
            _accessToken = token.access_token;
            _loginCB(_accessToken);
          }
          response.writeHead(301, {Location: _config.hostURL});
          response.end();
        });
      }
    }
  };
  
  var route = function(routeName, request, response) {
    if (_router[routeName]) {
      _router[routeName](request, response);
      return true;
    } else {
      return false;
    }
  };
  
  var basicRequest = function(options, data, onResult) {
    var protocol = options.port == 443 ? https : http;
    
    // Required to avoid EAI_BADFLAGS error on android.
    options.family = 4;
    
    var req = protocol.request(options, function(res) {
      var output = '';
      log(options.host + ':' + res.statusCode);
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

  var sendLayoutFile = function(layoutFile, response, menuItems, contentFile, contentData) {
    contentData = contentData || {};
    var menu = menuCompiler(menuItems);
    fs.readFile(path.join(_templatePath,contentFile), function(err, contentTemplate) {
      var content = TemplateEngine(contentTemplate.toString(), contentData);
      fs.readFile(path.join(_templatePath,layoutFile), function(err, layout) {
        var page = layoutCompiler(layout.toString(), menu, content);
        sendContent(response, page);
      });
    });
  };
  
  var sendLayout = function(layoutFile, response, menuItems, content) {
    menuItems = menuItems || {};
    content = content || "";
    var menu = menuCompiler(menuItems);
    fs.readFile(path.join(_templatePath,layoutFile), function(err, layout) {
      var page = layoutCompiler(layout.toString(), menu, content);
      sendContent(response, page);
    });
  };
  
  var sendContent = function(response, content, contentType, encoding) {
    contentType = contentType || "text/html";
    encoding = encoding || "utf8";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content, encoding);
  };
  
  var sendFile = function(response, filePath) {
    var encoding = "utf8";
    var contentType = "text/html";
    var extname = path.extname(filePath);
    switch (extname) {
      case ".js":
        contentType = "text/javascript";
        break;
      case ".css":
        contentType = "text/css";
        break;
      case ".json":
        contentType = "application/json";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".jpg":
        contentType = "image/jpg";
        break;
      case ".wav":
        contentType = "audio/wav";
        break;
      case ".ttf":
        contentType = "application/x-font-ttf";
        encoding = "binary";
        break;
      case ".woff":
        contentType = "application/font-woff";
        encoding = "binary";
        break;
      case ".woff2":
        contentType = "application/font-woff2";
        encoding = "binary";
        break;
    }
    
    var fullPath = path.join(_basePath, filePath);
    fs.readFile(fullPath, encoding, function(error, content) {
      if (error) {
        if(error.code == "ENOENT"){
          log("file not found: " + fullPath);
          fs.readFile("./404.html", function(error, content) {
            response.writeHead(200, { "Content-Type": contentType });
            response.end(content, "utf8");
          });
        }
        else {
          response.writeHead(500);
          response.end("Sorry, check with the site admin for error: "+error.code+" ..\n");
          response.end();
        }
      }
      else {
        log("sending: " + fullPath);
        sendContent(response, content, contentType, encoding);
      }
    });
  };
  
  function start(config, loginCB) {
    _config = config;
    _loginCB = loginCB;
    var server = http.createServer(function (request, response) {
      log("requesting ", request.url);

      var filePath = url.parse(request.url).pathname;
      
      if (!route(filePath, request, response)) {
        sendFile(response, filePath);
      }
    });

    server.listen(8125);
    log("Server running at http://127.0.0.1:8125/");
    
    return server;
  }
  
  return {
    start: start
  }
}());  
