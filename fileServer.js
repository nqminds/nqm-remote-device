/**
 * Created by toby on 13/10/15.
 */
  
module.exports = (function() {
  "use strict";
  
  var http = require('http');
  var fs = require('fs');
  var path = require('path');
  
  var _basePath = "./content";
  var _server = http.createServer(function (request, response) {
    console.log('request starting...');
    
    var filePath = '.' + request.url;
    if (filePath == './')
      filePath = './index.html';
    
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.ttf':
        contentType = 'application/x-font-ttf';
        break;
      case '.woff':
        contentType = 'application/font-woff';
        break;
      case '.woff2':
        contentType = 'application/font-woff2';
        break;
    }
    
    var fullPath = path.join(_basePath, filePath);
    fs.readFile(fullPath, "binary", function(error, content) {
      if (error) {
        if(error.code == 'ENOENT'){
          console.log("file not found: " + fullPath);
          fs.readFile('./404.html', function(error, content) {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf8');
          });
        }
        else {
          response.writeHead(500);
          response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
          response.end();
        }
      }
      else {
        console.log("sending: " + fullPath);
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content, 'binary');
      }
    });
    
  });
  
  function start() {
    _server.listen(8125);
    console.log('Server running at http://127.0.0.1:8125/');
  }
  
  return {
    start: start
  }
}());  
