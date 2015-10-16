/**
 * Created by toby on 16/10/15.
 */

function showAppDetails(bind, propertySheet) {
  var elements = [
    {label: "owner", type: "text", id: "owner"},
    {label: "id", type: "text", id: "id"},
    {label: "name", type: "text", id: "name"},
    {label: "appUrl", type: "text", id: "appUrl"},
    {label: "status", type: "text", id: "status"}
  ];
  propertySheet.define("elements",elements);
  propertySheet.parse(bind);
}

function appListClick(item, propertySheet) {
  var bind = {
    owner: item.owner,
    id: item.appId,
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
      id: "appsTabBar",
      view:"tabview",
      tabbar: { optionWidth: 100},
      multiview: { animate: true },
      gravity: 3,
      cells: [
        {
          header: "running",
          body: {
            id: "runningList",
            view: "list",
            template: "#name#",
            url: webix.proxy("ddp","dataset.NyCJ-1Uxe")
          }
        },
        {
          header: "installed",
          body:  { template: "installed"}
        }
      ]
    },
    {
      view: "resizer"
    },
    {
      id: "detailsContainer",
      gravity: 1,
      rows: [
        {
          id: "appDetailsContainer",
          header: "details",
          body: {
            id: "appDetailsData",
            view: "property",
            elements: []
          }
        }
      ]
    }
  ]};

webix.ready(function() {
    $$("runningList").attachEvent("onItemClick", function(id) {
      var item = this.getItem(id);
      appListClick(item, $$("appDetailsData"));
    });
});
