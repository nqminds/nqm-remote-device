/**
 * Created by toby on 13/10/15.
 */
  
module.exports = (function() {
  "use strict";
  
  var http = require("http");
  var https = require("https");
  var fs = require("fs");
  var path = require("path");
  var util = require("util");
  var url = require("url");
  var querystring = require("querystring");
  var _basePath = "./content";
  var _accessToken = "";
  
  var basicRequest = function(options, data, onResult)
  {
    var protocol = options.port == 443 ? https : http;
    var req = protocol.request(options, function(res) {
      var output = '';
      console.log(options.host + ':' + res.statusCode);
      res.setEncoding('utf8');
      
      res.on('data', function (chunk) {
        output += chunk;
      });
      
      res.on('end', function() {
        onResult(res.statusCode, output);
      });
    });
    
    req.on('error', function(err) {
      console.log("request error: ",err);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  };
  
  var sendFile = function(filePath, response) {
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
          console.log("file not found: " + fullPath);
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
        console.log("sending: " + fullPath);
        if (contentType === "text/html" && authCode.length > 0) {
          content = content.replace("<script>window.authCode = \"\";</script>", util.format("<script>window.authCode = \"%s\";</script>",authCode));
        }
        response.writeHead(200, { "Content-Type": contentType });
        response.end(content, encoding);
      }
    });
  };
  
  function start(config) {
    var server = http.createServer(function (request, response) {
      console.log("request starting...");
      var authCode = "";
  
      
      if (request.url === "/login") {
        var oauthURL = util.format("https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=%s&redirect_uri=%s/oauthCB&scope=email%20profile",config.googleClientId,config.hostURL);
        response.writeHead(301,{ Location: oauthURL });
        response.end();
      } else if (request.url.indexOf("/oauthCB") === 0) {
        var up = url.parse(request.url);
        var q = querystring.parse(up.query);
        if (q.code) {
          var options = {
            host: 'www.googleapis.com',
            port: 443,
            path: "/oauth2/v3/token",
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          };
          var postData = {
            'code': q.code,
            'client_id': config.googleClientId,
            'client_secret': config.googleSecret,
            'redirect_uri': config.hostURL + "/oauthCB",
            'grant_type': 'authorization_code'
          };
          basicRequest(options, querystring.stringify(postData), function(status,result) {
            console.log("status: %d, result: ",result);
            if (status === 200) {
              var token = JSON.parse(result);
              _accessToken = token.access_token;
            }
            response.writeHead(301,{ Location: config.hostURL });
            response.end();
          });
        } else {
          sendFile("/login");
        }
      } else {
        var filePath = "." + request.url;
        if (filePath == "./")
          filePath = "./index.html";
        sendFile(filePath);
      }
    });

    server.listen(8125);
    console.log("Server running at http://127.0.0.1:8125/");
  }
  
  return {
    start: start
  }
}());  
