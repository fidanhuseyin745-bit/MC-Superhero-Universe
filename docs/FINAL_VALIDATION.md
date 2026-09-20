# Final validation status

## Commands

Run from repository root:

```bash
node tools/validate_registry.js
node tools/validate_assets.js
node tools/validate_bedrock_assets.js
```

The repository tools are static validators. They check registry references, manifest metadata, JSON syntax, entity/controller/render-controller/geometry top-level shapes, and the external asset manifest.

## Verified repository policy

- `asset_manifest.json` currently contains zero external binary assets.
- No unverified model, texture, animation, PNG, WAV, or OGG is distributed.
- Existing geometry and animation files are repository-authored JSON scaffolding.
- Runtime sounds are vanilla command sound identifiers and are not bundled audio files.

## Environment limitation

Minecraft Bedrock and Mojang Creator Tools are not available in this execution environment. Therefore no in-game pack-load, render, texture, audio, animation, multiplayer, or ability smoke test is claimed.
