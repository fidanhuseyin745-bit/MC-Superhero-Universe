# Developing from Termux

The whole point of this repository is that you do not need a computer.

## One-time setup

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
```

No `zip`, no ImageMagick, no build tools. `tools/lib/zip.mjs` writes ZIP
archives in pure JavaScript, and `tools/gen-art.mjs` writes PNGs with Node's
built-in `zlib`.

## Clone

```bash
git clone https://github.com/<owner>/MC-Superhero-Universe.git ~/msu
cd ~/msu
npm run check
```

`npm run check` needs no install step. The only thing written outside the repo
tree is `node_modules/`, created by the test runner to hold the fake Minecraft
packages; it is gitignored and safe to delete.

## Editing

`vim`, `nano` and `micro` are all fine. The files you will touch most:

- `behavior_pack/scripts/heroes/<name>/index.js` - a hero
- `behavior_pack/scripts/abilities/library.js` - the shared ability library
- `resource_pack/texts/en_US.lang` - player-facing strings

After editing the lang file:

```bash
node tools/gen-strings.mjs
```

## The loop

```bash
npm run check          # validate + test + build
```

Then move `dist/*.mcaddon` to shared storage and open it with Minecraft:

```bash
termux-setup-storage
cp dist/*.mcaddon /sdcard/Download/
```

No root, no adb, no file manager gymnastics.

## Getting the addon into Minecraft

1. Open the `.mcaddon` from a file manager (or the Download app).
2. Minecraft imports both packs.
3. Create or open a world, then enable **MC Superhero Universe** under both
   Behavior Packs and Resource Packs.
4. Leave **all experiments off** - this addon intentionally targets the stable
   script API.

If the world reports that scripts are unavailable, the world was created on an
older Bedrock version. Update Minecraft to 1.21.90 or newer.

## Working over GitHub

The intended workflow is to let an AI agent make changes on a branch, then merge
via pull request. A short review checklist for a phone screen:

- [ ] `npm run check` is green in the PR
- [ ] the diff touches `heroes/` or `abilities/`, not `core/`
- [ ] if `en_US.lang` changed, `strings.js` was regenerated
- [ ] no new dependency was added

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Cannot use import statement outside a module` | `behavior_pack/scripts/package.json` is missing. It marks the script tree as ESM for Node; restore it. |
| `Cannot find package '@minecraft/server'` | Run `npm test` (it generates the stubs), or `node tools/test/gen-stubs.mjs`. |
| Validation fails on a missing string | Edit `en_US.lang`, then run `node tools/gen-strings.mjs`. |
| A hero does not appear in game | Run `npm test`; the loader logs which hero was skipped and why. |
| Rebuild does not change anything | Delete `dist/` and run `npm run build`. |