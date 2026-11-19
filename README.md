# PiWire 2

**Draw, document, and share Raspberry Pi GPIO wiring diagrams.**

PiWire is an offline desktop schematic editor for Raspberry Pi projects with a standard 40-pin header. Drop components onto the canvas, connect their pins, and export a clean vector diagram for a build guide or project README. The editor interface is in German.

[Download PiWire](https://github.com/LordSteini/PiWire/releases/tag/v2.0.1) · [Open the LED example](Source/Beispiel-LED.piwire) · [View the SVG export](Source/Beispiel-Schaltplan.svg)

![PiWire SVG export showing GPIO17 wired to an LED through a 220 Ω resistor](Source/Beispiel-Schaltplan.svg)

## Downloads

| Platform | Download | How to start | Test status |
| --- | --- | --- | --- |
| macOS 13+ · Apple Silicon and Intel | [Universal ZIP](https://github.com/LordSteini/PiWire/releases/download/v2.0.1/PiWire-2.0-macOS-universal.zip) | Extract and open `PiWire 2.app`. See [first launch on macOS](#first-launch-on-macos) if prompted. | App launch and editor tested on Apple Silicon |
| Windows 10/11 · x64 | [Windows ZIP](https://github.com/LordSteini/PiWire/releases/download/v2.0.1/PiWire-2.0.1-Windows-x64.zip) | Extract the whole archive and open `PiWire.exe`. | Launch test pending |
| Linux desktop · x86-64 | [Linux TAR.GZ](https://github.com/LordSteini/PiWire/releases/download/v2.0.1/PiWire-2.0.1-Linux-x64.tar.gz) | Extract the archive and run `./start-piwire.sh` from the extracted directory. | Launch confirmed on Zorin OS |

The macOS app reports version **2.0**. The Windows and Linux packages report **2.0.1** and include updated launchers and an updated Electron host. The three builds share the same editor and project format. Linux requires an x86-64 desktop with Chromium runtime libraries and sandbox support. Raspberry Pi OS on ARM is outside the supported download targets.

### First launch on macOS

1. Download the macOS ZIP from this repository’s Releases page, extract it, and double-click `PiWire 2.app` in Finder.
2. If macOS blocks PiWire because the developer cannot be verified, open **System Settings → Privacy & Security** (**Systemeinstellungen → Datenschutz & Sicherheit**).
3. In the **Security** section, click **Open Anyway** (**Dennoch öffnen**) for PiWire and confirm the prompt. macOS remembers this exception for the app.

[Apple’s guide to opening apps on macOS](https://support.apple.com/en-us/102445)

## Draw your first diagram

1. Open `Beispiel-LED.piwire` with **Öffnen**, or choose a component from the palette to start from scratch.
2. Click one pin and then another to connect them. Click the grid in between to add bends, or press **Esc** to cancel.
3. Use the right sidebar to edit names and values. Press **R** to rotate a selected component.
4. Save the editable `.piwire` file or export it as **PDF** or **SVG**.

PiWire includes **26 component templates** and supports custom modules with up to 40 connectors. The GPIO block shows physical pin numbers and BCM functions. Choose which pins appear to keep small diagrams readable. SVG and single-page A4 PDF exports use black vector symbols on a white background.

PiWire draws schematics. For voltage, current limits, and pin assignments, check your board and module datasheets.

## Build from source

The shared editor lives in [`Source/web/`](Source/web). macOS uses Swift and system WebKit. Windows and Linux use Electron.

```sh
cd Source
node test.cjs
python3 build.py mac
python3 build.py windows
python3 build.py linux
```

Run only the build command for the platform you want to package. The macOS build needs Xcode Command Line Tools. Windows and Linux packaging downloads the pinned Electron runtime and verifies its SHA-256 checksum. Build output goes to `Source/build/`.

## License

PiWire is available under the [MIT License](LICENSE). The Windows and Linux packages also include Electron and Chromium license notices.
