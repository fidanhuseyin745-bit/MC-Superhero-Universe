# Bedrock implementation status

## Implemented

- Behavior Pack and Resource Pack manifests targeting Bedrock 1.21.x.
- Data-driven hero, costume, and ability registry.
- Persistent hero/costume/energy/progression state.
- Ability cooldown and energy validation.
- Runtime combat effects using stable vanilla commands and Script API calls.
- Original JSON geometry/animation/controller foundation.
- License manifest and validation policy.

## Deliberately not bundled

No downloaded superhero model, texture, sound, or animation is included without an exact asset-level license verification. “Free”, “open”, or search-result labels are not enough to establish redistribution rights. This prevents accidental inclusion of Marvel/DC likenesses, fan rips, or assets with unclear terms.

## Required local validation

```text
node tools/validate_registry.js
node tools/validate_assets.js
```

A Minecraft Bedrock client/world is required for runtime smoke testing. This repository environment cannot launch Bedrock, so runtime behavior must be verified in a development world.
