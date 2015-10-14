/**
 * Created by toby on 14/10/15.
 */

module.exports = (function() {
  var TemplateEngine = require("./templateEngine");
  
  var menuTemplate = "<ul>" +
      "<%for (var i=0, len = this.items.length; i < len; i++) {%>" +
        "<li>" +
          "<strong><%this.items[i].name%></strong>" +
        "</li>" +
      "<%}%>" +
    "</ul>"
  
  return function(menu) {
    if (menu.items && menu.items.length > 0) {
      return TemplateEngine(menuTemplate, menu);
    } else {
      return "<ul></ul>";
    }
  }
}());
