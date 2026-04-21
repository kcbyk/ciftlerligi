# Ciftler Ligi

Bu proje artik su akisla calisir:

1. Ana sayfada kullanici kendi ismini ve takim ismini girer.
2. Kiz veya erkek tarafi secilir.
3. Secilen tarafa ait 30 soru acilir.
4. Admin panelde `Baslat -> Takimlar -> Kisiler -> Cevaplar` akisi ile sonuclar gorulur.
5. Admin panelden kisi kaydi silinebilir.

## Teknoloji

- Frontend: HTML + CSS + vanilla JS
- Backend: Node.js + Express
- Veri: Firebase Firestore veya otomatik yerel JSON yedegi

## Yerel Calistirma

```bash
npm install
npm start
```

Sunucu varsayilan olarak `http://127.0.0.1:3000` adresinde acilir.

## Veri Deposu

- Firebase bilgileri varsa Firestore kullanilir.
- Firebase yoksa uygulama otomatik olarak `data/local-db.json` dosyasina gecer.
- Bu davranisi `.env` icinde `USE_LOCAL_DATASTORE=true` ile zorlayabilirsin.

## Iki Ayri Site Modu

Ayni kod tabani 3 modda calisabilir:

- `SITE_VARIANT=full`: her sey tek sitede
- `SITE_VARIANT=public`: sadece kullanici akisi
- `SITE_VARIANT=admin`: ana sayfa direkt admin paneline yonlenir

Vercel'de iki ayri proje yayinlamak icin onerilen kurulum:

- Public proje: `SITE_VARIANT=public`
- Admin proje: `SITE_VARIANT=admin`

## Admin Panel

- Varsayilan gizli rota: `/super-admin-paneli-8472`
- Varsayilan sifre: `dogi2345`

Gercek kullanimda bu iki degeri `.env` icinden degistirmen onerilir:

- `ADMIN_PANEL_ROUTE`
- `ADMIN_PANEL_PASSWORD`

## Ornek Ortam Degiskenleri

`.env.example` dosyasi Firebase, Telegram ve yerel veri deposu seceneklerini icerir.

## Dogrulanan Akis

Bu repo icinde su kontroller yapildi:

- `GET /api/health` ile sunucu ayakta ve `datastoreMode=local`
- Ana sayfa ve admin route HTML olarak donuyor
- Public oturum olusturma calisiyor
- Secilen tarafa ait 30 soru geliyor
- Anket gonderimi kaydediliyor
- Admin API takimlari, kisileri ve cevaplari listeliyor
- Admin API kisi silme islemini basariyla tamamliyor
