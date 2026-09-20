# Final validation

Run from the repository root:

```bash
node tools/validate_registry.js
node tools/validate_assets.js
node tools/validate_bedrock_assets.js
```

Expected registry totals after this expansion:

```text
Heroes: 61
Costumes: 183
Abilities: 183
```

The repository has no approved external binary assets and no bundled PNG, WAV, or OGG files. Costume registry records with `registry-only` status are not binary assets.

**OYUN İÇİ TEST YAPILMADI.** Bedrock and Creator Tools are not available in this execution environment.
