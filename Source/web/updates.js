'use strict';

const packages = {
  mac: ['macOS-universal.dmg', 'macOS-universal.zip'],
  windows: ['Windows-x64.zip'],
  linux: ['Linux-x64.tar.gz'],
};

function parseVersion(input) {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(input ?? '');
  if (!match) throw new Error('Invalid version');
  const version = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  if (!version.every(Number.isSafeInteger)) throw new Error('Invalid version');
  return version;
}

function newerVersion(current, release) {
  const installed = parseVersion(current);
  const available = parseVersion(release);
  for (const [index, part] of available.entries()) {
    if (part !== installed[index]) return part > installed[index];
  }
  return false;
}

function findPackage(release, platform) {
  for (const suffix of packages[platform] ?? []) {
    const name = 'PiWire-' + parseVersion(release.tag_name).join('.') + '-' + suffix;
    const asset = release.assets.find(item => item.name === name);
    if (asset) return asset.name;
  }
  // Older Mac releases used 2.0 in the asset name even when the release tag was 2.0.1.
  if (platform === 'mac' && release.tag_name === 'v2.0.1' &&
      release.assets.some(item => item.name === 'PiWire-2.0-macOS-universal.zip')) {
    return 'PiWire-2.0-macOS-universal.zip';
  }
  return null;
}

let preferences;
let startupProject = typeof doc === 'undefined' ? null : doc;
function renderSettings() {
  $('languageSetting').value = preferences.language;
  $('updateSetting').checked = preferences.autoUpdates && !preferences.ignoreUpdates;
  $('updateSetting').disabled = preferences.ignoreUpdates;
  $('updateDisabled').hidden = !preferences.ignoreUpdates;
  $('appVersion').textContent = preferences.version;
}

function applyLanguage() {
  localizeEditor(preferences.language === 'system' ? preferences.systemLanguage : preferences.language);
  if (startupProject === doc && JSON.stringify(doc) === saved && !undo.length && !redo.length) {
    doc = C.blankProject();
    startupProject = doc;
    saved = JSON.stringify(doc);
    selected = null;
  }
  palette();
  changed();
  inspect();
  renderSettings();
}

async function setPreferences(changes) {
  preferences = await native('preferences', changes);
  return preferences;
}

function openSettings() {
  if (!preferences) return;
  renderSettings();
  $('settingsDialog').showModal();
}

if (typeof module !== 'undefined') module.exports = {parseVersion, newerVersion, findPackage};

if (typeof document !== 'undefined') {
  $('languageSetting').onchange = async () => {
    try {
      await setPreferences({language: $('languageSetting').value});
      applyLanguage();
    } catch (error) {
      toast(error.message);
      renderSettings();
    }
  };
  $('updateSetting').onchange = async () => {
    try {
      await setPreferences({autoUpdates: $('updateSetting').checked});
    } catch (error) {
      toast(error.message);
    }
    renderSettings();
  };
  $('closeSettings').onclick = () => $('settingsDialog').close();
  $('updateDialog').addEventListener('cancel', event => event.preventDefault());

  native('preferences').then(async initial => {
    preferences = initial;
    restorePanelLayout(initial);
    applyLanguage();
    if (!initial.tourSeen && startupProject === doc && !undo.length && JSON.stringify(doc) === saved) {
      startTour(true);
      try { await setPreferences({tourSeen:true}); } catch {}
    }
    await checkForUpdate();
  }).catch(() => {});
}

function updatePrompt(title, details, buttons) {
  if (tourPreview) {
    document.addEventListener('piwire-tour-finished', () => updatePrompt(title, details, buttons), {once:true});
    return;
  }
  const dialog = $('updateDialog');
  $('updateHeading').textContent = tr(title);
  $('updateDetails').textContent = details;
  $('updateActions').replaceChildren(...buttons.map(([label, action, primary]) => {
    const button = document.createElement('button');
    button.textContent = tr(label);
    if (primary) button.className = 'primary';
    button.onclick = async () => {
      for (const control of $('updateActions').children) control.disabled = true;
      try {
        await action();
      } catch (error) {
        toast(error.message);
      } finally {
        for (const control of $('updateActions').children) control.disabled = false;
      }
    };
    return button;
  }));
  if (dialog.open) return;
  const other = document.querySelector('dialog[open]');
  if (other) {
    other.addEventListener('close', () => {
      if (!dialog.open && preferences.autoUpdates && !preferences.ignoreUpdates) dialog.showModal();
    }, {once: true});
  } else {
    dialog.showModal();
  }
}

function closeUpdatePrompt() {
  $('updateDialog').close();
}

async function checkForUpdate() {
  if (!preferences.autoUpdates || preferences.ignoreUpdates) return;
  let release, isNew;
  try {
    release = await native('checkUpdate');
    isNew = release && newerVersion(preferences.version, release.tag_name);
  } catch {
    if (!preferences.autoUpdates || preferences.ignoreUpdates) return;
    const count = Math.min(5, preferences.updateFailures + 1);
    await setPreferences({updateFailures: count});
    if (count === 5) {
      updatePrompt('PiWire konnte nicht nach Updates suchen',
        tr('Die Suche ist bei fünf App-Starts in Folge fehlgeschlagen.'), [
          ['Für immer ignorieren', async () => {
            await setPreferences({ignoreUpdates: true});
            closeUpdatePrompt();
          }],
          ['OK', async () => {
            await setPreferences({updateFailures: 0});
            closeUpdatePrompt();
          }, true],
        ]);
    }
    return;
  }
  if (preferences.updateFailures) await setPreferences({updateFailures: 0});
  if (!preferences.autoUpdates || preferences.ignoreUpdates || !isNew) return;
  const version = parseVersion(release.tag_name).join('.');
  if (version === preferences.skippedVersion) return;
  offerUpdate(release, version);
}

function offerUpdate(release, version) {
  const asset = findPackage(release, preferences.platform);
  const details = tr('Installierte Version: {0}', preferences.version);
  updatePrompt(tr('PiWire {0} ist verfügbar', version),
    asset ? details : details + ' · ' + tr('Für diese Plattform ist kein passendes Paket hinterlegt.'), [
      ['Version überspringen', async () => {
        await setPreferences({skippedVersion: version});
        closeUpdatePrompt();
      }],
      asset ? ['Herunterladen', () => downloadUpdate(asset), true] :
        ['GitHub-Release öffnen', async () => {
          await native('openRelease');
          closeUpdatePrompt();
        }, true],
    ]);
}

async function downloadUpdate(asset) {
  updatePrompt('Update wird heruntergeladen …', asset, []);
  try {
    await native('downloadUpdate', {asset});
  } catch {
    updatePrompt('Download fehlgeschlagen.', asset, [
      ['Abbrechen', closeUpdatePrompt],
      ['Erneut versuchen', () => downloadUpdate(asset), true],
    ]);
    return;
  }
  const diskImage = preferences.platform === 'mac' && asset.endsWith('.dmg');
  const instructions = {
    mac: diskImage ? 'Öffne das DMG, beende PiWire und ziehe die neue App in „Programme“. Bestätige „Ersetzen“, wenn Finder danach fragt. Starte danach die neue App.' :
      'Entpacke das ZIP-Archiv, beende PiWire und öffne die neue App.',
    windows: 'Entpacke das gesamte ZIP-Archiv, beende PiWire und öffne PiWire.exe im neuen Ordner.',
    linux: 'Entpacke das Archiv, beende PiWire und starte im neuen Ordner ./start-piwire.sh.',
  };
  updatePrompt('Update ist bereit', tr(instructions[preferences.platform]), [
    ['Schließen', closeUpdatePrompt],
    ['PiWire beenden', async () => {
      closeUpdatePrompt();
      await window.requestClose();
    }],
    [diskImage ? 'DMG öffnen' : 'Download anzeigen', () => native('showUpdate'), true],
  ]);
}
