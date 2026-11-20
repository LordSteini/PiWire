const {app,BrowserWindow,ipcMain,dialog,Menu}=require('electron');const fs=require('node:fs/promises'),path=require('node:path');let win,file=null,pendingFile=null,allowClose=false;
const updates = require('./updates.cjs');
const {preferences} = require('./preferences.cjs');
let activeLanguage = 'en';
const label = (de, en) => activeLanguage === 'de' ? de : en;
const safeName=s=>String(s||label('Schaltplan', 'Schematic')).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,150);
let reportedFailure = false;
function reportFailure(title, details) {
  if (reportedFailure) return;
  reportedFailure = true;
  console.error(title, details);
  dialog.showErrorBox(title, details);
  app.exit(1);
}

function buildMenus() {
  const settings = preferences();
  activeLanguage = settings.language === 'system' ? settings.systemLanguage : settings.language;
  win.setTitle('PiWire — ' + label('Schaltplanstudio', 'Schematic Editor'));
  const entry = (de, en, id, accelerator) => ({
    label: label(de, en),
    accelerator,
    click: () => win.webContents.executeJavaScript(`window.menuAction(${JSON.stringify(id)})`).catch(console.error),
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: label('Datei', 'File'),
      submenu: [
        entry('Neu', 'New', 'new', 'Ctrl+N'),
        entry('Öffnen …', 'Open…', 'open', 'Ctrl+O'),
        {type: 'separator'},
        entry('Speichern', 'Save', 'save', 'Ctrl+S'),
        entry('Speichern unter …', 'Save As…', 'saveAs', 'Ctrl+Shift+S'),
        {type: 'separator'},
        entry('PDF exportieren …', 'Export PDF…', 'exportPDF'),
        entry('SVG exportieren …', 'Export SVG…', 'exportSVG'),
        {type: 'separator'},
        entry('Einstellungen …', 'Settings…', 'settings', 'Ctrl+,'),
        {label: label('Beenden', 'Quit'), click: () => win.close()},
      ],
    },
    {
      label: label('Bearbeiten', 'Edit'),
      submenu: [
        entry('Rückgängig', 'Undo', 'undo', 'Ctrl+Z'),
        entry('Wiederholen', 'Redo', 'redo', 'Ctrl+Shift+Z'),
        entry('Duplizieren', 'Duplicate', 'duplicate', 'Ctrl+D'),
        {type: 'separator'},
        {role: 'cut', label: label('Ausschneiden', 'Cut')},
        {role: 'copy', label: label('Kopieren', 'Copy')},
        {role: 'paste', label: label('Einfügen', 'Paste')},
        {role: 'selectAll', label: label('Alles auswählen', 'Select All')},
      ],
    },
    {
      label: label('Ansicht', 'View'),
      submenu: [
        entry('Einpassen', 'Fit to View', 'fit'),
        entry('Vergrößern', 'Zoom In', 'zoomIn'),
        entry('Verkleinern', 'Zoom Out', 'zoomOut'),
      ],
    },
    {label: label('Hilfe', 'Help'), submenu: [entry('PiWire-Hilfe', 'PiWire Help', 'help')]},
  ]));
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    title: 'PiWire',
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
    reportFailure(label('PiWire konnte nicht starten', 'PiWire could not start'), preloadPath + '\n' + error);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    reportFailure(label('PiWire-Fenster wurde beendet', 'The PiWire window closed unexpectedly'), details.reason + ' (' + details.exitCode + ')');
  });
  win.on('close',e=>{if(!allowClose){e.preventDefault();win.webContents.executeJavaScript('window.requestClose()').catch(console.error)}});
  buildMenus();
  await win.loadFile(path.join(__dirname, 'web', 'index.html'));
}).catch(error => {
  reportFailure(label('PiWire konnte nicht starten', 'PiWire could not start'), String(error));
});
app.on('window-all-closed',()=>app.quit());
ipcMain.handle('piwire',async(event,action,data={})=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error(label('Ungültiger Aufruf.', 'Invalid request.'));switch(action){
case 'preferences': {
  const settings = preferences(data);
  if (data.language) buildMenus();
  return settings;
}
case 'checkUpdate': {
  const settings = preferences();
  return settings.autoUpdates && !settings.ignoreUpdates ? updates.check() : null;
}
case 'downloadUpdate': return updates.fetchAsset(data.asset);
case 'showUpdate': return updates.showAsset();
case 'openRelease': return updates.openRelease();

case 'dirty':
  if (process.platform === 'darwin') win.setDocumentEdited(!!data.dirty);
  return true;
case'reset':file=null;return true;
case'opened':file=pendingFile;pendingFile=null;return true;
case'open':{let r=await dialog.showOpenDialog(win,{filters:[{name:label('PiWire-Projekt', 'PiWire project'),extensions:['piwire','json']}],properties:['openFile']});if(r.canceled)return null;let u=r.filePaths[0],stat=await fs.stat(u);if(stat.size>10_000_000)throw Error(label('Datei zu groß.', 'File is too large.'));let text=await fs.readFile(u,'utf8');pendingFile=u;return{text};}
case'save':{if(typeof data.text!=='string'||Buffer.byteLength(data.text)>10_000_000)throw Error(label('Ungültiges Projekt.', 'Invalid project.'));let u=file;if(!u||data.as){let r=await dialog.showSaveDialog(win,{defaultPath:safeName(data.name)+'.piwire',filters:[{name:label('PiWire-Projekt', 'PiWire project'),extensions:['piwire']}]});if(r.canceled)return false;u=r.filePath;}let tmp=u+'.tmp-'+process.pid;await fs.writeFile(tmp,data.text);await fs.rename(tmp,u);file=u;return true;}
case'confirm':{let r=await dialog.showMessageBox(win,{type:'question',message:String(data.message||label('Fortfahren?', 'Continue?')),detail:String(data.detail||''),buttons:[label('Fortfahren', 'Continue'),label('Abbrechen', 'Cancel')],cancelId:1,defaultId:1});return r.response===0;}
case'unsaved':{let r=await dialog.showMessageBox(win,{type:'question',message:label('Änderungen speichern?', 'Save changes?'),detail:label('Dieses Projekt enthält ungespeicherte Änderungen.', 'This project has unsaved changes.'),buttons:[label('Speichern', 'Save'),label('Abbrechen', 'Cancel'),label('Verwerfen', 'Discard')],cancelId:1,defaultId:0});return['save','cancel','discard'][r.response];}
case'close':allowClose=true;win.close();return true;
case'export':{if(!['svg','pdf'].includes(data.type)||typeof data.svg!=='string'||data.svg.length>20_000_000)throw Error(label('Ungültiger Export.', 'Invalid export.'));let r=await dialog.showSaveDialog(win,{defaultPath:safeName(data.title)+'.'+data.type,filters:[{name:data.type.toUpperCase(),extensions:[data.type]}]});if(r.canceled)return false;if(data.type==='svg'){await fs.writeFile(r.filePath,data.svg);return true;}let print=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});try{let html=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:A4;margin:0}html,body{margin:0;width:210mm;height:297mm;background:white}body{display:flex;align-items:center;justify-content:center}svg{width:190mm;height:277mm}</style>${data.svg}`;await print.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));let pdf=await print.webContents.printToPDF({pageSize:'A4',printBackground:true,preferCSSPageSize:true,margins:{top:0,bottom:0,left:0,right:0}});await fs.writeFile(r.filePath,pdf);return true;}finally{print.destroy();}}
default:throw Error(label('Unbekannte Aktion.', 'Unknown action.'));}});
