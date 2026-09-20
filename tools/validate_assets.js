const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'resource_packs', 'mc_superhero_universe_rp', 'asset_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schema_version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Invalid asset manifest schema');

const allowed = new Set(['CC0-1.0', 'Public-Domain', 'CC-BY-4.0', 'CC-BY-3.0', 'Original']);
for (const asset of manifest.assets) {
  for (const key of ['id', 'source_url', 'author', 'license', 'redistributable', 'checksum']) {
    if (!(key in asset)) throw new Error(`Asset ${asset.id || '<unknown>'} is missing ${key}`);
  }
  if (!allowed.has(asset.license)) throw new Error(`Asset ${asset.id} has an unapproved license: ${asset.license}`);
  if (asset.redistributable !== true) throw new Error(`Asset ${asset.id} is not marked redistributable`);
  if (!/^https?:\/\//.test(asset.source_url)) throw new Error(`Asset ${asset.id} has an invalid source URL`);
}

console.log(`Asset manifest validation passed: ${manifest.assets.length} approved binary assets.`);
