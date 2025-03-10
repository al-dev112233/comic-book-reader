const { ipcRenderer } = require("electron");
const customTitlebar = require("custom-electron-titlebar");
const { BookType } = require("./constants.js");

let g_currentPdf = {};
let g_currentImg64 = null;
let g_currentEpubEbook = {};

let g_hideMouseCursor = false;
let g_mouseCursorTimer;
let g_isMouseCursorVisible = true;
let g_mouseCursorHideTime = 3500;

let g_turnPageOnScrollBoundary = true;
let g_filterMode = 0;

function cleanUp() {
  g_currentPdf = {};
  g_currentImg64 = null;
  g_currentEpubEbook = {};
}

let g_titlebar = new customTitlebar.Titlebar({
  icon: "./assets/images/icon_256x256.png",
  titleHorizontalAlignment: "right",
});

///////////////////////////////////////////////////////////////////////////////
// IPC RECEIVED ///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("append-html", (event, parentElementId, content) => {
  document.getElementById(parentElementId).innerHTML = content;
});

ipcRenderer.on("update-loading", (event, isVisible) => {
  if (isVisible) {
    document.querySelector("#loading").classList.add("is-active");
  } else {
    document.querySelector("#loading").classList.remove("is-active");
  }
});

ipcRenderer.on("update-clock", (event, time) => {
  document.querySelector("#clock-bubble").innerHTML =
    "<span>" + time + "</span>";
});

ipcRenderer.on("update-menubar", (event) => {
  g_titlebar.refreshMenu();
});

ipcRenderer.on(
  "update-loading-indicator",
  (
    event,
    loadingIndicatorBG,
    loadingIndicatorIconSize,
    loadingIndicatorIconPos
  ) => {
    if (loadingIndicatorBG === 0) {
      document.documentElement.style.setProperty("--li-bg-alpha", 0);
    } else {
      document.documentElement.style.setProperty("--li-bg-alpha", 0.1);
    }
    if (loadingIndicatorIconSize === 0) {
      document.documentElement.style.setProperty("--li-icon-size", "30px");
      document.documentElement.style.setProperty("--li-icon-thickness", "4px");
    } else {
      document.documentElement.style.setProperty("--li-icon-size", "65px");
      document.documentElement.style.setProperty("--li-icon-thickness", "8px");
    }
    if (loadingIndicatorIconPos === 0) {
      document.documentElement.style.setProperty(
        "--li-icon-align-self",
        "normal"
      );
      document.documentElement.style.setProperty(
        "--li-icon-justify-self",
        "left"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-top-full",
        "10px"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-top-win",
        "40px"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-left",
        "10px"
      );
    } else {
      document.documentElement.style.setProperty(
        "--li-icon-align-self",
        "center"
      );
      document.documentElement.style.setProperty(
        "--li-icon-justify-self",
        "center"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-top-full",
        "0px"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-top-win",
        "0px"
      );
      document.documentElement.style.setProperty(
        "--li-icon-margin-left",
        "0px"
      );
    }
  }
);

ipcRenderer.on("update-layout-pos", (event, value, id) => {
  let element = document.querySelector(id);
  element.className = "";
  element.classList.add("layout-bubble");
  switch (value) {
    case 0:
      element.classList.add("layout-top");
      element.classList.add("layout-left");
      break;
    case 1:
      element.classList.add("layout-top");
      element.classList.add("layout-center");
      break;
    case 2:
      element.classList.add("layout-top");
      element.classList.add("layout-right");
      break;
    case 3:
      element.classList.add("layout-bottom");
      element.classList.add("layout-left");
      break;
    case 4:
      element.classList.add("layout-bottom");
      element.classList.add("layout-center");
      break;
    case 5:
      element.classList.add("layout-bottom");
      element.classList.add("layout-right");
      break;
  }
});

ipcRenderer.on("update-colors", (event, data) => {
  for (const [key, value] of Object.entries(data)) {
    document.documentElement.style.setProperty(key, value);
  }
  g_titlebar.updateBackground(
    customTitlebar.Color.fromHex(data["--titlebar-bg-color"])
  );
  g_titlebar.updateItemBGColor(
    customTitlebar.Color.fromHex(data["--titlebar-focused-bg-color"])
  );
});

ipcRenderer.on("update-bg-text", (event, text) => {
  document.querySelector("#centered-block-text").innerHTML = text;
});

ipcRenderer.on("update-bg", (event, show) => {
  if (show) document.querySelector(".centered-block").classList.remove("hide");
  else document.querySelector(".centered-block").classList.add("hide");
});

ipcRenderer.on(
  "update-toolbar-tooltips",
  (
    event,
    tOpenFile,
    tPrevious,
    tNext,
    tFitWidth,
    tFitHeight,
    tRotateCounter,
    tRotateClock,
    tFullScreen
  ) => {
    document.querySelector("#toolbar-button-open-href").title = tOpenFile;
    document.querySelector("#toolbar-button-prev-href").title = tPrevious;
    document.querySelector("#toolbar-button-next-href").title = tNext;
    document.querySelector("#toolbar-button-fit-to-height-href").title =
      tFitHeight;
    document.querySelector("#toolbar-button-fit-to-width-href").title =
      tFitWidth;
    document.querySelector(
      "#toolbar-button-rotate-counterclockwise-href"
    ).title = tRotateCounter;
    document.querySelector("#toolbar-button-rotate-clockwise-href").title =
      tRotateClock;
    document.querySelector("#toolbar-button-fullscreen-enter-href").title =
      tFullScreen;
    document.querySelector("#toolbar-button-fullscreen-exit-href").title =
      tFullScreen;
  }
);

ipcRenderer.on("update-toolbar-rotation-buttons", (event, areEnabled) => {
  const button1 = document.querySelector("#toolbar-button-rotate-clockwise");
  const button2 = document.querySelector(
    "#toolbar-button-rotate-counterclockwise"
  );
  if (areEnabled) {
    button1.classList.remove("no-click");
    button2.classList.remove("no-click");
    button1.classList.remove("low-opacity");
    button2.classList.remove("low-opacity");
  } else {
    button1.classList.add("no-click");
    button2.classList.add("no-click");
    button1.classList.add("low-opacity");
    button2.classList.add("low-opacity");
  }
});

ipcRenderer.on("update-toolbar-page-buttons", (event, areEnabled) => {
  const button1 = document.querySelector("#toolbar-button-prev");
  const button2 = document.querySelector("#toolbar-button-next");
  if (areEnabled) {
    button1.classList.remove("no-click");
    button2.classList.remove("no-click");
    button1.classList.remove("low-opacity");
    button2.classList.remove("low-opacity");
  } else {
    button1.classList.add("no-click");
    button2.classList.add("no-click");
    button1.classList.add("low-opacity");
    button2.classList.add("low-opacity");
  }
});

ipcRenderer.on("update-toolbar-zoom-buttons", (event, areEnabled) => {
  const button1 = document.querySelector("#toolbar-button-fit-to-height");
  const button2 = document.querySelector("#toolbar-button-fit-to-width");
  if (areEnabled) {
    button1.classList.remove("no-click");
    button2.classList.remove("no-click");
    button1.classList.remove("low-opacity");
    button2.classList.remove("low-opacity");
  } else {
    button1.classList.add("no-click");
    button2.classList.add("no-click");
    button1.classList.add("low-opacity");
    button2.classList.add("low-opacity");
  }
});

ipcRenderer.on("set-scrollbar-visibility", (event, isVisible) => {
  showScrollBar(isVisible);
});

ipcRenderer.on("set-scrollbar-position", (event, position) => {
  setScrollBarsPosition(position);
});

ipcRenderer.on("set-menubar-visibility", (event, isVisible) => {
  showMenuBar(isVisible);
});

ipcRenderer.on("set-toolbar-visibility", (event, isVisible) => {
  showToolBar(isVisible);
});

ipcRenderer.on("set-page-number-visibility", (event, isVisible) => {
  showPageNumber(isVisible);
});

ipcRenderer.on("set-clock-visibility", (event, isVisible) => {
  showClock(isVisible);
});

ipcRenderer.on("set-fullscreen-ui", (event, isFullscreen) => {
  setFullscreenUI(isFullscreen);
});

ipcRenderer.on("set-fit-to-width", (event) => {
  setFitToWidth();
});

ipcRenderer.on("set-fit-to-height", (event) => {
  setFitToHeight();
});

ipcRenderer.on("set-scale-to-height", (event, scale) => {
  setScaleToHeight(scale);
});

ipcRenderer.on("try-zoom-scale-from-width", (event, increment) => {
  const page = document.querySelector("#pages-container");
  const img = page.firstChild;
  const imgHeight = img.offsetHeight;
  const vh = Math.min(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  // TODO: not getting exactly the value I want, cheat by using the 1.1 multiplier for now
  let scale = parseInt((imgHeight / vh) * 100 * (increment > 0 ? 1.1 : 1));
  scale += increment;
  ipcRenderer.send("set-scale-mode", scale);
});

ipcRenderer.on("set-hide-inactive-mouse-cursor", (event, hide) => {
  g_hideMouseCursor = hide;
});

ipcRenderer.on("set-turn-page-on-scroll-boundary", (event, value) => {
  g_turnPageOnScrollBoundary = value;
});

ipcRenderer.on("update-title", (event, title) => {
  document.title = title;
  g_titlebar.updateTitle(title);
});

ipcRenderer.on("render-page-info", (event, pageNum, numPages, isPercentage) => {
  updatePageInfo(pageNum, numPages, isPercentage);
});

ipcRenderer.on("set-filter", (event, value) => {
  g_filterMode = value;
  let img = document.getElementById("page-img");
  if (!img) img = document.getElementById("page-canvas");
  if (img) {
    setFilterClass(img);
  }
});

function setFilterClass(element) {
  if (g_filterMode === 0) element.classList.remove("page-filter-old-page");
  else if (g_filterMode === 1) element.classList.add("page-filter-old-page");
}

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("file-closed", (event, img64, rotation) => {
  cleanUp();
  let container = document.getElementById("pages-container");
  container.innerHTML = "";
  document.querySelector(".centered-block").classList.remove("hide");
  updatePageInfo(0, 0);
  document.querySelector("#page-number-bubble").innerHTML = "";
});

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("render-img-page", (event, img64, rotation, scrollBarPos) => {
  if (img64) {
    cleanUp();
    document.querySelector(".centered-block").classList.add("hide");
    g_currentImg64 = img64;
    renderImg64(rotation, scrollBarPos, true, false);
  }
});

ipcRenderer.on("refresh-img-page", (event, rotation) => {
  if (g_currentImg64) renderImg64(rotation, undefined, false, true);
});

ipcRenderer.on("update-img-page-title", (event, text) => {
  let img = document.getElementById("page-img");
  if (!img) img = document.getElementById("page-canvas");
  if (img) img.title = text;
});

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("load-pdf", (event, filePath, pageIndex, password) => {
  loadPdf(filePath, pageIndex, password);
});

ipcRenderer.on(
  "render-pdf-page",
  (event, pageIndex, rotation, scrollBarPos) => {
    document.querySelector(".centered-block").classList.add("hide");
    renderPdfPage(pageIndex, rotation, scrollBarPos);
  }
);

ipcRenderer.on("refresh-pdf-page", (event, rotation) => {
  refreshPdfPage(rotation);
});

ipcRenderer.on(
  "extract-pdf-image-buffer",
  (event, filePath, pageNum, outputFolderPath, password, sendToTool) => {
    extractPDFImageBuffer(
      filePath,
      pageNum,
      outputFolderPath,
      password,
      sendToTool
    );
  }
);

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("load-epub-comic", (event, filePath, pageIndex) => {
  loadEpubComic(filePath, pageIndex);
});

ipcRenderer.on("refresh-epub-comic-page", (event, rotation) => {
  if (g_currentImg64) renderImg64(rotation, undefined, false, true);
});

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on("load-epub-ebook", (event, filePath, pageIndex, cachedPath) => {
  loadEpubEbook(filePath, pageIndex, cachedPath);
});

ipcRenderer.on("render-epub-ebook-page-percentage", (event, percentage) => {
  document.querySelector(".centered-block").classList.add("hide");
  renderEpubEbookPercentage(percentage);
});

ipcRenderer.on("render-epub-ebook-page-next", (event) => {
  document.querySelector(".centered-block").classList.add("hide");
  renderEpubEbookNext();
});

ipcRenderer.on("render-epub-ebook-page-prev", (event) => {
  document.querySelector(".centered-block").classList.add("hide");
  renderEpubEbookPrev();
});

ipcRenderer.on("refresh-epub-ebook-page", (event, rotation) => {
  refreshEpubEbookPage();
});

ipcRenderer.on("close-epub-ebook", (event) => {
  if (g_currentEpubEbook.book) {
    g_currentEpubEbook.book.destroy();
    g_currentEpubEbook = {};
  }
});

async function loadEpubEbook(filePath, percentage, cachedPath) {
  try {
    const ePub = require("epubjs");
    g_currentEpubEbook.book = ePub.default(cachedPath ?? filePath);
    g_currentEpubEbook.book.on("openFailed", function (error) {
      ipcRenderer.send("epub-ebook-load-failed", error);
    });

    const container = document.querySelector("#pages-container");
    container.innerHTML = "";
    const ebookContainer = document.createElement("div");
    ebookContainer.id = "epub-ebook-container";
    container.appendChild(ebookContainer);
    g_currentEpubEbook.rendition = await g_currentEpubEbook.book.renderTo(
      "epub-ebook-container",
      {
        flow: "paginated",
        width: 450,
        height: 600,
        allowScriptedContent: false,
      }
    );
    // g_currentEpubEbook.rendition.themes.fontSize("140%");

    g_currentEpubEbook.rendition.on("relocated", function (location) {
      const iframe = document
        .getElementsByClassName("epub-view")[0]
        .getElementsByTagName("iframe")[0];
      let iframeDoc = iframe.contentDocument;
      iframeDoc.body.innerHTML =
        iframeDoc.body.innerHTML +
        `<style>
            a, a:hover, a:focus, a:active {
              text-decoration: none !important;
              color: black !important;
            }
      </style>`;
    });

    await g_currentEpubEbook.rendition.display();
    await g_currentEpubEbook.book.locations.generate(1000);
    let cfi = getEpubEbookCfiFromPercentage(percentage / 100);
    if (cfi === "epubcfi(/!/)" || cfi === -1)
      throw { name: "GenericError", message: "Empty or malformed epub cfi" };
    const manager = g_currentEpubEbook.rendition.manager;
    // HACK / modification to epubjs
    // highjack function from managers>default>index.js in module
    // to take into account how I use a css transform to scale the 'page'
    manager.paginatedLocation = () => {
      let visible = manager.visible();
      let container = manager.container.getBoundingClientRect();
      let used = 0;

      let sections = visible.map((view) => {
        let { index, href } = view.section;
        let offset;
        let position = view.position();
        let width = view.width();

        let start;
        let end;
        let pageWidth;

        offset = container.left;
        pageWidth = 450;

        const zoomFactor =
          document.querySelector("#epub-ebook-container").clientHeight / 600;
        start = offset / zoomFactor - position.left / zoomFactor + used;
        end = start + pageWidth;

        used += pageWidth;

        let mapping = manager.mapping.page(
          view.contents,
          view.section.cfiBase,
          start,
          end
        );

        let totalPages = manager.layout.count(width).pages;
        let startPage = Math.floor(start / manager.layout.pageWidth);
        let pages = [];
        let endPage = Math.floor(end / manager.layout.pageWidth);

        if (startPage < 0) {
          startPage = 0;
          endPage = endPage + 1;
        }

        for (var i = startPage + 1; i <= endPage; i++) {
          let pg = i;
          pages.push(pg);
        }

        return {
          index,
          href,
          pages,
          totalPages,
          mapping,
        };
      });

      return sections;
    };

    ipcRenderer.send("epub-ebook-loaded", filePath, percentage);
  } catch (error) {
    ipcRenderer.send("epub-ebook-load-failed", error);
  }
}

async function renderEpubEbookPercentage(percentage) {
  try {
    let cfi = getEpubEbookCfiFromPercentage(percentage / 100);
    if (cfi !== "epubcfi(/!/)" && cfi !== -1) {
      await g_currentEpubEbook.rendition.display(cfi);
      refreshEpubEbookPage();
      setScrollBarsPosition(0);
      ipcRenderer.send("page-loaded", { percentage: percentage });
    } else {
      ipcRenderer.send("page-loaded", { error: true });
    }
  } catch (error) {
    ipcRenderer.send("page-loaded", { error: true });
  }
}

async function renderEpubEbookNext() {
  await g_currentEpubEbook.rendition.next();
  refreshEpubEbookPage();
  setScrollBarsPosition(0);
  ipcRenderer.send("page-loaded", {
    percentage: getCurrentPercentage() * 100,
  });
}

async function renderEpubEbookPrev() {
  await g_currentEpubEbook.rendition.prev();
  refreshEpubEbookPage();
  setScrollBarsPosition(1);
  ipcRenderer.send("page-loaded", {
    percentage: getCurrentPercentage() * 100,
  });
}

function refreshEpubEbookPage() {
  const height = document.querySelector("#epub-ebook-container").clientHeight;
  const scale = height / 600;
  document.documentElement.style.setProperty(
    "--zoom-epub-ebook-scale-factor",
    scale
  );
}

function getEpubEbookCfiFromPercentage(percentage) {
  return g_currentEpubEbook.book.locations.cfiFromPercentage(percentage);
}

function getCurrentPercentage() {
  const currentLocation = g_currentEpubEbook.rendition.currentLocation();
  return g_currentEpubEbook.book.locations.percentageFromCfi(
    currentLocation.start.cfi
  );
}

///////////////////////////////////////////////////////////////////////////////

ipcRenderer.on(
  "show-modal-prompt",
  (event, question, defaultValue, textButton1, textButton2, mode = 0) => {
    showModalPrompt(question, defaultValue, textButton1, textButton2, mode);
  }
);

ipcRenderer.on(
  "show-modal-prompt-password",
  (event, text1, text2, textButton1, textButton2) => {
    showModalPromptPassword(text1, text2, textButton1, textButton2);
  }
);

ipcRenderer.on("show-modal-info", (event, title, message, textButton1) => {
  showModalAlert(title, message, textButton1);
});

ipcRenderer.on(
  "show-modal-question-openas",
  (event, title, message, textButton1, textButton2, filePath) => {
    showModalQuestionOpenAs(title, message, textButton1, textButton2, filePath);
  }
);

///////////////////////////////////////////////////////////////////////////////
// MODALS /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function showModalPrompt(
  question,
  defaultValue,
  textButton1,
  textButton2,
  mode = 0
) {
  if (mode === 0) {
    smalltalk
      .prompt(question, defaultValue, undefined, {
        buttons: {
          ok: `&nbsp;${textButton1}&nbsp;`,
          cancel: `&nbsp;${textButton2}&nbsp;`,
        },
      })
      .then((value) => {
        ipcRenderer.send("go-to-page", value);
      })
      .catch(() => {});
  } else if (mode === 1) {
    smalltalk
      .prompt(question, defaultValue, undefined, {
        buttons: {
          ok: `&nbsp;${textButton1}&nbsp;`,
          cancel: `&nbsp;${textButton2}&nbsp;`,
        },
      })
      .then((value) => {
        ipcRenderer.send("enter-scale-value", parseInt(value));
      })
      .catch(() => {});
  }
  if (mode === 2) {
    smalltalk
      .prompt(question, defaultValue, undefined, {
        buttons: {
          ok: `&nbsp;${textButton1}&nbsp;`,
          cancel: `&nbsp;${textButton2}&nbsp;`,
        },
      })
      .then((value) => {
        ipcRenderer.send("go-to-percentage", value);
      })
      .catch(() => {});
  }
}

function showModalPromptPassword(text1, text2, textButton1, textButton2) {
  smalltalk
    .prompt(text1, text2 + "\n\n", "", {
      type: "password",
      buttons: {
        ok: `&nbsp;${textButton1}&nbsp;`,
        cancel: `&nbsp;${textButton2}&nbsp;`,
      },
    })
    .then((value) => {
      ipcRenderer.send("password-entered", value);
    })
    .catch(() => {
      ipcRenderer.send("password-canceled");
    });
}

function showModalAlert(title, message, textButton1) {
  smalltalk
    .alert(title, message, {
      buttons: {
        ok: `&nbsp;${textButton1}&nbsp;`,
      },
    })
    .then(() => {});
}

function showModalQuestionOpenAs(
  title,
  message,
  textButton1,
  textButton2,
  filePath
) {
  smalltalk
    .confirm(title, message, {
      buttons: {
        ok: `&nbsp;${textButton1}&nbsp;`,
        cancel: `&nbsp;${textButton2}&nbsp;`,
      },
    })
    .then(() => {
      ipcRenderer.send("booktype-entered", filePath, BookType.COMIC);
    })
    .catch(() => {
      ipcRenderer.send("booktype-entered", filePath, BookType.EBOOK);
    });
}

///////////////////////////////////////////////////////////////////////////////
// IMG64 //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function renderImg64(rotation, scrollBarPos, sendPageLoaded, fromRefresh) {
  let container = document.getElementById("pages-container");
  let title;
  if (fromRefresh) {
    let img = document.getElementById("page-img");
    if (!img) img = document.getElementById("page-canvas");
    if (img) title = img.title;
  }
  container.innerHTML = "";
  if (rotation === 0 || rotation === 180) {
    var image = new Image();
    image.onload = function () {
      container.appendChild(image);
      setFilterClass(image);
      if (sendPageLoaded) ipcRenderer.send("page-loaded");
    };
    image.src = g_currentImg64;
    image.id = "page-img";
    image.classList.add("page");
    if (title && title != "") image.title = title;
    if (rotation === 180) {
      image.classList.add("set-rotate-180");
    }
  }
  // I use a different method here, I prefer the look of images in <img> when resizing but can't make them rotate
  // as I like, so I'll try canvas for these rotations
  else if (rotation === 90 || rotation === 270) {
    var canvas = document.createElement("canvas");
    canvas.id = "page-canvas";
    if (title && title != "") canvas.title = title;
    container.appendChild(canvas);
    setFilterClass(canvas);
    var context = canvas.getContext("2d");
    var image = new Image();
    image.onload = function () {
      // ref: https://stackoverflow.com/questions/44076873/resize-image-and-rotate-canvas-90-degrees
      canvas.width = image.height;
      canvas.height = image.width;
      if (rotation === 90) {
        context.setTransform(
          0, // hScale
          1, // vSkew
          -1, // hSkew
          0, // vScale
          image.height, // hTrans
          0 // vTrans
        );
      } else if (rotation === 270) {
        context.setTransform(
          0, // hScale
          -1, // vSkew
          1, // hSkew
          0, // vScale
          0, // hTrans
          image.width // vTrans
        );
      }
      context.drawImage(image, 0, 0);
      context.setTransform(1, 0, 0, 1, 0, 0); // restore default
      if (sendPageLoaded) ipcRenderer.send("page-loaded");
    };
    image.src = g_currentImg64;
  }
  if (scrollBarPos !== undefined) setScrollBarsPosition(scrollBarPos);
}

///////////////////////////////////////////////////////////////////////////////
// EPUB ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function loadEpubComic(filePath, pageNum) {
  // ref: https://github.com/julien-c/epub/blob/master/example/example.js
  const EPub = require("epub");
  const epub = new EPub(filePath);
  epub.on("error", function (err) {
    ipcRenderer.send("epub-comic-load-failed");
  });
  epub.on("end", function (err) {
    // console.log(epub.metadata);
    // console.log(epub.flow); // spine
    // console.log(epub.toc);

    // This will send a message to main at the end (epub-loaded)
    extractEpubImagesSrcRecursive(epub, 0, filePath, pageNum, []);
  });

  epub.parse();
}

function extractEpubImagesSrcRecursive(
  epub,
  chapterIndex,
  filePath,
  pageNum,
  imageIDs
) {
  // TODO: error catching
  epub.getChapter(epub.spine.contents[chapterIndex].id, function (err, data) {
    let isEnd = false;
    if (err) {
      console.log(err);
      isEnd = true;
    } else {
      // ref: https://stackoverflow.com/questions/14939296/extract-image-src-from-a-string/14939476
      const rex = /<img[^>]+src="([^">]+)/g;
      while ((m = rex.exec(data))) {
        // e.g. /images/img-0139/OPS/images/0139.jpeg
        let id = m[1].split("/")[2];
        imageIDs.push(id);
      }
      if (chapterIndex + 1 < epub.spine.contents.length) {
        extractEpubImagesSrcRecursive(
          epub,
          chapterIndex + 1,
          filePath,
          pageNum,
          imageIDs
        );
      } else {
        isEnd = true;
      }
    }
    if (isEnd) {
      ipcRenderer.send("epub-comic-loaded", filePath, pageNum, imageIDs);
    }
  });
}

///////////////////////////////////////////////////////////////////////////////
// PDF ////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function loadPdf(filePath, pageIndex, password) {
  const pdfjsLib = require("./assets/libs/pdfjs/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./assets/libs/pdfjs/build/pdf.worker.js";
  var loadingTask = pdfjsLib.getDocument({ url: filePath, password: password });

  // NOTE: Didn't work, keep for the future
  // loadingTask.onPassword = function (updatePassword, reason) {
  //   console.log("onPassword");
  //   if (reason === PasswordResponses.NEED_PASSWORD) {
  //     updatePassword("123456"); // Provide an incorrect password.
  //     // ipcRenderer.send("pdf-load-failed", reason);
  //     // loadingTask.destroy();
  //     return;
  //   }
  //   if (reason === PasswordResponses.INCORRECT_PASSWORD) {
  //     //updatePassword("asdfasdf"); // Provide the correct password.
  //     ipcRenderer.send("pdf-load-failed", reason);
  //     loadingTask.destroy();
  //     return;
  //   }
  // };

  loadingTask.promise
    .then(function (pdf) {
      cleanUp();
      g_currentPdf.pdf = pdf;
      ipcRenderer.send(
        "pdf-loaded",
        filePath,
        pageIndex,
        g_currentPdf.pdf.numPages
      );
    })
    .catch((error) => {
      ipcRenderer.send("pdf-load-failed", error);
    });
}

function refreshPdfPage(rotation) {
  if (g_currentPdf.page) {
    renderCurrentPDFPage(rotation, undefined, false);
  }
}

function renderPdfPage(pageIndex, rotation, scrollBarPos) {
  let pageNum = pageIndex + 1; // pdfjs counts from 1
  // ref: https://mozilla.github.io/pdf.js/examples/
  g_currentPdf.pdf.getPage(pageNum).then(
    function (page) {
      g_currentPdf.page = page;
      renderCurrentPDFPage(rotation, scrollBarPos, true);
    },
    function (reason) {
      // PDF loading error
      console.error(reason);
    }
  );
}

function renderCurrentPDFPage(rotation, scrollBarPos, sendPageLoaded) {
  // I recreate the canvas every time to avoid some rendering issues when rotating (low res)
  // there's probably a better way, but performance seems similar
  let container = document.getElementById("pages-container");
  container.innerHTML = "";
  var canvas = document.createElement("canvas");
  canvas.id = "page-canvas";
  container.appendChild(canvas);
  setFilterClass(canvas);
  var context = canvas.getContext("2d");

  var desiredWidth = canvas.offsetWidth;
  var viewport = g_currentPdf.page.getViewport({
    scale: 1,
    rotation,
  });
  var scale = desiredWidth / viewport.width;
  var scaledViewport = g_currentPdf.page.getViewport({
    scale: scale,
    rotation,
  });

  canvas.height = scaledViewport.height;
  canvas.width = desiredWidth;

  var renderContext = {
    canvasContext: context,
    viewport: scaledViewport,
  };

  let renderTask = g_currentPdf.page.render(renderContext);
  renderTask.promise.then(function () {
    setScrollBarsPosition(scrollBarPos);
    if (sendPageLoaded) ipcRenderer.send("page-loaded");
  });
}

async function extractPDFImageBuffer(
  filePath,
  pageNum,
  outputFolderPath,
  password,
  sendToTool
) {
  const pdfjsLib = require("./assets/libs/pdfjs/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./assets/libs/pdfjs/build/pdf.worker.js";
  try {
    const pdf = await pdfjsLib.getDocument({
      url: filePath,
      password: password,
    }).promise;
    let page = await pdf.getPage(pageNum);
    let pageWidth = page.view[2]; // [left, top, width, height]
    let pageHeight = page.view[3];
    let userUnit = page.userUnit; // 1 unit = 1/72 inch
    let dpi = 300; // use userUnit some day (if > 1) to set dpi?
    let iPerUnit = 1 / 72;
    let scaleFactor = dpi * iPerUnit; // default: output a 300dpi image instead of 72dpi, which is the pdf default?
    // resize if too big?
    let bigSide = pageHeight;
    if (pageHeight < pageWidth) bigSide = pageWidth;
    let scaledSide = bigSide * scaleFactor;
    if (scaledSide > 5000) {
      console.log("reducing PDF scale factor, img too big");
      scaleFactor = 5000 / bigSide;
      dpi = parseInt(scaleFactor / iPerUnit);
    }
    // RENDER
    const canvas = document.createElement("canvas");
    let viewport = page.getViewport({
      scale: scaleFactor,
    });
    let context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    ////////////////////////////
    // check embedded imgs size
    // ref: https://codepen.io/allandiego/pen/RwVGbyj
    const operatorList = await page.getOperatorList();
    const validTypes = [
      pdfjsLib.OPS.paintImageXObject,
      pdfjsLib.OPS.paintJpegXObject,
      //pdfjsLib.OPS.paintImageXObjectRepeat,
    ];
    let images = [];
    operatorList.fnArray.forEach((element, index) => {
      if (validTypes.includes(element)) {
        images.push(operatorList.argsArray[index][0]);
      }
    });
    if (images.length === 1) {
      // could be a comic book, let's extract the image
      const imageName = images[0];
      // page needs to have been rendered before for this to be filled
      let image;
      try {
        image = await page.objs.get(imageName);
      } catch (error) {
        image = undefined;
      }
      if (image !== undefined && image !== null) {
        const imageWidth = image.width;
        const imageHeight = image.height;
        if (imageWidth >= pageWidth && imageHeight >= pageHeight) {
          if (false) {
            // this method doesn't always work yet, keep to explore further some day
            const rawImageData = image.data;
            // rawImageData (Uint8ClampedArray) contains only RGB -> add alphaChanel
            let rawImageDataWithAlpha = new Uint8ClampedArray(
              imageWidth * imageHeight * 4
            );
            for (
              let j = 0, k = 0, jj = imageWidth * imageHeight * 4;
              j < jj;

            ) {
              rawImageDataWithAlpha[j++] = rawImageData[k++];
              rawImageDataWithAlpha[j++] = rawImageData[k++];
              rawImageDataWithAlpha[j++] = rawImageData[k++];
              rawImageDataWithAlpha[j++] = 255;
            }
            const imageData = new ImageData(
              rawImageDataWithAlpha,
              imageWidth,
              imageHeight
            );
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            context.putImageData(imageData, 0, 0);
          } else {
            scaleFactor = imageWidth / pageWidth;
            dpi = parseInt(scaleFactor / iPerUnit);
            // render again with new dimensions
            viewport = page.getViewport({
              scale: scaleFactor,
            });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport })
              .promise;
          }
        }
      }
    }
    //////////////////////////////
    let dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const { changeDpiDataUrl } = require("changedpi");
    let img = changeDpiDataUrl(dataUrl, dpi);
    let data = img.replace(/^data:image\/\w+;base64,/, "");
    let buf = Buffer.from(data, "base64");

    page.cleanup();
    pdf.cleanup();
    pdf.destroy();
    ipcRenderer.send(
      "pdf-page-buffer-extracted",
      undefined,
      buf,
      outputFolderPath,
      sendToTool
    );
  } catch (err) {
    console.log(err);
    ipcRenderer.send(
      "pdf-page-buffer-extracted",
      err,
      undefined,
      outputFolderPath,
      sendToTool
    );
  }
}

///////////////////////////////////////////////////////////////////////////////
// EVENT LISTENERS ////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

document.onkeydown = function (event) {
  event = event || window.event;
  // keys ref: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
  // keys ref: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
  if (event.key == "PageDown" || event.key == "ArrowRight") {
    if (!event.repeat) {
      inputGoToNextPage();
      event.stopPropagation();
    }
    event.stopPropagation();
  } else if (event.key == "PageUp" || event.key == "ArrowLeft") {
    if (!event.repeat) {
      inputGoToPrevPage();
      event.stopPropagation();
    }
  } else if (event.key == "Home") {
    if (!event.repeat) inputGoToFirstPage();
  } else if (event.key == "End") {
    if (!event.repeat) inputGoToLastPage();
  } else if (event.key == "ArrowDown" || event.key == "s") {
    inputScrollPageDown();
    event.stopPropagation();
  } else if (event.key == "ArrowUp" || event.key == "w") {
    inputScrollPageUp();
    event.stopPropagation();
  } else if (event.key == "a") {
    let container = document.querySelector(".cet-container");
    let amount = container.offsetWidth / 5;
    container.scrollBy(-amount, 0);
    event.stopPropagation();
  } else if (event.key == "d") {
    let container = document.querySelector(".cet-container");
    let amount = container.offsetWidth / 5;
    container.scrollBy(amount, 0);
    event.stopPropagation();
  } else if (event.key == "Escape") {
    if (!event.repeat) ipcRenderer.send("escape-pressed");
  } else if (event.ctrlKey && event.key === "+") {
    if (!event.repeat) {
      inputZoomIn();
      event.stopPropagation();
    }
  } else if (event.ctrlKey && event.key === "-") {
    if (!event.repeat) {
      inputZoomOut();
      event.stopPropagation();
    }
  } else if (event.ctrlKey && event.key == "0") {
    if (!event.repeat) inputZoomReset();
  } else if (
    event.ctrlKey &&
    event.shiftKey &&
    (event.key == "i" || event.key == "I")
  ) {
    ipcRenderer.send("dev-tools-pressed");
  }
};

document.onclick = function (event) {
  if (
    event.target.classList.contains("page") ||
    event.target.id === "page-canvas" ||
    event.target.classList.contains("epub-view") ||
    event.target.id === "pages-container" ||
    event.target.classList.contains("cet-container")
  ) {
    const mouseX = event.clientX;
    const bodyX = document.body.clientWidth;
    ipcRenderer.send("mouse-click", mouseX, bodyX);
  }
};
// mouse right click: document.oncontextmenu

document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault();
};

document.body.ondrop = (event) => {
  for (let index = 0; index < event.path.length; index++) {
    const element = event.path[index];
    if (element?.id?.includes("ap-")) {
      let outputPaths = [];
      for (let index = 0; index < event.dataTransfer.files.length; index++) {
        const file = event.dataTransfer.files[index];
        outputPaths.push(file.path);
      }
      if (outputPaths.length > 0)
        ipcRenderer.send("audio-player", "on-drop", outputPaths);
      event.preventDefault();
      return;
    }
  }
  ipcRenderer.send("open-file", event.dataTransfer.files[0].path);
  event.preventDefault();
};

document.onmousemove = function () {
  if (g_mouseCursorTimer) {
    window.clearTimeout(g_mouseCursorTimer);
  }
  if (!g_isMouseCursorVisible) {
    document.body.style.cursor = "default";
    g_isMouseCursorVisible = true;
  }
  if (g_hideMouseCursor) {
    g_mouseCursorTimer = window.setTimeout(() => {
      g_mouseCursorTimer = undefined;
      document.body.style.cursor = "none";
      g_isMouseCursorVisible = false;
    }, g_mouseCursorHideTime);
  }
};

document.addEventListener("wheel", function (event) {
  if (event.ctrlKey) {
    if (event.deltaY < 0) {
      inputZoomIn();
    } else if (event.deltaY > 0) {
      inputZoomOut();
    }
  } else if (g_turnPageOnScrollBoundary) {
    let container = document.querySelector(".cet-container");
    if (
      event.deltaY > 0 &&
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight
      ) < 1
    ) {
      // reached bottom
      inputGoToNextPage();
    } else if (event.deltaY < 0 && container.scrollTop <= 0) {
      // reached top
      inputGoToPrevPage();
    }
  }
  event.stopPropagation();
  event.preventDefault();
});

function inputScrollPageUp(checkEdge = true, factor = 1) {
  let container = document.querySelector(".cet-container");
  if (g_turnPageOnScrollBoundary && checkEdge && container.scrollTop <= 0) {
    inputGoToPrevPage();
  } else {
    let amount = (factor * container.offsetHeight) / 5;
    document.querySelector(".cet-container").scrollBy(0, -amount);
  }
}

function inputScrollPageDown(checkEdge = true, factor = 1) {
  let container = document.querySelector(".cet-container");
  if (
    g_turnPageOnScrollBoundary &&
    checkEdge &&
    Math.abs(
      container.scrollHeight - container.scrollTop - container.clientHeight
    ) < 1
  ) {
    inputGoToNextPage();
  } else {
    let amount = (factor * container.offsetHeight) / 5;
    container.scrollBy(0, amount);
  }
}

function inputGoToNextPage() {
  ipcRenderer.send(
    "mouse-click",
    document.body.clientWidth,
    document.body.clientWidth
  );
}
function inputGoToPrevPage() {
  ipcRenderer.send("mouse-click", 0, document.body.clientWidth);
}
function inputGoToFirstPage() {
  ipcRenderer.send("home-pressed");
}
function inputGoToLastPage() {
  ipcRenderer.send("end-pressed");
}

function inputZoomIn(factor = 1) {
  ipcRenderer.send("zoom-in-pressed", factor);
}
function inputZoomOut(factor = 1) {
  ipcRenderer.send("zoom-out-pressed", factor);
}
function inputZoomReset() {
  ipcRenderer.send("zoom-reset-pressed");
}

function inputSwitchScaleMode() {
  ipcRenderer.send("switch-scale-mode");
}

///////////////////////////////////////////////////////////////////////////////
// GAMEPAD ////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// ref: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API

let g_gamepadsAnimationFrame;
let g_gamepadButtonsPrev;
let g_gamepadsAnimationLastTime;

window.addEventListener("gamepadconnected", (e) => {
  const gp = navigator.getGamepads()[e.gamepad.index];
  console.log(
    `gamepad connected [${gp.index}|${gp.id}; ${gp.buttons.length} buttons; ${gp.axes.length} axes]`
  );
  g_gamepadsAnimationLastTime = performance.now();
  g_gamepadButtonsPrev = [...gp.buttons];
  pollGamepads();
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log("gamepad disconnected");
  g_gamepadButtonsPrev = undefined;
  cancelAnimationFrame(g_gamepadsAnimationFrame);
});

function pollGamepads() {
  const deltaTime = (performance.now() - g_gamepadsAnimationLastTime) / 1000;

  const gamepads = navigator.getGamepads();
  if (!gamepads) {
    return;
  }
  const selectedGamepad = gamepads[0];
  // on pressed ///////
  if (selectedGamepad.buttons[1].pressed && !g_gamepadButtonsPrev[1].pressed) {
    // b button
    inputGoToNextPage();
  } else if (
    selectedGamepad.buttons[2].pressed &&
    !g_gamepadButtonsPrev[2].pressed
  ) {
    // x button
    inputGoToPrevPage();
  } else if (
    selectedGamepad.buttons[4].pressed &&
    !g_gamepadButtonsPrev[4].pressed
  ) {
    // left shoulder
    inputGoToFirstPage();
  } else if (
    selectedGamepad.buttons[5].pressed &&
    !g_gamepadButtonsPrev[5].pressed
  ) {
    // right shoulder
    inputGoToLastPage();
  } else if (
    selectedGamepad.buttons[11].pressed &&
    !g_gamepadButtonsPrev[11].pressed
  ) {
    // right shoulder click
    inputSwitchScaleMode();
  }
  // is pressed //////
  const scrollFactor = deltaTime * 3;
  if (selectedGamepad.buttons[3].pressed) {
    // y button
    inputScrollPageUp(!g_gamepadButtonsPrev[3].pressed, scrollFactor);
  } else if (selectedGamepad.buttons[0].pressed) {
    // a button
    inputScrollPageDown(!g_gamepadButtonsPrev[0].pressed, scrollFactor);
  } else if (selectedGamepad.buttons[12].pressed) {
    // directional pad up
    inputScrollPageUp(!g_gamepadButtonsPrev[12].pressed, scrollFactor);
  } else if (selectedGamepad.buttons[13].pressed) {
    // directional pad down
    inputScrollPageDown(!g_gamepadButtonsPrev[13].pressed, scrollFactor);
  } else if (selectedGamepad.buttons[6].pressed) {
    // left trigger
    inputScrollPageUp(!g_gamepadButtonsPrev[6].pressed, scrollFactor);
  } else if (selectedGamepad.buttons[7].pressed) {
    // right trigger
    inputScrollPageDown(!g_gamepadButtonsPrev[7].pressed, scrollFactor);
  }

  // axes ////////////
  if (selectedGamepad.axes[3] > 0.5) {
    // right stick vertical down
    inputZoomOut(deltaTime * 10);
  } else if (selectedGamepad.axes[3] < -0.5) {
    // right stick vertical up
    inputZoomIn(deltaTime * 10);
  }

  // set up next frame //
  g_gamepadButtonsPrev = [...selectedGamepad.buttons];
  g_gamepadsAnimationLastTime = performance.now();
  g_gamepadsAnimationFrame = requestAnimationFrame(pollGamepads);
}

///////////////////////////////////////////////////////////////////////////////
// TOOLBAR ////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function addButtonEvent(buttonName) {
  document.getElementById(buttonName).addEventListener("click", (event) => {
    ipcRenderer.send("toolbar-button-clicked", buttonName);
  });
}

addButtonEvent("toolbar-button-rotate-clockwise");
addButtonEvent("toolbar-button-rotate-counterclockwise");
addButtonEvent("toolbar-button-next");
addButtonEvent("toolbar-button-prev");
addButtonEvent("toolbar-button-fit-to-width");
addButtonEvent("toolbar-button-fit-to-height");
addButtonEvent("toolbar-button-fullscreen-enter");
addButtonEvent("toolbar-button-fullscreen-exit");
addButtonEvent("toolbar-button-open");

document.getElementById("page-slider").addEventListener("mouseup", (event) => {
  ipcRenderer.send("toolbar-slider-changed", event.currentTarget.value);
});
document.getElementById("page-slider").addEventListener("input", (event) => {
  if (g_toolbarSliderIsPercentage) {
    document.getElementById(
      "toolbar-page-numbers"
    ).innerHTML = `${event.currentTarget.value}.00%`;
  } else {
    document.getElementById("toolbar-page-numbers").innerHTML =
      event.currentTarget.value + " / " + event.currentTarget.max;
  }
});

let g_toolbarSliderIsPercentage = false;

function updatePageInfo(pageNum, numPages, isPercentage) {
  g_toolbarSliderIsPercentage = isPercentage;
  if (isPercentage) {
    document.getElementById("page-slider").max = 100;
    document.getElementById("page-slider").min = 0;
    document.getElementById("page-slider").value = pageNum;
    document.getElementById("toolbar-page-numbers").innerHTML = `${Number(
      pageNum
    ).toFixed(2)}%`;
    document.getElementById("page-number-bubble").innerHTML = `<span>${Number(
      pageNum
    ).toFixed(2)}%</span>`;
  } else {
    if (numPages === 0) pageNum = -1; // hack to make it show 00 / 00 @ start
    document.getElementById("page-slider").max = numPages;
    document.getElementById("page-slider").min = 1;
    document.getElementById("page-slider").value = pageNum + 1;
    document.getElementById("toolbar-page-numbers").innerHTML =
      pageNum + 1 + " / " + numPages;
    document.getElementById("page-number-bubble").innerHTML =
      "<span>" + (pageNum + 1) + " / " + numPages + "</span>";
  }
}

///////////////////////////////////////////////////////////////////////////////
// MODIFIERS //////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function showScrollBar(isVisible) {
  // ref: https://stackoverflow.com/questions/4481485/changing-css-pseudo-element-styles-via-javascript
  if (isVisible) {
    // generic:
    document.body.classList.remove("hidden-scrollbar");
    // if custom title bar enabled:
    document
      .querySelector(".cet-container")
      .classList.remove("hidden-scrollbar");
  } else {
    // generic:
    document.body.classList.add("hidden-scrollbar");
    // if custom title bar enabled:
    document.querySelector(".cet-container").classList.add("hidden-scrollbar");
  }
}

function showMenuBar(isVisible) {
  if (isVisible) {
    document
      .querySelector(".cet-titlebar")
      .classList.remove("set-display-none");
    document.querySelector(".cet-container").classList.remove("set-top-zero");

    document
      .querySelector("#loading-spinner")
      .classList.remove("is-full-screen");
  } else {
    document.querySelector(".cet-titlebar").classList.add("set-display-none");
    document.querySelector(".cet-container").classList.add("set-top-zero");

    document.querySelector("#loading-spinner").classList.add("is-full-screen");
  }
  updateZoom();
}

function showToolBar(isVisible) {
  if (isVisible) {
    document.querySelector("#toolbar").classList.remove("set-display-none");
    document
      .querySelector(".cet-container")
      .classList.remove("set-margin-bottom-zero");
    document.documentElement.style.setProperty("--toolbar-height", "30px");
  } else {
    document.querySelector("#toolbar").classList.add("set-display-none");
    document
      .querySelector(".cet-container")
      .classList.add("set-margin-bottom-zero");
    document.documentElement.style.setProperty("--toolbar-height", "0px");
  }
  updateZoom();
}

function showPageNumber(isVisible) {
  if (isVisible) {
    document
      .querySelector("#page-number-bubble")
      .classList.remove("set-display-none");
  } else {
    document
      .querySelector("#page-number-bubble")
      .classList.add("set-display-none");
  }
}

function showClock(isVisible) {
  if (isVisible) {
    document
      .querySelector("#clock-bubble")
      .classList.remove("set-display-none");
  } else {
    document.querySelector("#clock-bubble").classList.add("set-display-none");
  }
}

function setFullscreenUI(isFullscreen) {
  let buttonEnter = document.querySelector("#toolbar-button-fullscreen-enter");
  let buttonExit = document.querySelector("#toolbar-button-fullscreen-exit");
  if (isFullscreen) {
    buttonEnter.classList.add("set-display-none");
    buttonExit.classList.remove("set-display-none");
    document.documentElement.style.setProperty("--menubar-height", "0px");
  } else {
    buttonEnter.classList.remove("set-display-none");
    buttonExit.classList.add("set-display-none");
    document.documentElement.style.setProperty("--menubar-height", "30px");
  }
  updateZoom();
}

function setFitToWidth() {
  let container = document.querySelector("#pages-container");
  container.classList.remove("set-scale-to-height");
  container.classList.remove("set-fit-to-height");
  container.classList.add("set-fit-to-width");

  document
    .querySelector("#toolbar-button-fit-to-width")
    .classList.add("set-display-none");
  document
    .querySelector("#toolbar-button-fit-to-height")
    .classList.remove("set-display-none");
}

function setFitToHeight() {
  let container = document.querySelector("#pages-container");
  container.classList.remove("set-scale-to-height");
  container.classList.remove("set-fit-to-width");
  container.classList.add("set-fit-to-height");

  document
    .querySelector("#toolbar-button-fit-to-width")
    .classList.remove("set-display-none");
  document
    .querySelector("#toolbar-button-fit-to-height")
    .classList.add("set-display-none");
}

function setScaleToHeight(scale) {
  setZoomHeightCssVars(scale);
  let container = document.querySelector("#pages-container");
  container.classList.remove("set-fit-to-width");
  container.classList.remove("set-fit-to-height");
  container.classList.add("set-scale-to-height");

  document
    .querySelector("#toolbar-button-fit-to-width")
    .classList.remove("set-display-none");
  document
    .querySelector("#toolbar-button-fit-to-height")
    .classList.add("set-display-none");
}

function setZoomHeightCssVars(scale) {
  if (scale !== undefined)
    document.documentElement.style.setProperty(
      "--zoom-height-scale",
      `${scale}`
    );

  let isTitlebarHidden = document
    .querySelector(".cet-titlebar")
    .classList.contains("set-display-none");
  let isToolbarHidden = document
    .querySelector("#toolbar")
    .classList.contains("set-display-none");

  let border = 0;
  if (!isTitlebarHidden) border += 30;
  if (!isToolbarHidden) border += 30;
  document.documentElement.style.setProperty(
    "--zoom-height-borders",
    `${border}px`
  );
}

function updateZoom() {
  setZoomHeightCssVars();
}

function moveScrollBarsToStart() {
  document.querySelector(".cet-container").scrollTop = 0;
  document.querySelector(".cet-container").scrollLeft = 0;
}

function moveScrollBarsToEnd() {
  document.querySelector(".cet-container").scrollTop =
    document.querySelector(".cet-container").scrollHeight;
  document.querySelector(".cet-container").scrollLeft =
    document.querySelector(".cet-container").scrollWidth;
}

function setScrollBarsPosition(position) {
  if (position === 0) {
    setTimeout(() => {
      moveScrollBarsToStart();
    }, 50);
  } else if (position === 1) {
    setTimeout(() => {
      moveScrollBarsToEnd();
    }, 50); // if I don't add a timeout they are ignored & always goes to top ¿¿??
  }
}
