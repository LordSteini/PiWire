const {app,BrowserWindow,ipcMain,dialog,Menu}=require('electron');const fs=require('node:fs/promises'),path=require('node:path');let win,file=null,pendingFile=null,allowClose=false;
const safeName=s=>String(s||'Schaltplan').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,150);
let reportedFailure = false;
function reportFailure(title, details) {
  if (reportedFailure) return;
  reportedFailure = true;
  console.error(title, details);
  dialog.showErrorBox(title, details);
  app.exit(1);
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    title: 'PiWire 2 — Schaltplanstudio',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_a, _b, callback) => callback(false));
  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    reportFailure('PiWire konnte nicht starten', preloadPath + '\n' + error);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    reportFailure('PiWire-Fenster wurde beendet', details.reason + ' (' + details.exitCode + ')');
  });
  win.on('close',e=>{if(!allowClose){e.preventDefault();win.webContents.executeJavaScript('window.requestClose()').catch(console.error)}});const action=id=>()=>win.webContents.executeJavaScript(`window.menuAction(${JSON.stringify(id)})`);Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Datei',submenu:[{label:'Neu',accelerator:'CmdOrCtrl+N',click:action('new')},{label:'Öffnen',accelerator:'CmdOrCtrl+O',click:action('open')},{label:'Speichern',accelerator:'CmdOrCtrl+S',click:action('save')},{label:'Speichern unter',accelerator:'CmdOrCtrl+Shift+S',click:action('saveAs')},{label:'PDF exportieren',click:action('exportPDF')},{type:'separator'},{label:'Beenden',click:()=>win.close()}]},{label:'Bearbeiten',submenu:[{label:'Rückgängig',accelerator:'CmdOrCtrl+Z',click:action('undo')},{label:'Wiederholen',accelerator:'CmdOrCtrl+Shift+Z',click:action('redo')},{label:'Duplizieren',accelerator:'CmdOrCtrl+D',click:action('duplicate')},{type:'separator'},{role:'cut',label:'Ausschneiden'},{role:'copy',label:'Kopieren'},{role:'paste',label:'Einfügen'},{role:'selectAll',label:'Alles auswählen'}]}]));
  await win.loadFile(path.join(__dirname, 'web', 'index.html'));
}).catch(error => {
  reportFailure('PiWire konnte nicht starten', String(error));
});
app.on('window-all-closed',()=>app.quit());
ipcMain.handle('piwire',async(event,action,data={})=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Ungültiger Aufruf.');switch(action){
case 'dirty':
  if (process.platform === 'darwin') win.setDocumentEdited(!!data.dirty);
  return true;
case'reset':file=null;return true;
case'opened':file=pendingFile;pendingFile=null;return true;
case'open':{let r=await dialog.showOpenDialog(win,{filters:[{name:'PiWire-Projekt',extensions:['piwire','json']}],properties:['openFile']});if(r.canceled)return null;let u=r.filePaths[0],stat=await fs.stat(u);if(stat.size>10_000_000)throw Error('Datei zu groß.');let text=await fs.readFile(u,'utf8');pendingFile=u;return{text};}
case'save':{if(typeof data.text!=='string'||Buffer.byteLength(data.text)>10_000_000)throw Error('Ungültiges Projekt.');let u=file;if(!u||data.as){let r=await dialog.showSaveDialog(win,{defaultPath:safeName(data.name)+'.piwire',filters:[{name:'PiWire-Projekt',extensions:['piwire']}]});if(r.canceled)return false;u=r.filePath;}let tmp=u+'.tmp-'+process.pid;await fs.writeFile(tmp,data.text);await fs.rename(tmp,u);file=u;return true;}
case'confirm':{let r=await dialog.showMessageBox(win,{type:'question',message:String(data.message||'Fortfahren?'),detail:String(data.detail||''),buttons:['Fortfahren','Abbrechen'],cancelId:1,defaultId:1});return r.response===0;}
case'unsaved':{let r=await dialog.showMessageBox(win,{type:'question',message:'Änderungen speichern?',detail:'Dieses Projekt enthält ungespeicherte Änderungen.',buttons:['Speichern','Abbrechen','Verwerfen'],cancelId:1,defaultId:0});return['save','cancel','discard'][r.response];}
case'close':allowClose=true;win.close();return true;
case'export':{if(!['svg','pdf'].includes(data.type)||typeof data.svg!=='string'||data.svg.length>20_000_000)throw Error('Ungültiger Export.');let r=await dialog.showSaveDialog(win,{defaultPath:safeName(data.title)+'.'+data.type,filters:[{name:data.type.toUpperCase(),extensions:[data.type]}]});if(r.canceled)return false;if(data.type==='svg'){await fs.writeFile(r.filePath,data.svg);return true;}let print=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});try{let html=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:A4;margin:0}html,body{margin:0;width:210mm;height:297mm;background:white}body{display:flex;align-items:center;justify-content:center}svg{width:190mm;height:277mm}</style>${data.svg}`;await print.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));let pdf=await print.webContents.printToPDF({pageSize:'A4',printBackground:true,preferCSSPageSize:true,margins:{top:0,bottom:0,left:0,right:0}});await fs.writeFile(r.filePath,pdf);return true;}finally{print.destroy();}}
default:throw Error('Unbekannte Aktion.');}});
