/**
 * Created by toby on 14/10/15.
 */

module.exports = (function() {
  var TemplateEngine = require("./templateEngine");

  return function(layout, menu, content) {
    return TemplateEngine(layout, { menu: menu, content: content });
  }
}());
