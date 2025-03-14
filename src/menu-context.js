const { Menu } = require("electron");
const mainProcess = require("./main");
const { FileDataType } = require("./constants");

function _(...args) {
  return mainProcess.i18n_.apply(null, args);
}

function buildContextMenu(isOpen, showRotation) {
  let contextMenu = Menu.buildFromTemplate([
    {
      label: _("ctxmenu-nextpage"),
      enabled: isOpen,
      click() {
        mainProcess.onMenuNextPage();
      },
    },
    {
      label: _("ctxmenu-prevpage"),
      enabled: isOpen,
      click() {
        mainProcess.onMenuPreviousPage();
      },
    },
    {
      type: "separator",
    },
    {
      label: _("menu-view-zoom"),
      enabled: isOpen,
      submenu: [
        {
          id: "fit-to-width",
          label: _("menu-view-zoom-fitwidth"),
          enabled: isOpen,
          click() {
            mainProcess.onMenuFitToWidth();
          },
        },
        {
          id: "fit-to-height",
          label: _("menu-view-zoom-fitheight"),
          enabled: isOpen,
          click() {
            mainProcess.onMenuFitToHeight();
          },
        },
        {
          id: "scale-to-height",
          label: _("menu-view-zoom-scaleheight"),
          enabled: isOpen,
          submenu: getScaleToHeightSubmenu(),
        },
      ],
    },
    {
      label: _("ctxmenu-rotate"),
      enabled: isOpen && showRotation,
      submenu: [
        {
          id: "rotate-clockwise",
          label: _("ctxmenu-rotate-clockwise"),
          enabled: isOpen && showRotation,
          click() {
            mainProcess.onMenuRotateClockwise();
          },
        },
        {
          id: "rotation-counterclockwise",
          enabled: isOpen && showRotation,
          label: _("ctxmenu-rotate-counterclockwise"),
          click() {
            mainProcess.onMenuRotateCounterclockwise();
          },
        },
      ],
    },
    {
      label: _("menu-view-page"),
      enabled: isOpen,
      submenu: [
        {
          label: _("menu-view-page-first"),
          enabled: isOpen,
          click() {
            mainProcess.onGoToPageFirst();
          },
        },
        {
          label: _("menu-view-page-last"),
          enabled: isOpen,
          click() {
            mainProcess.onGoToPageLast();
          },
        },
        {
          label: _("menu-view-page-choose"),
          enabled: isOpen,
          click() {
            mainProcess.onGoToPageDialog();
          },
        },
      ],
    },
    {
      type: "separator",
    },
    {
      label: _("ctxmenu-openfile"),
      accelerator: "CommandOrControl+O",
      click() {
        mainProcess.onMenuOpenFile();
      },
    },
    {
      type: "separator",
    },
    {
      label: _("menu-view-togglefullscreen"),
      accelerator: "F11",
      click() {
        mainProcess.onMenuToggleFullScreen();
      },
    },
  ]);
  return contextMenu;
}

exports.getContextMenu = function (fileData) {
  let isOpen = true;
  let showRotation = true;
  if (fileData.type === FileDataType.NOT_SET) {
    isOpen = false;
  } else if (fileData.type === FileDataType.EPUB_EBOOK) {
    showRotation = false;
  }
  return buildContextMenu(isOpen, showRotation);
};

function getScaleToHeightSubmenu() {
  let menu = [];
  let defaults = [25, 50, 100, 150, 200, 300, 400];
  defaults.forEach((scale) => {
    menu.push({
      label: `${scale}%`,
      click() {
        mainProcess.onMenuScaleToHeight(scale);
      },
    });
  });
  menu.push({
    type: "separator",
  });
  menu.push({
    label: _("menu-view-zoom-scaleheight-enter"),
    click() {
      mainProcess.onMenuScaleToHeightEnter();
    },
  });

  return menu;
}
