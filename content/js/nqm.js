/**
 * Created by toby on 14/10/15.
 */

$(function() {
  //var ws = new WebSocket("ws://localhost:3000");
  //ws.onmessage = function(msg) {
  //  console.log(msg);
  //};
  //ws.onopen = function() {
  //  ws.sendmessage({
  //    
  //  });
  //};
  
  $("#login").click(function(e) {
    e.preventDefault();
    window.location.replace("/login");
  });
  
  
});