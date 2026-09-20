# Bedrock compatibility status

The packs target Minecraft Bedrock 1.21.x with `@minecraft/server` 1.15.0. All 61 registry heroes share a bounded, data-driven runtime and the same low-cost Bedrock geometry/controller scaffold; no unverified binary assets are bundled.

The registry contains 61 heroes, three registry costumes per hero, and three registry abilities per hero. Costume entries without verified binary art remain explicitly `registry-only` with null model/texture references. This is not counted as completed costume artwork.

Runtime safeguards include a 12-entity area-target cap, one particle burst per activation, no per-target lightning entity spawning, and energy sampling every 40 ticks. These are static design properties; mobile-device performance still requires profiling in a real Bedrock world.

Validation commands:

```bash
node tools/validate_registry.js
node tools/validate_assets.js
node tools/validate_bedrock_assets.js
```

**OYUN İÇİ TEST YAPILMADI.**
