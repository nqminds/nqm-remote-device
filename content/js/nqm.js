/**
 * Created by toby on 14/10/15.
 */

var _ws;
var _ddp;
var _minimongo = require("minimongo");

_db = new _minimongo.MemoryDb();
_db.addCollection("datasets");

_observers = {};
_ddpObserve = function(collectionName, handler) {
  if (!_db[collectionName]) {
    _db.addCollection(collectionName);
  }
  if (!_observers[collectionName]) {
    _observers[collectionName] = [];
  }
  _observers[collectionName].push(handler);
};

var fireObservers = function(evt, collectionName, doc) {
  if (_observers[collectionName]) {
    _observers[collectionName].forEach(function(i) {
      if (i[evt]) {
        i[evt](doc);
      }
    })
  }
};

var observeBindings = function(socket) {
  socket.on("added", function (data) {
    console.log("added");
    console.log(data);
    if (!_db[data.collection]) {
      _db.addCollection(data.collection);
    }
    //data.fields._id = data.id;
    _db[data.collection].upsert(data.fields);
    fireObservers("added", data.collection, data.fields);
  });
  
  socket.on("changed", function (data) {
    if (_db[data.collection]) {
      _db[data.collection].upsert(data.fields);
      fireObservers("changed", data.collection, data.fields);
    } else {
      console.error("no collection for changed item: " + data.collection);
    }
  });
  
  socket.on("removed", function (data) {
    if (_db[data.collection]) {
      _db[data.collection].remove({id: data.id});
      fireObservers("removed", data.collection, data.id);
    } else {
      console.error("no collection for removed item: " + data.collection);
    }
  });
};

webix.ready(function() {
  _ws = new WebSocket("ws://" + window.location.host);
  _ddp = new ddp(_ws);
  
  _ddp.connect(function() {
    observeBindings(_ddp);
    _ddpObserve("datasets", {
      added: function(doc) {
        _ddp.subscribe(doc.store);
      }
    });
    
    _ddp.subscribe("datasets", function () {});
  });
});