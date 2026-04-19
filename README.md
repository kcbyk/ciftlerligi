# Ciftler Ligi (Gizli Admin Panelli)

Bu surumde kullanici akisina ek olarak gizli admin panel bulunur:
- Ana sayfa
- Cift bilgi formu
- Cinsiyete gore anket
- Tamamlandi sayfasi
- Gizli admin giris sayfasi (ozel route)
- Admin dashboard (soru/kurallar yonetimi)

## Canli URL
- https://ciftlerligi.vercel.app

## Teknoloji
- Frontend: static HTML/CSS/JS
- Backend: Node.js + Express
- Veritabani: Firebase Firestore
- Telegram: Bot API
- Admin auth: Backend sifre + JWT cookie

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
- `ADMIN_PANEL_ROUTE` (ornek: `/super-admin-paneli-8472`)
- `ADMIN_PANEL_PASSWORD`
- `ADMIN_JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`  (satir sonlari `\n` olacak sekilde)
- `FIREBASE_STORAGE_BUCKET` (opsiyonel)
- `TELEGRAM_BOT_TOKEN` (opsiyonel)
- `TELEGRAM_CHAT_ID` (opsiyonel)
- `APP_BASE_URL` (`https://ciftlerligi.vercel.app` gibi)
- `TELEGRAM_WEBHOOK_SECRET` (guclu bir gizli deger)
- `TELEGRAM_POLLING_ENABLED=false` (Vercel icin zorunluya yakin, webhook kullanilir)

## Gizli Admin Panel

- Admin login sayfasi: `https://alanadiniz.com{ADMIN_PANEL_ROUTE}`
- Dashboard: `https://alanadiniz.com{ADMIN_PANEL_ROUTE}/dashboard`
- Tanimli endpointler:
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `GET /api/admin/me`
  - `GET/PATCH /api/admin/settings`
  - `GET/POST/PATCH/DELETE /api/admin/questions`
- Tum admin mutasyonlari `admin_logs` koleksiyonuna kaydedilir.

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
  js/
    admin-login.js
    admin-dashboard.js
  assets/
    site-logo.jpeg
src/
  app.js
  server.js
  routes/publicRoutes.js
  routes/adminRoutes.js
  controllers/adminController.js
  controllers/publicController.js
  services/
views/
  admin-login.html
  admin-dashboard.html
api/
  index.js
vercel.json
```

## Not
Firebase env degerleri girilmezse site acilir ama API `degraded` modda kalir.
`/api/health` uzerinden kontrol edebilirsin.
