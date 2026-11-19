import Cocoa
import WebKit
import UniformTypeIdentifiers

class App: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
 var window:NSWindow!; var web:WKWebView!; var file:URL?; var pendingFile:URL?; var allowClose=false; var pdfWeb:WKWebView?; var pdfDest:URL?; var pdfID:Int?; var busyPDF=false
 func applicationDidFinishLaunching(_ n:Notification){
  NSApp.setActivationPolicy(.regular)
  let config=WKWebViewConfiguration();config.userContentController.add(self,name:"bridge")
  web=WKWebView(frame:.zero,configuration:config);web.navigationDelegate=self
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:1360,height:860),styleMask:[.titled,.closable,.resizable,.miniaturizable],backing:.buffered,defer:false);window.minSize=NSSize(width:1080,height:680);window.title="PiWire 2 — Schaltplanstudio";window.contentView=web;window.delegate=self;window.center();window.appearance=NSAppearance(named:.aqua)
  let url=Bundle.main.resourceURL!.appendingPathComponent("web/index.html");web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent());menus();window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
 }
 func menus(){let root=NSMenu();NSApp.mainMenu=root
  func add(_ name:String)->NSMenu {let item=NSMenuItem(title:name,action:nil,keyEquivalent:"");let m=NSMenu(title:name);item.submenu=m;root.addItem(item);return m}
  let app=add("PiWire 2");let quit=NSMenuItem(title:"PiWire 2 beenden",action:#selector(quit),keyEquivalent:"q");quit.target=self;app.addItem(quit)
  let f=add("Ablage");for(t,id,key)in[("Neu","new","n"),("Öffnen …","open","o"),("Speichern","save","s"),("Speichern unter …","saveAs","S"),("PDF exportieren …","exportPDF","e")]{let item=NSMenuItem(title:t,action:#selector(action(_:)),keyEquivalent:key.lowercased());item.representedObject=id;item.target=self;if key != key.lowercased(){item.keyEquivalentModifierMask=[.command,.shift]};f.addItem(item)}
  let edit=add("Bearbeiten");for(t,id,key)in[("Rückgängig","undo","z"),("Wiederholen","redo","Z"),("Duplizieren","duplicate","d")]{let item=NSMenuItem(title:t,action:#selector(action(_:)),keyEquivalent:key.lowercased());item.representedObject=id;item.target=self;if key != key.lowercased(){item.keyEquivalentModifierMask=[.command,.shift]};edit.addItem(item)}
  edit.addItem(.separator());for(t,a,k)in[("Ausschneiden",#selector(NSText.cut(_:)),"x"),("Kopieren",#selector(NSText.copy(_:)),"c"),("Einfügen",#selector(NSText.paste(_:)),"v"),("Alles auswählen",#selector(NSText.selectAll(_:)),"a")]{edit.addItem(withTitle:t,action:a,keyEquivalent:k)}
 }
 @objc func action(_ s:NSMenuItem){if let id=s.representedObject as? String {web.evaluateJavaScript("window.menuAction('\(id)')")}}
 @objc func quit(){NSApp.terminate(nil)}
 func reply(_ id:Int,_ value:Any=NSNull(),error:String?=nil){let data=try! JSONSerialization.data(withJSONObject:[id,value,error as Any? ?? NSNull()],options:[.fragmentsAllowed]);let json=String(data:data,encoding:.utf8)!;web.evaluateJavaScript("window.nativeReply(...\(json))")}
 func panel(_ name:String,_ ext:String)->URL? {let p=NSSavePanel();p.nameFieldStringValue=name+"."+ext;p.allowedContentTypes=[UTType(filenameExtension:ext) ?? .data];return p.runModal() == .OK ? p.url : nil}
 func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage){guard message.frameInfo.isMainFrame,let m=message.body as? [String:Any],let id=m["id"] as? Int,let action=m["action"] as? String else{return};let d=m["data"] as? [String:Any] ?? [:]
  do {switch action {
  case "dirty":window.isDocumentEdited=d["dirty"] as? Bool ?? false;reply(id,true)
  case "reset":file=nil;reply(id,true)
  case "opened":file=pendingFile;pendingFile=nil;reply(id,true)
  case "open":let p=NSOpenPanel();p.allowedContentTypes=[UTType(filenameExtension:"piwire") ?? .json,.json];if p.runModal() == .OK,let u=p.url {let data=try Data(contentsOf:u);guard data.count<=10_000_000,let text=String(data:data,encoding:.utf8) else{reply(id,error:"Datei zu groß oder ungültig.");return};pendingFile=u;reply(id,["text":text])}else{reply(id)}
  case "save":guard let text=d["text"] as? String,text.utf8.count<=10_000_000 else{reply(id,error:"Ungültiges Projekt.");return};var dest=file;if dest==nil || d["as"] as? Bool==true {dest=panel(d["name"] as? String ?? "Schaltplan","piwire")};if let u=dest {try text.write(to:u,atomically:true,encoding:.utf8);file=u;reply(id,true)}else{reply(id,false)}
  case "confirm":let a=NSAlert();a.messageText=d["message"] as? String ?? "Fortfahren?";a.informativeText=d["detail"] as? String ?? "";a.addButton(withTitle:"Fortfahren");a.addButton(withTitle:"Abbrechen");reply(id,a.runModal() == .alertFirstButtonReturn)
  case "unsaved":let a=NSAlert();a.messageText="Änderungen speichern?";a.informativeText="Dieses Projekt enthält ungespeicherte Änderungen.";a.addButton(withTitle:"Speichern");a.addButton(withTitle:"Abbrechen");a.addButton(withTitle:"Verwerfen");let r=a.runModal();reply(id,r == .alertFirstButtonReturn ? "save" : r == .alertThirdButtonReturn ? "discard" : "cancel")
  case "close":allowClose=true;NSApp.terminate(nil)
  case "export":guard let svg=d["svg"] as? String,svg.utf8.count<=20_000_000 else{reply(id,error:"Ungültiger Export.");return};let type=d["type"] as? String ?? "svg";guard type=="pdf" || type=="svg" else{reply(id,error:"Unbekannter Exporttyp.");return};if busyPDF {reply(id,error:"Ein PDF wird bereits erstellt.");return};guard let dest=panel(d["title"] as? String ?? "Schaltplan",type) else{reply(id,false);return};if type=="svg"{try svg.write(to:dest,atomically:true,encoding:.utf8);reply(id,true)}else{busyPDF=true;pdfID=id;pdfDest=dest;let pw=WKWebView(frame:NSRect(x:0,y:0,width:595,height:842));pw.navigationDelegate=self;pdfWeb=pw;pw.loadHTMLString("<!doctype html><meta charset='utf-8'><style>html,body{margin:0;background:white;width:595px;height:842px}body{display:flex;align-items:center;justify-content:center}svg{width:535px;height:782px;display:block}</style>"+svg,baseURL:nil)}
  default:reply(id,error:"Unbekannte Aktion.")
  }}catch{reply(id,error:error.localizedDescription)}
 }
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){if webView===pdfWeb {let config=WKPDFConfiguration();config.rect=CGRect(x:0,y:0,width:595,height:842);webView.createPDF(configuration:config){[weak self] result in guard let self=self,let id=self.pdfID,let dest=self.pdfDest else{return};do{let data=try result.get();try data.write(to:dest,options:.atomic);self.reply(id,true)}catch{self.reply(id,error:error.localizedDescription)};self.pdfWeb=nil;self.pdfID=nil;self.pdfDest=nil;self.busyPDF=false}}}
 func webView(_ webView:WKWebView,didFail navigation:WKNavigation!,withError error:Error){if webView===pdfWeb,let id=pdfID{reply(id,error:error.localizedDescription);busyPDF=false;pdfWeb=nil}}
 func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){let scheme=action.request.url?.scheme;decisionHandler(scheme=="file" || scheme=="about" ? .allow : .cancel)}
 func windowShouldClose(_ sender:NSWindow)->Bool {if allowClose{return true};web.evaluateJavaScript("window.requestClose()");return false}
 func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply {if allowClose{return .terminateNow};web?.evaluateJavaScript("window.requestClose()");return .terminateCancel}
}
let app=NSApplication.shared;let delegate=App();app.delegate=delegate;app.run()
