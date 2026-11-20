import AppKit
import JavaScriptCore
import QuickLookThumbnailing

final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(for request: QLFileThumbnailRequest,
                                   _ handler: @escaping (QLThumbnailReply?, Error?) -> Void) {
        guard let image = Self.projectImage(request.fileURL) else {
            handler(nil, NSError(domain: "PiWireThumbnail", code: 1))
            return
        }

        let scale = min(request.maximumSize.width / image.size.width, request.maximumSize.height / image.size.height)
        let size = CGSize(width: max(1, floor(image.size.width * scale)),
                          height: max(1, floor(image.size.height * scale)))
        handler(QLThumbnailReply(contextSize: size, currentContextDrawing: {
            let bounds = CGRect(origin: .zero, size: size)
            NSColor.white.setFill()
            bounds.fill()
            image.draw(in: bounds)
            return true
        }), nil)
    }

    private static func projectImage(_ file: URL) -> NSImage? {
        guard (try? file.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? Int.max <= 10_000_000,
              let content = try? String(contentsOf: file, encoding: .utf8),
              content.utf8.count <= 10_000_000,
              let script = Bundle(for: ThumbnailProvider.self).url(forResource: "core", withExtension: "js"),
              let source = try? String(contentsOf: script, encoding: .utf8),
              let context = JSContext() else { return nil }

        // JavaScriptCore has no Web API for cloning parsed JSON.
        context.evaluateScript("globalThis.structuredClone = value => JSON.parse(JSON.stringify(value))")
        context.evaluateScript(source)
        let render = context.evaluateScript("(text) => PiWire.svg(PiWire.importDoc(JSON.parse(text)), { printing: true })")
        guard let value = render?.call(withArguments: [content]), value.isString,
              let svg = value.toString(), let image = NSImage(data: Data(svg.utf8)),
              image.size.width > 0, image.size.height > 0 else { return nil }
        return image
    }
}
