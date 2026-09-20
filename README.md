# MC Superhero Universe

Minecraft Bedrock Edition için özgün, ölçeklenebilir ve modüler süper kahraman addon altyapısı.

## Özellikler

- BP/RP ayrımı korunur
- Kahraman, kostüm, yetenek, enerji, combat, progression, animation ve particle altyapısı ayrı modüllerdedir
- Her kahraman için çoklu kostüm desteği
- Yeni kahraman ekleme için merkezi registry yapısı
- Özgün kahraman ve kostüm tasarımları için uyumlu Bedrock data modeli

## Dahil edilen örnek kahramanlar

- Iron Guard
- Web Slinger
- Green Giant
- Storm Caller
- Flash Runner
- Sky Warden
- Night Warden
- Shield Bearer
- Nova Sentinel

## Kurulum

1. `behavior_packs/mc_superhero_universe_bp` klasörünü `development_behavior_packs` içine taşıyın.
2. `resource_packs/mc_superhero_universe_rp` klasörünü `development_resource_packs` içine taşıyın.
3. Bedrock'ta add-on'ı etkinleştirin.
4. `!hero list` komutuyla kahramanlara erişin.
5. `!costume list` ve `!hero select <id>` ile runtime seçimi yapın.
6. `minecraft:blaze_rod` kullanarak yetenekleri tetikleyin.

## Notlar

- Bu depo, gerçek Bedrock dünyasında çalıştırılabilecek temel davranış ve veri yapısını sağlar.
- Binary texture/model dosyaları doğrudan GitHub dosya API'si ile üretilemeyeceği için, burada JSON tabanlı geometry/animation/render controller ve veri tanımları kullanılmıştır.
- Gerçek üretim görselleri için süper kahraman özel texture/3D model setleri dışarıdan eklenebilir veya yerel 3D araçlarıyla üretilebilir.
