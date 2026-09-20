# Adding content

1. `behavior_packs/mc_superhero_universe_bp/data/registry.js` içine benzersiz ID ekleyin.
2. `hero.costumeIds` ve `hero.abilityIds` bağlantılarını kurun.
3. Ability için enerji maliyeti, cooldown ve handler tanımlayın.
4. RP tarafında aynı ID'ye karşılık gelen animation/particle/sound asset'lerini ekleyin.
5. `node tools/validate_registry.js` çalıştırın.
6. Oyunda registry komutları ve yetenek smoke testini yapın.

ID biçimi: `lower_snake_case`; namespace mantığı için runtime ID'ler `msu.` ile başlar.
