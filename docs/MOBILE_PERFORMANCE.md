# Mobile optimization and content status

- Runtime target cap: 12 entities per area ability.
- Energy persistence sampling: every 40 ticks (approximately two seconds), not every tick.
- Abilities use bounded area queries and do not spawn per-target lightning entities.
- Particle calls are limited to one burst per ability activation.
- No third-party binary models, textures, sounds, PNG, WAV, or OGG files are bundled.

Current registry state is data-only for costume visuals: registry entries may exist while `modelAsset` and `textureAsset` remain null. This is intentional and must not be reported as completed costume art.

Minecraft Bedrock runtime and mobile device profiling were not run in this environment.
