const {app, net, shell} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');

const repository = 'LordSteini/PiWire';
const github = 'https://github.com/' + repository;
const api = 'https://api.github.com/repos/' + repository + '/releases/latest';
let release;
let download;
let checked = false;
let downloading = false;

async function check() {
  if (checked) throw new Error('Update check already attempted');
  checked = true;
  const response = await net.fetch(api, {
    headers: {'Accept': 'application/vnd.github+json', 'User-Agent': 'PiWire'},
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Release metadata unavailable');
  const result = await response.json();
  if (!/^v?\d+\.\d+(?:\.\d+)?$/.test(result.tag_name) || !Array.isArray(result.assets)) {
    throw new Error('Invalid release metadata');
  }
  release = result;
  return {tag_name: release.tag_name, assets: release.assets.map(({name}) => ({name}))};
}

async function fetchAsset(name) {
  const filename = process.platform === 'win32'
    ? /^PiWire-\d+\.\d+(?:\.\d+)?-Windows-x64\.zip$/
    : /^PiWire-\d+\.\d+(?:\.\d+)?-Linux-x64\.tar\.gz$/;
  const asset = release?.assets.find(asset => asset.name === name);
  if (downloading || !asset || typeof name !== 'string' || !filename.test(name) ||
      !Number.isInteger(asset.size) || asset.size < 1 || asset.size > 500_000_000) {
    throw new Error('Invalid release asset');
  }
  downloading = true;
  download = undefined;
  const directory = path.join(app.getPath('downloads'), 'PiWire Updates');
  const target = path.join(directory, name);
  const temporary = target + '.' + randomUUID() + '.part';
  try {
    const response = await net.fetch(github + '/releases/download/' + release.tag_name + '/' + name, {
      signal: AbortSignal.timeout(300_000),
      cache: 'no-store',
    });
    const url = new URL(response.url);
    const allowedHosts = ['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'];
    if (!response.ok || url.protocol !== 'https:' || !allowedHosts.includes(url.host)) {
      throw new Error('Download unavailable');
    }
    await fs.mkdir(directory, {recursive: true});
    const file = await fs.open(temporary, 'wx');
    const hash = createHash('sha256');
    let length = 0;
    try {
      for await (const chunk of response.body) {
        length += chunk.byteLength;
        if (length > asset.size) throw new Error('Invalid download size');
        hash.update(chunk);
        await file.writeFile(chunk);
      }
    } finally {
      await file.close();
    }
    const digest = 'sha256:' + hash.digest('hex');
    if (length !== asset.size || (asset.digest && digest !== asset.digest.toLowerCase())) {
      throw new Error('Download verification failed');
    }
    await fs.rename(temporary, target);
    download = target;
  } finally {
    downloading = false;
    await fs.rm(temporary, {force: true});
  }
}

function showAsset() {
  if (!download) throw new Error('No update downloaded');
  shell.showItemInFolder(download);
}

async function openRelease() {
  if (!release) throw new Error('No release available');
  await shell.openExternal(github + '/releases/tag/' + release.tag_name);
}

module.exports = {check, fetchAsset, showAsset, openRelease};
