/**
 * 渲染进程
 */
const { ipcRenderer, remote, clipboard } = require('electron');
const { Menu, MenuItem, dialog } = remote;
const fs = require("fs");

let currentFile = null;   // 当前路径
let isSaved = true;       // 是否保存
let editor = document.getElementById("editor")


function newFile() {
  document.title = 'Notepad - Untitle'
}

function setFile(file) {
  currentFile = file;
  document.title = 'Notepad - ' + currentFile;
}

// 更新状态栏
function handleDocumentChange(title) {
  var modeName = "JavaScript";
  var hmode = document.getElementById("mode")
  if (!title) {
    document.getElementById("title").innerHTML = "[no document loaded]";
    return;
  }

  title = title.match(/[^/]+$/)[0];
  console.log(title)
  
  var idx = title.indexOf('.')
  if (idx == -1) {
    idx = title.length - 1;
    hmode.innerHTML = 'Binary';
    return;
  }

  document.getElementById("title").innerHTML = title;
  document.title = title;

  if (title.match(/.json$/)) {
    modeName = "JavaScript (JSON)";
  } else if (title.match(/.html$/)) {
    modeName = "HTML";
  } else if (title.match(/.css$/)) {
    modeName = "CSS";
  } else {
    if (idx + 1 == title.length) {
      modelName = 'Binary';
    } else {
      modeName = title.substr(idx + 1);
    }
  }

  hmode.innerHTML = modeName;
}

// 读文件
function readFile(currentFile) {
  fs.readFile(currentFile, function (err, data) {
    if (err) {
      console.log("Read failed: " + err);
    }

    handleDocumentChange(currentFile);
    editor.value = String(data);
  });
}

// 写文件
function writeFile(currentFile) {
  fs.writeFile(currentFile, editor.value, function (err) {
    if (err) {
      console.log("Write failed: " + err);
      return;
    }

    handleDocumentChange(currentFile);
    console.log("Write completed");
  });
}


// 新窗口
function handleNew() {
  //window.open('file://' + __dirname + '/index.html');
  currentFile = null;
  editor.value = '';
  document.title = 'Untitle';
  isSaved = true;
  handleDocumentChange(null);
}

// 打开文件
function handleOpen() {
  /*
  dialog.showOpenDialog({properties: ['openFile']}, function(filename) { 
      onChosenFileToOpen(filename.toString()); 
    });
  */

  // 文件对话框
  dialog.showOpenDialog({
    properties: ['openFile']
  }).then(result => {
    console.log(result.filePaths)
    if (result.filePaths.length == 0) {
      return;
    }

    currentFile = result.filePaths[0];
    setFile(currentFile);
    readFile(currentFile);

    isSaved = true;
  });
}

function handleSave() {
  // 直接保存
  if (currentFile) {
    writeFile(currentFile);
    isSaved = true;
    return;
  }

  /*dialog.showSaveDialog(function(filename) {
     onChosenFileToSave(filename.toString(), true);
  });*/

  // 新建
  dialog.showSaveDialog(
  ).then(result => {
    console.log(result.filePath)

    currentFile = result.filePath;
    setFile(currentFile);
    writeFile(currentFile);

    isSaved = true;
  });
}

// 初始化菜单
function initContextMenu() {
  menu = new Menu();
  menu.append(new MenuItem({
    label: 'Copy',
    click: function () {
      clipboard.writeText(editor.getSelection(), 'copy');
    }
  }));
  menu.append(new MenuItem({
    label: 'Cut',
    click: function () {
      clipboard.writeText(editor.getSelection(), 'copy');
      editor.replaceSelection('');
    }
  }));
  menu.append(new MenuItem({
    label: 'Paste',
    click: function () {
      editor.replaceSelection(clipboard.readText('copy'));
    }
  }));

  // 注册
  window.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    menu.popup(remote.getCurrentWindow(), ev.x, ev.y);
  }, false);
}


// 加载
onload = function () {
  initContextMenu();

  newButton = document.getElementById("new");
  openButton = document.getElementById("open");
  saveButton = document.getElementById("save");

  // 绑定事件
  newButton.addEventListener("click", handleNew);
  openButton.addEventListener("click", handleOpen);
  saveButton.addEventListener("click", handleSave);

  // 打开文件
  newFile();
  onresize();
};

// 监听文本框是否变更
editor.oninput = (e) => {
  if (isSaved) {
    document.title += " *";
  }

  isSaved = false;
}

// 缩放
onresize = function () {
  /*
  var container = document.getElementById('editor');
  var containerWidth = container.offsetWidth;
  var containerHeight = container.offsetHeight;

  var scrollerElement = editor.getScrollerElement();
  scrollerElement.style.width = containerWidth + 'px';
  scrollerElement.style.height = containerHeight + 'px';
  */
}

// 询问是否要保存
function askSaveIfNeed() {
  if (isSaved)
    return;

  // 询问对话框
  dialog.showMessageBox(remote.getCurrentWindow(), {
    message: '是否保存当前文件?',
    type: 'question',
    buttons: ['是', '否']
  }).then(result => {
    if (result.response == 0) {
      handleSave();
    }
  });
}

/**
 * 监听与主进程间通信
 */
ipcRenderer.on('action', (event, arg) => {
  switch (arg) {
    case 'new':   // 新建
      askSaveIfNeed();
      handleNew();
      break;
    case 'open':  // 打开 
      askSaveIfNeed();
      handleOpen();
      break;
    case 'save':  // 保存
      handleSave();
      break;
    case 'exit':  // 退出
      askSaveIfNeed();

      // 重新通知主进程
      ipcRenderer.send('reqaction', 'exit');
      break;
    default:
      break;
  }
});

