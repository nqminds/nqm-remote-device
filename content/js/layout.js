/**
 * Created by toby on 16/10/15.
 */

webix.debug = true;
webix.ui.fullScreen();
webix.ready(function() {
  webix.ui({
    id: "mainLayout",
    rows:[
      {
        view:"toolbar",
        height: 45,
        elements: [
          { view: "label", template: "<div id='picoHeader'><span class='picoHeaderTitle'>SECD &mdash; device management</span>"},
          {},
          {view:"label", template: "<div style='text-align: right;'>toby.ealden</div>" },
          {view:"icon", icon:"user"},
          {view:"icon", icon:"cog"}
        ]
      },
      contentUI,
      {
        gravity: 0.001
      }
    ]
  });
});
