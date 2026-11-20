import Cocoa
import CryptoKit

final class ReleaseUpdates {
    private static let repository = "LordSteini/PiWire"
    private let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 12
        configuration.timeoutIntervalForResource = 300
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: configuration)
    }()
    private var release: Release?
    private var download: URL?
    private var checked = false
    private var downloading = false

    struct Release: Decodable {
        struct Asset: Decodable {
            let name: String
            let size: Int
            let digest: String?
        }
        let tag_name: String
        let assets: [Asset]
    }

    enum UpdateError: Error {
        case invalidRelease, invalidAsset, invalidDownload, openingFailed
    }

    @MainActor
    func check() async throws -> [String: Any] {
        guard !checked else { throw UpdateError.invalidRelease }
        checked = true
        let url = URL(string: "https://api.github.com/repos/\(Self.repository)/releases/latest")!
        var request = URLRequest(url: url, timeoutInterval: 12)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("PiWire", forHTTPHeaderField: "User-Agent")
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              response.url?.host == "api.github.com" else { throw UpdateError.invalidRelease }
        let result = try JSONDecoder().decode(Release.self, from: data)
        guard result.tag_name.range(of: #"^v?[0-9]+\.[0-9]+(?:\.[0-9]+)?$"#, options: .regularExpression) != nil
        else { throw UpdateError.invalidRelease }
        release = result
        return ["tag_name": result.tag_name, "assets": result.assets.map { ["name": $0.name] }]
    }

    @MainActor
    func fetchAsset(_ name: String) async throws {
        guard !downloading, let release, let asset = release.assets.first(where: { $0.name == name }),
              (1...500_000_000).contains(asset.size),
              name.range(of: #"^PiWire-[0-9]+\.[0-9]+(?:\.[0-9]+)?-macOS-universal\.(?:dmg|zip)$"#,
                         options: .regularExpression) != nil
        else { throw UpdateError.invalidAsset }
        downloading = true
        defer { downloading = false }
        download = nil
        let url = URL(string: "https://github.com/\(Self.repository)/releases/download/\(release.tag_name)/\(name)")!
        let (temporary, response) = try await session.download(from: url)
        defer { try? FileManager.default.removeItem(at: temporary) }

        let hosts = ["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"]
        guard (response as? HTTPURLResponse)?.statusCode == 200, response.url?.scheme == "https",
              hosts.contains(response.url?.host ?? ""),
              try temporary.resourceValues(forKeys: [.fileSizeKey]).fileSize == asset.size
        else { throw UpdateError.invalidDownload }

        if let digest = asset.digest {
            let file = try FileHandle(forReadingFrom: temporary)
            defer { try? file.close() }
            var sha = SHA256()
            while let chunk = try file.read(upToCount: 1_048_576), !chunk.isEmpty { sha.update(data: chunk) }
            let actual = "sha256:" + sha.finalize().map { String(format: "%02x", $0) }.joined()
            guard digest.lowercased() == actual else { throw UpdateError.invalidDownload }
        }

        let downloads = try FileManager.default.url(for: .downloadsDirectory, in: .userDomainMask,
                                                    appropriateFor: nil, create: true)
        let directory = downloads.appendingPathComponent("PiWire Updates", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let target = directory.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: target.path) {
            _ = try FileManager.default.replaceItemAt(target, withItemAt: temporary)
        } else {
            try FileManager.default.moveItem(at: temporary, to: target)
        }
        download = target
    }

    @MainActor
    func showAsset() throws {
        guard let download else { throw UpdateError.invalidAsset }
        if download.pathExtension == "dmg" {
            guard NSWorkspace.shared.open(download) else { throw UpdateError.openingFailed }
        } else {
            NSWorkspace.shared.activateFileViewerSelecting([download])
        }
    }

    @MainActor
    func openRelease() throws {
        guard let release else { throw UpdateError.invalidRelease }
        let url = URL(string: "https://github.com/\(Self.repository)/releases/tag/\(release.tag_name)")!
        guard NSWorkspace.shared.open(url) else { throw UpdateError.openingFailed }
    }
}
