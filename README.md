# Cift Uyum Yarismasi / Anket Sitesi

Mobil uyumlu, romantik temali, odullu cift yarismasi platformu.

## Teknoloji
- Frontend: index.html + vanilla JS + CSS
- Backend: Node.js + Express
- Database: Firebase Firestore
- Admin auth: Backend session + .env sifresi
- Telegram: Telegram Bot API (node-telegram-bot-api)

## Ozellikler
- Kurallar ve marka alanlari admin panelden guncellenebilir
- Kullanici formu ve cinsiyete gore soru akisi
- Sorular frontend'e gomulu degil, backend'den gelir
- Erkek/Kadin soru havuzu tamamen ayridir (male / female)
- Cevaplar Firestore'a guvenli sekilde kaydedilir
- Anket sonrasi Telegram'a otomatik bildirim
- Telegram botta ciftler -> kisiler -> cevap detaylari akisi
- Gizli admin route + sifreli giris + admin action loglari
- Logo ve arka plan yukleme

## Proje Yapisi

```text
.
|- public/
|  |- assets/
|  |  |- logo-placeholder.svg
|  |  |- bg-placeholder.svg
|  |- css/
|  |  |- style.css
|  |  |- admin.css
|  |- js/
|  |  |- shared.js
|  |  |- index.js
|  |  |- form.js
|  |  |- quiz.js
|  |  |- success.js
|  |  |- admin-login.js
|  |  |- admin-dashboard.js
|  |- uploads/
|  |- index.html
|  |- form.html
|  |- quiz.html
|  |- success.html
|  |- robots.txt
|  |- sitemap.xml
|- src/
|  |- config/
|  |- constants/
|  |- controllers/
|  |- middlewares/
|  |- routes/
|  |- services/
|  |- utils/
|  |- server.js
|- views/
|  |- admin-login.html
|  |- admin-dashboard.html
|- .env.example
|- package.json
|- README.md
```

## Sayfa Akisi
- / : Acilis + kurallar + sosyal medya ikonlari
- /form : Cift bilgi formu
- /anket : Cinsiyete gore soru akisi
- /tamamlandi : Basari sayfasi

## Gizli Admin
- Route .env icindeki ADMIN_ROUTE_PATH ile belirlenir
- Ornek: ADMIN_ROUTE_PATH=super-admin-paneli-8472
- Giris URL: /<ADMIN_ROUTE_PATH>
- Dashboard URL: /<ADMIN_ROUTE_PATH>/dashboard
- Admin API tamamiyla backend session korumalidir

## API Endpointleri

### Public
- GET /api/public/settings
- POST /api/public/session
- GET /api/public/questions (Bearer surveyToken)
- POST /api/public/submissions (Bearer surveyToken)

### Admin
- POST /api/admin/login
- POST /api/admin/logout
- GET /api/admin/session
- GET /api/admin/dashboard
- PUT /api/admin/settings
- GET /api/admin/questions?genderType=male|female
- POST /api/admin/questions
- PUT /api/admin/questions/:questionId
- DELETE /api/admin/questions/:questionId
- PATCH /api/admin/questions/reorder
- GET /api/admin/submissions
- GET /api/admin/submissions/:submissionId
- GET /api/admin/logs
- GET /api/admin/telegram-settings
- PUT /api/admin/telegram-settings
- POST /api/admin/telegram-test
- POST /api/admin/assets/logo (multipart logo)
- POST /api/admin/assets/background (multipart background)

### System
- GET /api/health

## Firestore Modeli

### settings (doc id: main)
- heroTitle
- heroDescription
- rules[]
- completionMessage
- infoText
- instagramUrl
- youtubeUrl
- logoUrl
- backgroundImageUrl
- watermarkEnabled
- logoSize

### questions
- genderType (male / female)
- questionText
- questionType (single_choice, multi_choice, open_text, rating)
- options[]
- isActive
- orderIndex
- approved

### submissions
- pairName
- personOneName
- personTwoName
- respondentName
- genderType
- answersJson[]
- createdAt
- ipAddress
- deviceInfo

### admin_logs
- actionType
- actionDetail
- createdAt
- adminIp
- userAgent

### private_settings (doc id: telegram)
- botToken
- chatId
- updatedAt

## Kurulum
1. Paketleri yukle:
   ```bash
   npm install
   ```
2. Ortam dosyasi olustur:
   ```bash
   cp .env.example .env
   ```
3. .env icini doldur:
   - Firebase credential
   - ADMIN_ROUTE_PATH
   - ADMIN_PASSWORD
   - Session/JWT secret alanlari
4. Calistir:
   ```bash
   npm run dev
   ```
5. Tarayicida ac:
   - http://localhost:3000
   - Gizli admin: http://localhost:3000/<ADMIN_ROUTE_PATH>

## Deploy Notlari
- NODE_ENV=production kullanin
- Reverse proxy arkasinda x-forwarded-for aktif edin
- Uretimde Redis tabanli session store tercih edin
- HTTPS zorunlu kullanin
- Vercel deployu icin `api/index.js` + `vercel.json` hazirdir
- Vercel'de Telegram long polling kullanacaksaniz `TELEGRAM_POLLING_ENABLED=false` birakin (onerilen)

## Placeholder Alanlar
Asagidaki alanlar bilerek placeholder birakilmistir:
- Site basligi / alt baslik / kurallar
- Erkek ve kadin sorulari
- Basari mesaji
- Admin route ve sifre
- Logo ve arka plan gorseli
- Telegram bot token / chat id

Bu alanlarin tamami admin panelinden veya .env dosyasindan guncellenebilir.
