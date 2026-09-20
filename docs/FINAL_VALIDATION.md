# Final validation

Static validation requirements:

```bash
node tools/validate_registry.js
node tools/validate_assets.js
node tools/validate_bedrock_assets.js
```

Expected policy state: 0 approved external binary assets. No unverified PNG, WAV, OGG, model, animation, or texture is distributed.

The current repository has one shared original geometry file, registry-only costume records, shared animation scaffolding, one animation controller, one render controller, and one particle file. These are separate from registry counts.

**OYUN İÇİ TEST YAPILMADI.** Minecraft Bedrock and Creator Tools are not available in the automation environment.
