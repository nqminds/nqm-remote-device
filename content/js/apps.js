/**
 * Created by toby on 16/10/15.
 */

var activeItem;

function showAppDetails(bind, propertySheet) {
  var elements = [
    {label: "deviceId", type: "text", id: "deviceId"},
    {label: "appId", type: "text", id: "appId"},
    {label: "name", type: "text", id: "name"},
    {label: "appUrl", type: "text", id: "appUrl"},
    {label: "status", type: "text", id: "status"}
  ];
  propertySheet.define("elements",elements);
  propertySheet.parse(bind);
  
  $$("installButton").hide();
  $$("runButton").hide();
  $$("uninstallButton").hide();
  $$("stopButton").hide();
  
  switch (bind.status) {
    case "pendingInstall":
      $$("installButton").show();
      break;
    case "stopped":
      $$("runButton").show();
      $$("uninstallButton").show();
      break;
    case "running":
      $$("stopButton").show();
      break;
    default: 
      break;
  }
}

function onDataNotify(evt) {
  if (activeItem && evt && evt.data.id === activeItem.id) {
    appListClick(activeItem,$$("appDetailsData"));
  }
}

function appListClick(item, propertySheet) {
  activeItem = item;
  
  var bind = {
    deviceId: item.deviceId,
    appId: item.appId,
    name: item.name,
    appUrl: item.appURL,
    status: item.status
  };
  showAppDetails(bind, propertySheet);
}

var contentUI = {
  type: "space",
  cols: [
    {
      header: "notifications",
      collapsed: true,
      body: {
        rows: [
          { view: "label", template: "<div>nick allott requests access to file-system.read</div>" },
          { view: "label", template: "<div>nick allott requests access to front-room.temperature</div>" },
          {}
        ]
      }
    },
    {
      view: "scrollview",
      scroll: "y",
      body: {
        rows: [
          {
            id:        "appsTabBar",
            view:      "tabview",
            minHeight: 150,
            maxHeight: 300,
            tabbar:    {optionWidth: 100},
            multiview: {animate: true},
            gravity:   1,
            cells:     [
              {
                header: "running",
                body:   {
                  id:       "runningList",
                  view:     "list",
                  template: "#name#",
                  css: "secd-apps-list",
                  url:      webix.proxy("ddp", "dataset.NyCJ-1Uxe")
                }
              },
              {
                header: "installed",
                body:   {template: "installed"}
              }
            ]
          },
          {
            id:      "detailsContainer",
            gravity: 1,
            rows:    [
              {
                id:     "appDetailsContainer",
                header: "details",
                height: 250,
                body:   {
                  rows: [
                    {
                      id:       "appDetailsData",
                      view:     "property",
                      elements: []
                    },
                    {
                      id:     "installButton",
                      view:   "button",
                      type:   "iconButton",
                      icon:   "download",
                      label:  "install",
                      hidden: true
                    },
                    {id: "runButton", view: "button", type: "iconButton", icon: "play", label: "run", hidden: true},
                    {id: "stopButton", view: "button", type: "iconButton", icon: "stop", label: "stop", hidden: true},
                    {
                      id:     "uninstallButton",
                      view:   "button",
                      type:   "iconButton",
                      icon:   "trash-o",
                      label:  "uninstall",
                      hidden: true
                    },
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]};

webix.ready(function() {
  secdEventBus.addListener(/data-*/, onDataNotify);
  
  $$("runningList").attachEvent("onItemClick", function(id) {
      var item = this.getItem(id);
      appListClick(item, $$("appDetailsData"));
    });
});
