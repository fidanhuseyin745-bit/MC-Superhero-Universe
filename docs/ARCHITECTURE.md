# Architecture

## Runtime flow

`main.js` event'leri `core/player_state.js` üzerinden normalize eder. `hero_registry.js` kahraman, kostüm ve yetenek kayıtlarını sunar. `ability_runtime.js` enerji, cooldown ve gereksinimleri doğrular; ardından `combat_service.js` ve `effects_service.js` çalışır. İlerleme `progression_service.js` üzerinden olay bazlı güncellenir.

## Design rules

- Kahraman, kostüm ve yetenek kimlikleri bağımsızdır.
- Runtime kayıtları tek bir registry üzerinden çözülür; yeni içerik core koduna dağılmaz.
- BP oyun mantığını, RP görsel/işitsel varlıkları taşır.
- Persistent oyuncu state'i dynamic properties ile tutulur.
- İlk sürüm yalnızca kararlı Bedrock Script API yüzeylerini kullanacak şekilde sınırlıdır.

## Extension point

Yeni hero eklemek için `data/registry.js` içinde bir hero kaydı, costume kayıtları ve ability kayıtları eklenir. Yeni RP asset'leri aynı ID'lerle `animations`, `particles`, `sounds` ve ileride `attachables` altına eklenebilir.
