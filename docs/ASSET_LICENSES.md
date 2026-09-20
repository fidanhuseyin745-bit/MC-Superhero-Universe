# Asset licensing and provenance policy

This repository includes only original JSON definitions and code unless an asset is explicitly listed in `resource_packs/mc_superhero_universe_rp/asset_manifest.json`.

## Allowed

- Original assets created for MC Superhero Universe.
- Public-domain or CC0 assets with a source page and license record.
- CC-BY assets only when attribution and redistribution terms are recorded and satisfied.

## Not allowed

- Marvel, DC, film, game, comic, or fan-rip models, textures, sounds, logos, or animations.
- Assets marked non-commercial, personal-use-only, or with unclear redistribution rights.
- Marketplace or platform assets whose license does not explicitly allow redistribution in an addon.
- A site-wide license assumption for user-uploaded content.

## Review requirements

Every imported binary asset must have a manifest entry containing the exact source URL, author, license, checksum, modification status, and attribution text where applicable. An asset is not considered approved merely because a search result calls it “free”.

The current repository does not bundle third-party binary character assets. The hero visuals currently use original Bedrock JSON scaffolding and vanilla-safe runtime effects. This is intentional: it avoids falsely claiming rights for unverified superhero assets.
