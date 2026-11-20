const fs = require('node:fs');
const path = require('node:path');
const {app} = require('electron');

const defaults = {
  language: 'system',
  autoUpdates: true,
  ignoreUpdates: false,
  updateFailures: 0,
  skippedVersion: '',
};

function readPreferences() {
  try {
    return {...defaults, ...JSON.parse(fs.readFileSync(preferencesPath(), 'utf8'))};
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return {...defaults};
    throw error;
  }
}

function preferencesPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function preferences(changes = {}) {
  const settings = readPreferences();
  if (['system', 'de', 'en'].includes(changes.language)) settings.language = changes.language;
  if (typeof changes.autoUpdates === 'boolean' && !settings.ignoreUpdates) {
    settings.autoUpdates = changes.autoUpdates;
  }
  if (changes.ignoreUpdates === true) {
    settings.ignoreUpdates = true;
    settings.autoUpdates = false;
  }
  if (Number.isInteger(changes.updateFailures) && changes.updateFailures >= 0 && changes.updateFailures <= 5) {
    settings.updateFailures = changes.updateFailures;
  }
  if (typeof changes.skippedVersion === 'string' && changes.skippedVersion.length <= 32) {
    settings.skippedVersion = changes.skippedVersion;
  }
  if (Object.keys(changes).length) {
    const destination = preferencesPath();
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    const temporary = destination + '.tmp-' + process.pid;
    fs.writeFileSync(temporary, JSON.stringify(settings));
    fs.renameSync(temporary, destination);
  }
  const systemLanguage = /^de(?:-|$)/i.test(app.getLocale()) ? 'de' : 'en';
  return {
    ...settings,
    systemLanguage,
    version: app.getVersion(),
    platform: process.platform === 'win32' ? 'windows' : 'linux',
  };
}

module.exports = {preferences};
