#!/usr/bin/env python3
"""Build PiWire 2: python3 build.py mac|windows|linux. No third-party Python packages."""
import sys, pathlib, subprocess, shutil, urllib.request, zipfile, hashlib, plistlib, tempfile
base=pathlib.Path(__file__).resolve().parent
platform=sys.argv[1] if len(sys.argv)>1 else 'mac'
out=base/'build'/platform
out.mkdir(parents=True,exist_ok=True)
if platform=='mac':
 app=out/'PiWire.app'/'Contents';(app/'MacOS').mkdir(parents=True,exist_ok=True);(app/'Resources').mkdir(exist_ok=True)
 for arch in ['arm64','x86_64']:
  subprocess.run(['swiftc',str(base/'mac.swift'),str(base/'mac-updates.swift'),'-module-cache-path',str(base/'build/cache'),'-target',arch+'-apple-macosx13.0','-framework','Cocoa','-framework','WebKit','-o',str(out/arch)],check=True)
 subprocess.run(['lipo','-create',str(out/'arm64'),str(out/'x86_64'),'-output',str(app/'MacOS/PiWire2')],check=True)
 shutil.copy(base/'Info.plist',app/'Info.plist');shutil.copy(base/'AppIcon.icns',app/'Resources/AppIcon.icns');shutil.copytree(base/'web',app/'Resources/web',dirs_exist_ok=True)
 subprocess.run(['codesign','--force','--deep','--sign','-',str(app.parent)],check=True)
 with (app/'Info.plist').open('rb') as plist:
  version=plistlib.load(plist)['CFBundleShortVersionString']
 image=out/f'PiWire-{version}-macOS-universal.dmg'
 with tempfile.TemporaryDirectory(dir=out) as temp:
  temp=pathlib.Path(temp)
  stage=temp/'image'
  stage.mkdir()
  subprocess.run(['ditto',str(app.parent),str(stage/'PiWire.app')],check=True)
  (stage/'Applications').symlink_to('/Applications',target_is_directory=True)
  shutil.copyfile(base/'packaging/layout.dsstore',stage/'.DS_Store')
  shutil.copyfile(base/'packaging/background.png',stage/'.background.png')
  hybrid=temp/'hybrid.dmg'
  subprocess.run(['hdiutil','makehybrid','-hfs','-hfs-volume-name','PiWire',
                  '-hfs-openfolder',str(stage),'-o',str(hybrid),str(stage)],check=True)
  subprocess.run(['hdiutil','convert',str(hybrid),'-format','UDZO','-ov','-o',str(image)],check=True)
 print('Disk image:',image)

elif platform in ['windows','linux']:
 target='win32-x64' if platform=='windows' else 'linux-x64';version='45.3.1';name=f'electron-v{version}-{target}.zip';url=f'https://github.com/electron/electron/releases/download/v{version}/'
 expected={'windows':'d92d1aa4700e3a7e7f174731f5086ebd9c21f9773e642b260160fe0a6ebe12d2','linux':'c61d44206f8bd533d30310840b5baaa7fd0e8421cd711b8d1f719a7a336cbce7'}[platform]
 archive=base/'build'/name
 if not archive.exists():urllib.request.urlretrieve(url+name,archive)
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:raise RuntimeError('SHA-256 mismatch')
 with zipfile.ZipFile(archive) as z:
  z.extractall(out)
  for info in z.infolist():
   mode=info.external_attr>>16
   if mode and sys.platform!='win32':(out/info.filename).chmod(mode)
 dest=out/'resources/app';dest.mkdir(parents=True,exist_ok=True)
 for p in (base/'electron').glob('*'):
  if p.suffix in ('.cjs', '.json'):shutil.copy2(p,dest/p.name)
 (out/'resources/default_app.asar').unlink(missing_ok=True)
 for name in ('START-HIER.txt', 'Beispiel-LED.piwire', 'Beispiel-Schaltplan.svg'):
  shutil.copy2(base/name,out/name)
 launcher='Diagnose-PiWire.cmd' if platform=='windows' else 'start-piwire.sh'
 shutil.copy2(base/'launchers'/launcher,out/launcher)
 shutil.copytree(base/'web',dest/'web',dirs_exist_ok=True)
 old,new=('electron.exe','PiWire.exe') if platform=='windows' else ('electron','piwire')
 if (out/new).exists():(out/new).unlink()
 (out/old).rename(out/new)
else:raise SystemExit('Usage: python3 build.py mac|windows|linux')
print('Built:',out)
