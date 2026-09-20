# MC Superhero Universe

Minecraft Bedrock Edition için özgün, veri odaklı ve ölçeklenebilir süper kahraman addon altyapısı.

## İçerik

- `behavior_packs/mc_superhero_universe_bp`: oyun mantığı, script ve veri kayıtları
- `resource_packs/mc_superhero_universe_rp`: metinler, animasyon/particle/ses altyapısı
- `docs/`: mimari, uyumluluk ve içerik ekleme rehberi

## Hızlı başlangıç

1. `behavior_packs/mc_superhero_universe_bp` ve `resource_packs/mc_superhero_universe_rp` klasörlerini Bedrock dünyasının `development_behavior_packs` ve `development_resource_packs` klasörlerine kopyalayın.
2. Dünyada iki development pack'i etkinleştirin.
3. `!hero list`, `!hero select skyforge` ve `!costume list` komutlarını kullanın.
4. Yetenek kullanmak için elinizde `blaze_rod` varken sağ tıklayın. Hotbar slotu 0 birinci yeteneği, slot 1 ikinci yeteneği seçer.

Bu ilk temel sürümde görsel kostüm modelleri yerine güvenli runtime tag/state altyapısı bulunur. Gerçek model, texture ve attachable dosyaları sonraki içerik iterasyonlarında eklenebilir.
