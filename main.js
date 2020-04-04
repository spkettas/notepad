/**
 * 主进程代码
 */
const { app, BrowserWindow } = require('electron');
const { dialog, Menu, ipcMain } = require('electron');

let mainWindow; // 主窗口
let safeExit = false; // 是否安全退出 
const isMac = process.platform === 'darwin'

// 菜单项
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        click() {
          mainWindow.webContents.send('action', 'new');  // 发送新建命令
        }
      },
      {
        label: 'Open',
        click: async () => {
          mainWindow.webContents.send('action', 'open');  // 发送打开命令
        }
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: async () => {
          mainWindow.webContents.send('action', 'save');  // 发送保存命令
        }
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'reload'
      },
      {
        role: 'forcereload'
      },
      {
        role: 'toggledevtools'
      },
      {
        type: 'separator'
      },
      {
        role: 'resetzoom'
      },
      {
        role: 'zoomin'
      },
      {
        role: 'zoomout'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'About',
        click: async () => {
          dialog.showMessageBox({
            mainWindow,
            type: 'info',
            title: '关于',
            message: 'Electron 记事本v1.0'
          })
        }
      }
    ]
  }
];


///
app.on('window-all-closed', function () {
  if (process.platform != 'darwin')
    app.quit();
});

app.allowRendererProcessReuse = true;

// ready
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true }
  });

  mainWindow.loadURL('file://' + __dirname + '/index.html');
  // 启动调试
  //mainWindow.openDevTools()

  // 主进程添加菜单 
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // close
  mainWindow.on('close', (e) => {
    if (!safeExit) {
      e.preventDefault();
      mainWindow.webContents.send('action', 'exit');
    }
  });

  // closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}


app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})


/**
 * 监听与渲染进程间通信 
 */
ipcMain.on('reqaction', (e, arg) => {
  switch (arg) {
    case 'exit':
      safeExit = true;
      app.quit();
      break;
  }
});
