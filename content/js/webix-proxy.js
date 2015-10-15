/**
 * Created by toby on 15/10/15.
 */

/*
 DDP data proxy for Webix
 Allows to use ddp data collections in all places where normal http urls can be used
 */
webix.proxy.ddp = {
  $proxy:true,
  /*
   some.load( webix.proxy("ddp", "Books") )
   */
  load:function(view, callback){
    this.collection = _db[this.source];
    this.query = _ddpObserve(this.source, {
      //data in ddp collection added
      added: function(post) {
        //event can be triggered while initial data loading - ignoring
        if (view.waitData.state == "pending") return;
        
        //event triggered by data saving in the same component
        if (view.ddp_saving) return;
        
        post.id = post._id+"";
        delete post._id;
        
        //do not trigger data saving events
        webix.dp(view).ignore(function(){
          view.add(post);
        });
      },
      //data in ddp collection changed
      changed: function(post) {
        //event triggered by data saving in the same component
        if (view.ddp_saving) return;
        
        var id = post._id+"";
        delete post._id;
        
        //do not trigger data saving events
        webix.dp(view).ignore(function(){
          view.updateItem(id, post);
        });
      },
      //data in ddp collection removed
      removed: function(id) {
        //event triggered by data saving in the same component
        if (view.ddp_saving) return;
        
        //do not trigger data saving events
        webix.dp(view).ignore(function(){
          view.remove(id+"");
        });
      }
    });
    
    //initial data loading
    _db[this.source].find().fetch(function(data) {
      var result = [];
      for (var i=0; i<data.length; i++){
        var record = data[i];
        record.id = record._id+"";
        delete record._id;
        result.push(record);
      }
  
      webix.ajax.$callback(view, callback, "", result, -1);
    });
  },
  save:function(view, obj, dp, callback){
    //flag to prevent triggering of onchange listeners on the same component
    view.ddp_saving = true;
    view.ddp_saving = false;
  },
};

//webix.protoUI({
//  name:"reactive",
//  $init:function(){
//    this.$ready.push(this.render);
//    this.$view.className += " webix_selectable ";
//    this.$view.style.overflow = "auto";
//  },
//  render:function(){
//    this.$view.innerHTML="";
//    if (this.config.data)
//      UI.renderWithData(Template[this.config.template], this.config.data, this.$view);
//    else
//      UI.render(Template[this.config.template], this.$view);
//  },
//  setValue:function(data){
//    this.config.data = data;
//    this.render();
//  }
//}, webix.ui.view, webix.BaseBind);
