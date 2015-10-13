/**
 * Created by toby on 03/09/15.
 */

nqm = (function() {
  var _connectionCache = {};

  var loadScript = function(script,cb) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.onreadystatechange = function () {
      if (this.readyState == 'complete') {
        cb();
      }
    }
    script.onload = cb;
    script.src = script;
    head.appendChild(script);    
  };

  // TODO - this needs to be done properly with recursion and array support etc.
  var mergeItem = function(item, props) {
    for (var p in props) {
      item[p] = props[p];
    }
  }

  var parseURL = function(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
  };

  var registerSocket = function(connectUrl, socket) {
    var self = this;

    socket.on("added", function(data) {
      console.log("added");
      console.log(data);
      if (!self._collections.hasOwnProperty(data.collection)) {
        self._collections[data.collection] = [];
      }
      data.fields._id = data.id;
      self._collections[data.collection].push(data.fields);
    });

    socket.on("changed", function(data) {
      if (self._collections.hasOwnProperty(data.collection)) {
        var coll = self._collections[data.collection];
        for (var i = 0, len = coll.length; i < len; i++) {
          if (coll[i].id === data.id) {
            mergeItem(coll[i],data.fields);
            break;
          }            
        }
      } else {
        console.error("no collection for changed item: " + data.collection);
      }
    });

    socket.on("removed", function(data) {
      if (self._collections.hasOwnProperty(data.collection)) {
        var coll = self._collections[data.collection];
        for (var i = 0, len = coll.length; i < len; i++) {
          if (coll[i].id === data.id) {
            coll.splice(i,1);
            break;
          }            
        }
      } else {
        console.error("no collection for removed item: " + data.collection);
      }
    });

    socket.on("error", function(err) {
      console.log("socket error: " + err.message);
      delete _connectionCache[connectUrl];
    });

    socket.on("close", function() {
      console.log("socket closed ");
      delete _connectionCache[connectUrl];
    });
  };

  var findCollection = function(name) {
    return this._collections[name];
  };

  var findInCollection = function(name, id) {
    var coll = findCollection.call(this,name);  
    var item;
    if (coll) {
      for (var i = 0, len = coll.length; i < len; i++) {
        if (coll[i].id === id) {
          item = coll[i];
          break;
        }            
      }      
    } else {
      console.log("collection not found: " + name);
    }
    return item;
  };

  var login = function(opts, cb) {
    var self = this;
    if (opts.provider === "google") {
      // First create a stamped token for the given oauth token.
      this._ddp.call("/app/oauth", "google", opts.token, function(err, result) {
        if (err) {
          console.error(err);          
          cb(err);
        } else {
          console.log("app/oauth result: " + JSON.stringify(result));          
          cb(err,result);

          // Now perform the DDP login using the received token.
          // self._ddp.call("login", { resume: result }, function(err, result) {
          //   if (err) {
          //     console.log("ddp login failed: " + err.message);              
          //   } else {
          //     console.log("ddp login OK: " + JSON.stringify(result));
          //   }
          //   cb(err,result);
          // });
        } 
      });
    } else {
      console.error("only google auth supported currently");
    }
  };

  function ConnectionData(authToken, url) {
    var self = this;
    this._authToken = authToken;
    this._connected = false;
    this._collections = [];
    this._ws = new WebSocket(url);
    this._ws.onerror = function(err) {
      console.error("lost connection: " + url + " - " + err.message);
      this._ws = null;
      this._ddp = null;
      if (!this._connected) {
        this.connectionCallbacks.forEach(function(cb) { cb(err); });
      }
    };
    this._ws.onclose = function() {
      console.log("connection closed: " + url);
      this._ws = null;
      this._ddp = null;
    };
    this._ddp = new ddp(this._ws);

    this._ddp.connect(function() {
      registerSocket.call(self, url, self._ddp);
      login.call(self,self._authToken,function(err) {
        if (!err) {
          self._connected = true;          
        }
        self.connectionCallbacks.forEach(function(cb) { cb(err); });
      });  
    });
    this.connectionCallbacks = [];
  }

  ConnectionData.prototype.onConnected = function(cb) {
    if (this._connected) {
      setTimeout(cb,0);
    } else {
      this.connectionCallbacks.push(cb);      
    }
  }

  ConnectionData.prototype.getDatasetMeta = function(lookup,cb) {
    var self = this;
    this._ddp.subscribe("datasets", [lookup], function(err) {
      if (!err) {
        console.log("******* datasets are ready ***************");      
        var id = lookup.id;
        if (id) {
          var item = findInCollection.call(self,"Dataset",id);
          cb(err,item);
        } else {
          cb(err);        
        }
      } else {
        console.error(err);
      }
    });    
  };

  ConnectionData.prototype.getDatasetData = function(dataset,cb) {
    var self = this;
    var lookup = {id: dataset.id};
    this._ddp.subscribe("datasetData", [lookup], function(err) {
      console.log("******* dataset data ready ***************");      
      var coll = findCollection.call(self,dataset.store);
      cb(err,coll);
    });    
  };  

  var getDataset = function(authToken, uri, cb) {
    // Parse the URI and determine the destination server and dataset id.
    var parsed = parseURL(uri);
    var pathComponents = parsed.pathname.split("/");
    var datasetId = pathComponents[pathComponents.length-1];
    var connectUrl = "ws://" + parsed.hostname + ":" + parsed.port + "/websocket";

    // Check if there is already a connection to the destination server.
    if (!_connectionCache.hasOwnProperty(connectUrl)) {
      var newConn = new ConnectionData(authToken, connectUrl, cb);
      _connectionCache[connectUrl] = newConn;
    } 
    var connection = _connectionCache[connectUrl];
    connection.onConnected(function(err) {
      if (!err) {
        connection.getDatasetMeta({id: datasetId},function(err,ds) {
          if (!err) {
            connection.getDatasetData(ds, function(err, data) {
              var result = {
                meta: ds,
                data: data
              };
              cb(err, result);
            });
          }
        });
      } else {
        console.error(err.message);
        cb(err);
      }
    });
  };

  return {
    dataset: getDataset
  }

}());

