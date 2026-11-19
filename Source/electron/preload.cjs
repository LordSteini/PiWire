const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('desktop',{request:(action,data)=>ipcRenderer.invoke('piwire',action,data)});
