# Ciftler Ligi (Admin Panelsiz)

Bu surumde sadece kullanici akis vardir:
- Ana sayfa
- Cift bilgi formu
- Cinsiyete gore anket
- Tamamlandi sayfasi

Admin panel ve `/api/admin/*` endpointleri kaldirildi.

## Canli URL
- https://ciftlerligi.vercel.app

## Teknoloji
- Frontend: static HTML/CSS/JS
- Backend: Node.js + Express
- Veritabani: Firebase Firestore
- Telegram: Bot API

## Logo
`img/sitelogosu.jpeg` dosyasi site logosu olarak alindi ve
`public/assets/site-logo.jpeg` uzerinden tum sayfalara baglandi.

## Firebase Kurulumu (Senin Yapacagin Kisim)

Asagidaki adimlari bir kez yapman yeterli:

1. Firebase Console -> Project olustur.
2. Firestore Database ac (Production veya Test mod).
3. Project Settings -> Service Accounts -> Generate new private key.
4. JSON icindeki alanlardan su env degerlerini cikar:
   - `project_id` -> `FIREBASE_PROJECT_ID`
   - `client_email` -> `FIREBASE_CLIENT_EMAIL`
   - `private_key` -> `FIREBASE_PRIVATE_KEY`

## Vercel Env Degerleri
Vercel projesinde (ciftlerligi) su degerleri gir:

- `SURVEY_JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`  (satir sonlari `\n` olacak sekilde)
- `FIREBASE_STORAGE_BUCKET` (opsiyonel)
- `TELEGRAM_BOT_TOKEN` (opsiyonel)
- `TELEGRAM_CHAT_ID` (opsiyonel)
- `APP_BASE_URL` (`https://ciftlerligi.vercel.app` gibi)
- `TELEGRAM_WEBHOOK_SECRET` (guclu bir gizli deger)
- `TELEGRAM_POLLING_ENABLED=false` (Vercel icin zorunluya yakin, webhook kullanilir)

## Lokal Calistirma
```bash
npm install
cp .env.example .env
npm run dev
```

## Proje Yapisi
```text
public/
  index.html
  form.html
  quiz.html
  success.html
  assets/
    site-logo.jpeg
src/
  app.js
  server.js
  routes/publicRoutes.js
  controllers/publicController.js
  services/
api/
  index.js
vercel.json
```

## Not
Firebase env degerleri girilmezse site acilir ama API `degraded` modda kalir.
`/api/health` uzerinden kontrol edebilirsin.
