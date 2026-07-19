# Soatbay analitika

Bu repozitoriyaning asosiy loyihasi — **Soatbay analitika** (papka: `ishlab-chiqarish/`).
Ilgari "KAFTIMDA" / "Ishlab chiqarish tizimi" deb ham atalgan — hammasi shu bitta loyiha.

## Loyiha nima qiladi
Kichik fabrika uchun ishlab chiqarishni boshqarish tizimi:
- Smena bo'yicha ish kiritish (xodim × operatsiya × miqdor)
- Davomat (kim kelgan / kelmagan)
- Bo'limlar, operatsiyalar, xodimlar boshqaruvi
- Hisobotlar (PDF / Excel / Telegram), oylik hisobot
- Zanjir tahlili (Pipeline), TV displey, Dashboard grafiklari

## Texnologiyalar
- React + Vite (PWA)
- Firebase Firestore + Authentication
- Tailwind CSS
- Vercel (hosting + `/api/*` server funksiyalari)
- Firestore kolleksiyalar: `factory_employees`, `factory_operations`,
  `factory_work_entries`, `factory_absences`, `factory_users`,
  `factory_departments`, `factory_pending`

## MUHIM QOIDALAR (doim amal qilinsin)
1. **Telegram bot token hech qachon kodda bo'lmaydi.** Faqat Vercel
   environment variable'da (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
2. Vercel'da bir nechta loyiha bor. Faqat shu loyiha (`ishlab-chiqarish`)
   ustida ishlash mumkin. Boshqa loyihalarga buyruqsiz o'zgartirish kiritilmaydi.
3. Har o'zgarishdan keyin `main` ga merge qilinsa Vercel avtomatik deploy qiladi.

## Repozitoriyadagi boshqa narsalar
- `finance-app/` — moliya/valyuta loyihasi (alohida)
- `tizim2026.html`, `index.html` — alohida bir-fayllik sahifalar
