const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openGoogleAuth: (baseUrl)               => ipcRenderer.invoke('open-google-auth', baseUrl),
  selectFolder:   ()                      => ipcRenderer.invoke('select-folder'),
  readFile:       (p)                     => ipcRenderer.invoke('read-file', p),
  openFile:       (url, fileName, token)  => ipcRenderer.invoke('open-file', { url, fileName, token }),
});
