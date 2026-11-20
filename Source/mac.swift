import Cocoa
import WebKit
import UniformTypeIdentifiers

private let projectType = UTType(exportedAs: "de.piwire.project", conformingTo: .json)
private let symbolType = UTType(exportedAs: "de.piwire.symbol", conformingTo: .json)

final class App: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    private var window: NSWindow!
    private var web: WKWebView!
    private var file: URL?
    private var pendingFile: URL?
    private var externalDocuments: [URL] = []
    private var rendererReady = false
    private var openingExternalDocument = false
    private var allowClose = false
    private var pdfWeb: WKWebView?
    private var pdfRequest: (id: Int, destination: URL)?
    private let updates = ReleaseUpdates()
    private let defaults = UserDefaults.standard
    private let systemLanguage = Locale.preferredLanguages.first?.lowercased().hasPrefix("de") == true ? "de" : "en"

    private var language: String {
        let choice = defaults.string(forKey: "language")
        return choice == "de" || choice == "en" ? choice! : systemLanguage
    }

    private func text(_ de: String, _ en: String) -> String {
        language == "de" ? de : en
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let localBuild = Bundle.main.object(forInfoDictionaryKey: "PiWireLocalBuild") as? Bool == true
        defaults.register(defaults: ["language": "system", "autoUpdates": !localBuild, "ignoreUpdates": false,
                                     "updateFailures": 0, "skippedVersion": ""])
        NSApp.setActivationPolicy(.regular)
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "bridge")
        web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1360, height: 860),
                          styleMask: [.titled, .closable, .resizable, .miniaturizable],
                          backing: .buffered, defer: false)
        window.minSize = NSSize(width: 1080, height: 680)
        window.contentView = web
        window.delegate = self
        window.appearance = NSAppearance(named: .aqua)
        window.center()

        let url = Bundle.main.resourceURL!.appendingPathComponent("web/index.html")
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        buildMenus()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func buildMenus() {
        window.title = "PiWire — " + text("Schaltplanstudio", "Schematic Editor")
        let root = NSMenu()
        func menu(_ title: String) -> NSMenu {
            let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let submenu = NSMenu(title: title)
            item.submenu = submenu
            root.addItem(item)
            return submenu
        }
        func command(_ menu: NSMenu, _ title: String, _ action: String, _ key: String = "",
                     modifiers: NSEvent.ModifierFlags = .command) {
            let item = NSMenuItem(title: title, action: #selector(editorAction(_:)), keyEquivalent: key)
            item.representedObject = action
            item.keyEquivalentModifierMask = modifiers
            item.target = self
            menu.addItem(item)
        }

        let application = menu("PiWire")
        application.addItem(withTitle: text("Über PiWire", "About PiWire"),
                            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        application.addItem(.separator())
        command(application, text("Einstellungen …", "Settings…"), "settings", ",")
        application.addItem(.separator())
        application.addItem(withTitle: text("PiWire ausblenden", "Hide PiWire"),
                            action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        application.addItem(withTitle: text("Andere ausblenden", "Hide Others"),
                            action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        application.items.last?.keyEquivalentModifierMask = [.command, .option]
        application.addItem(withTitle: text("Alle einblenden", "Show All"),
                            action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        application.addItem(.separator())
        application.addItem(withTitle: text("PiWire beenden", "Quit PiWire"), action: #selector(quit), keyEquivalent: "q").target = self

        let files = menu(text("Ablage", "File"))
        command(files, text("Neu", "New"), "new", "n")
        command(files, text("Öffnen …", "Open…"), "open", "o")
        files.addItem(.separator())
        command(files, text("Speichern", "Save"), "save", "s")
        command(files, text("Speichern unter …", "Save As…"), "saveAs", "s", modifiers: [.command, .shift])
        files.addItem(.separator())
        command(files, text("Projekt umbenennen …", "Rename Project…"), "renameProject")
        let exportItem = NSMenuItem(title: text("Exportieren", "Export"), action: nil, keyEquivalent: "")
        let exportMenu = NSMenu(title: exportItem.title)
        command(exportMenu, "PDF …", "exportPDF")
        command(exportMenu, "SVG …", "exportSVG")
        exportItem.submenu = exportMenu
        files.addItem(exportItem)
        files.addItem(.separator())
        files.addItem(withTitle: text("Fenster schließen", "Close Window"),
                      action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")

        let edit = menu(text("Bearbeiten", "Edit"))
        command(edit, text("Rückgängig", "Undo"), "undo", "z")
        command(edit, text("Wiederholen", "Redo"), "redo", "z", modifiers: [.command, .shift])
        command(edit, text("Duplizieren", "Duplicate"), "duplicate", "d")
        command(edit, text("Auswahl umbenennen …", "Rename Selection…"), "renameSelection",
                String(UnicodeScalar(NSF2FunctionKey)!), modifiers: [])
        edit.addItem(.separator())
        edit.addItem(withTitle: text("Ausschneiden", "Cut"), action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        command(edit, text("Kopieren", "Copy"), "copyComponent", "c")
        command(edit, text("Einfügen", "Paste"), "pasteComponent", "v")
        edit.addItem(withTitle: text("Alles auswählen", "Select All"), action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        let view = menu(text("Darstellung", "View"))
        command(view, text("Bauteile ein-/ausblenden", "Toggle Components"), "toggleParts")
        command(view, text("Eigenschaften ein-/ausblenden", "Toggle Properties"), "toggleInspector")
        view.addItem(.separator())
        command(view, text("Einpassen", "Fit to View"), "fit")
        command(view, text("Vergrößern", "Zoom In"), "zoomIn")
        command(view, text("Verkleinern", "Zoom Out"), "zoomOut")

        let windows = menu(text("Fenster", "Window"))
        windows.addItem(withTitle: text("Minimieren", "Minimize"),
                        action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        NSApp.windowsMenu = windows

        let help = menu(text("Hilfe", "Help"))
        command(help, text("PiWire-Hilfe", "PiWire Help"), "help")
        NSApp.helpMenu = help
        NSApp.mainMenu = root
    }

    @objc private func editorAction(_ sender: NSMenuItem) {
        guard let action = sender.representedObject as? String else { return }
        if action == "copyComponent" || action == "pasteComponent" {
            let selector = action == "copyComponent" ? #selector(NSText.copy(_:)) : #selector(NSText.paste(_:))
            web.evaluateJavaScript("window.componentClipboard('\(action)')") { result, _ in
                if result as? Bool != true { NSApp.sendAction(selector, to: nil, from: nil) }
            }
        } else {
            web.evaluateJavaScript("window.menuAction('\(action)')")
        }
    }

    @objc private func quit() { NSApp.terminate(nil) }

    private func preferences(_ changes: [String: Any]) -> [String: Any] {
        let previousLanguage = language
        if let value = changes["language"] as? String, ["system", "de", "en"].contains(value) {
            defaults.set(value, forKey: "language")
        }
        if let value = changes["autoUpdates"] as? Bool, !defaults.bool(forKey: "ignoreUpdates") {
            defaults.set(value, forKey: "autoUpdates")
        }
        if changes["ignoreUpdates"] as? Bool == true {
            defaults.set(true, forKey: "ignoreUpdates")
            defaults.set(false, forKey: "autoUpdates")
        }
        if let value = changes["updateFailures"] as? Int, (0...5).contains(value) {
            defaults.set(value, forKey: "updateFailures")
        }
        if let value = changes["skippedVersion"] as? String, value.count <= 32 {
            defaults.set(value, forKey: "skippedVersion")
        }
        for key in ["partsHidden", "inspectorHidden", "tourSeen"] {
            if let value = changes[key] as? Bool { defaults.set(value, forKey: key) }
        }
        if language != previousLanguage { buildMenus() }
        return [
            "language": defaults.string(forKey: "language") ?? "system",
            "systemLanguage": systemLanguage,
            "autoUpdates": defaults.bool(forKey: "autoUpdates"),
            "ignoreUpdates": defaults.bool(forKey: "ignoreUpdates"),
            "partsHidden": defaults.bool(forKey: "partsHidden"),
            "inspectorHidden": defaults.bool(forKey: "inspectorHidden"),
            "tourSeen": defaults.bool(forKey: "tourSeen"),
            "updateFailures": defaults.integer(forKey: "updateFailures"),
            "skippedVersion": defaults.string(forKey: "skippedVersion") ?? "",
            "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
            "platform": "mac"
        ]
    }

    private func reply(_ id: Int, _ value: Any = NSNull(), error: String? = nil) {
        let parts: [Any] = [id, value, error as Any? ?? NSNull()]
        guard let data = try? JSONSerialization.data(withJSONObject: parts),
              let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.nativeReply(...\(json))")
    }

    private func savePanel(_ name: String, extension ext: String) async -> URL? {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = name + "." + ext
        let appTypes = ["piwire": projectType, "piwire-symbol": symbolType]
        panel.allowedContentTypes = [appTypes[ext] ?? UTType(filenameExtension: ext) ?? .data]
        if appTypes[ext] != nil { panel.isExtensionHidden = false }
        return await panel.beginSheetModal(for: window) == .OK ? panel.url : nil
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let request = message.body as? [String: Any],
              let id = request["id"] as? Int, let action = request["action"] as? String else { return }
        let data = request["data"] as? [String: Any] ?? [:]
        Task { @MainActor in
            do {
                try await respond(to: action, data: data, id: id)
            } catch {
                reply(id, error: error.localizedDescription)
            }
        }
    }

    private func respond(to action: String, data: [String: Any], id: Int) async throws {
        switch action {
        case "preferences":
            reply(id, preferences(data))
        case "checkUpdate":
            guard defaults.bool(forKey: "autoUpdates"), !defaults.bool(forKey: "ignoreUpdates") else {
                reply(id)
                return
            }
            reply(id, try await updates.check())
        case "downloadUpdate":
            try await updates.fetchAsset(data["asset"] as? String ?? "")
            reply(id, true)
        case "showUpdate":
            try updates.showAsset()
            reply(id, true)
        case "openRelease":
            try updates.openRelease()
            reply(id, true)
        case "dirty":
            window.isDocumentEdited = data["dirty"] as? Bool ?? false
            reply(id, true)
        case "reset":
            file = nil
            reply(id, true)
        case "opened":
            file = pendingFile
            pendingFile = nil
            reply(id, true)
        case "copyComponent":
            guard let component = data["text"] as? String, component.utf8.count <= 100_000 else { reply(id, false); return }
            NSPasteboard.general.clearContents()
            reply(id, NSPasteboard.general.setString(component, forType: .init("de.piwire.component")))
        case "pasteComponent":
            if let component = NSPasteboard.general.string(forType: .init("de.piwire.component")), component.utf8.count <= 100_000 {
                reply(id, component)
            } else { reply(id) }
        case "symbolLibrary":
            if let value = data["text"] as? String, value.utf8.count <= 2_000_000 {
                defaults.set(value, forKey: "symbolLibrary")
            }
            reply(id, defaults.string(forKey: "symbolLibrary") ?? "[]")
        case "saveSymbol":
            guard let value = data["text"] as? String, value.utf8.count <= 100_000,
                  let destination = await savePanel(data["name"] as? String ?? "Symbol", extension: "piwire-symbol")
            else { reply(id, false); return }
            try value.write(to: destination, atomically: true, encoding: .utf8)
            reply(id, true)
        case "open", "openSymbol":
            let isSymbol = action == "openSymbol"
            let panel = NSOpenPanel()
            panel.allowedContentTypes = [isSymbol ? symbolType : projectType, .json]
            guard await panel.beginSheetModal(for: window) == .OK, let url = panel.url else { reply(id); return }
            let value = try fileText(url)
            if !isSymbol { pendingFile = url }
            reply(id, ["text": value])
        case "save":
            guard let value = data["text"] as? String, value.utf8.count <= 10_000_000 else {
                reply(id, error: text("Ungültiges Projekt.", "Invalid project."))
                return
            }
            var destination = file
            if destination == nil || data["as"] as? Bool == true {
                destination = await savePanel(data["name"] as? String ?? text("Schaltplan", "Schematic"), extension: "piwire")
            }
            guard let destination else { reply(id, false); return }
            try value.write(to: destination, atomically: true, encoding: .utf8)
            file = destination
            reply(id, true)
        case "confirm":
            let alert = NSAlert()
            alert.messageText = data["message"] as? String ?? text("Fortfahren?", "Continue?")
            alert.informativeText = data["detail"] as? String ?? ""
            alert.addButton(withTitle: text("Fortfahren", "Continue"))
            alert.addButton(withTitle: text("Abbrechen", "Cancel"))
            reply(id, await alert.beginSheetModal(for: window) == .alertFirstButtonReturn)
        case "unsaved":
            let alert = NSAlert()
            alert.messageText = text("Änderungen speichern?", "Save changes?")
            alert.informativeText = text("Dieses Projekt enthält ungespeicherte Änderungen.", "This project has unsaved changes.")
            alert.addButton(withTitle: text("Speichern", "Save"))
            alert.addButton(withTitle: text("Abbrechen", "Cancel"))
            alert.addButton(withTitle: text("Verwerfen", "Discard"))
            let result = await alert.beginSheetModal(for: window)
            reply(id, result == .alertFirstButtonReturn ? "save" : result == .alertThirdButtonReturn ? "discard" : "cancel")
        case "close":
            reply(id, true)
            allowClose = true
            NSApp.terminate(nil)
        case "export":
            try await export(data, id: id)
        default:
            reply(id, error: text("Unbekannte Aktion.", "Unknown action."))
        }
    }

    private func fileText(_ url: URL) throws -> String {
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        if size <= 10_000_000 {
            let contents = try Data(contentsOf: url)
            if contents.count <= 10_000_000, let value = String(data: contents, encoding: .utf8) { return value }
        }
        throw NSError(domain: "PiWire", code: 1, userInfo: [
            NSLocalizedDescriptionKey: text("Datei zu groß oder ungültig.", "File is too large or invalid.")
        ])
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        externalDocuments.append(contentsOf: urls.filter { $0.isFileURL && $0.pathExtension.lowercased() == "piwire" })
        openQueuedDocuments()
    }

    private func openQueuedDocuments() {
        guard rendererReady, !openingExternalDocument, !externalDocuments.isEmpty else { return }
        openingExternalDocument = true
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        Task { @MainActor in
            defer { openingExternalDocument = false }
            while !externalDocuments.isEmpty {
                let url = externalDocuments.removeFirst()
                do {
                    let source = try fileText(url)
                    let opened = try await web.callAsyncJavaScript(
                        "return await window.openExternalProject(text);",
                        arguments: ["text": source], in: nil, contentWorld: .page
                    )
                    if opened as? Bool == true {
                        file = url
                    } else {
                        // Keep the current project if the user cancels an Open request.
                        externalDocuments.removeAll()
                    }
                } catch {
                    let alert = NSAlert(error: error)
                    await alert.beginSheetModal(for: window)
                }
            }
        }
    }

    private func export(_ data: [String: Any], id: Int) async throws {
        guard let svg = data["svg"] as? String, svg.utf8.count <= 20_000_000,
              let type = data["type"] as? String, ["svg", "pdf"].contains(type) else {
            reply(id, error: text("Ungültiger Export.", "Invalid export."))
            return
        }
        guard pdfRequest == nil else {
            reply(id, error: text("Ein PDF wird bereits erstellt.", "A PDF is already being generated."))
            return
        }
        let title = data["title"] as? String ?? text("Schaltplan", "Schematic")
        guard let destination = await savePanel(title, extension: type) else { reply(id, false); return }
        if type == "svg" {
            try svg.write(to: destination, atomically: true, encoding: .utf8)
            reply(id, true)
        } else {
            pdfRequest = (id, destination)
            let view = WKWebView(frame: NSRect(x: 0, y: 0, width: 595, height: 842))
            pdfWeb = view
            view.navigationDelegate = self
            view.loadHTMLString("""
                <!doctype html><meta charset="utf-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
                <style>
                html,body{margin:0;background:white;width:595px;height:842px}
                body{display:flex;align-items:center;justify-content:center}
                svg{width:535px;height:782px;display:block}
                </style>
                """ + svg, baseURL: nil)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView === web {
            rendererReady = true
            openQueuedDocuments()
            return
        }
        guard webView === pdfWeb, let request = pdfRequest else { return }
        let configuration = WKPDFConfiguration()
        configuration.rect = CGRect(x: 0, y: 0, width: 595, height: 842)
        webView.createPDF(configuration: configuration) { [weak self] result in
            guard let self else { return }
            defer { self.pdfRequest = nil; self.pdfWeb = nil }
            do {
                try result.get().write(to: request.destination, options: .atomic)
                self.reply(request.id, true)
            } catch {
                self.reply(request.id, error: error.localizedDescription)
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        guard webView === pdfWeb, let request = pdfRequest else { return }
        reply(request.id, error: error.localizedDescription)
        pdfWeb = nil
        pdfRequest = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let scheme = action.request.url?.scheme
        decisionHandler(scheme == "file" || scheme == "about" ? .allow : .cancel)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if allowClose { return true }
        web.evaluateJavaScript("window.requestClose()")
        return false
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if allowClose { return .terminateNow }
        web?.evaluateJavaScript("window.requestClose()")
        return .terminateCancel
    }
}

@main
struct PiWireApplication {
    static func main() {
        let app = NSApplication.shared
        let delegate = App()
        app.delegate = delegate
        app.run()
    }
}
