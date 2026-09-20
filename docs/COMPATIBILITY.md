# Compatibility and testing

Hedef: Minecraft Bedrock 1.21.x ve `@minecraft/server` 1.15.0.

Pack manifest'lerinde `min_engine_version` `[1, 21, 0]` olarak sabitlenmiştir. Preview-only API kullanılmamalıdır.

## Manual smoke test

- İki pack'in etkinleştiğini ve içerik hatası üretmediğini doğrulayın.
- `!hero list`, `!hero select skyforge`, `!costume list`, `!costume equip skyforge.overcharge` çalıştırın.
- Blaze rod ile slot 0/1 yeteneklerini kullanın.
- Enerji azaldığında yeteneğin reddedildiğini, zamanla yenilendiğini gözlemleyin.
- Oyuncudan çıkıp tekrar girerek hero/costume/energy state'ini doğrulayın.
- Bir hedefe başarılı vuruş yapıldığında progression seviyesinin arttığını doğrulayın.

Bu repository ortamında Minecraft istemcisi çalıştırılamadığı için oyun içi smoke test sonucu iddia edilmemektedir.
