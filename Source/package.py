#!/usr/bin/env python3
"""Package a previously built PiWire desktop app as a release download."""
import json
import pathlib
import shutil
import sys
import tarfile
import zipfile

source = pathlib.Path(__file__).resolve().parent
version = json.loads((source / 'electron/package.json').read_text())['version']


def archive(platform, destination):
    build = source / 'build' / platform
    if platform == 'mac':
        image = f'PiWire-{version}-macOS-universal.dmg'
        shutil.copy2(build / image, destination / image)
        return

    shutil.copy2(source.parent / 'LICENSE', build / 'PiWire-LICENSE.txt')
    if platform == 'windows':
        name = f'PiWire-{version}-Windows-x64'
        with zipfile.ZipFile(destination / (name + '.zip'), 'w', zipfile.ZIP_DEFLATED) as package:
            for entry in sorted(build.rglob('*')):
                package.write(entry, pathlib.Path(name) / entry.relative_to(build))
    elif platform == 'linux':
        name = f'PiWire-{version}-Linux-x64'
        with tarfile.open(destination / (name + '.tar.gz'), 'w:gz') as package:
            package.add(build, arcname=name)
    else:
        raise ValueError(f'Unsupported platform: {platform}')


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('mac', 'windows', 'linux'):
        raise SystemExit('Usage: python3 package.py mac|windows|linux OUTPUT_DIRECTORY')
    output = pathlib.Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive(sys.argv[1], output)
