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

## Firestore kolleksiyalar (to'liq)
`factory_employees`, `factory_operations`, `factory_work_entries`,
`factory_absences`, `factory_users`, `factory_departments`,
`factory_pending`, `factory_shifts`, `factory_updates` (TV signal).

Work entry ID formati: `${date}_${deptId}_${startTime}_${endTime}_${empId}`.
Har bo'limда bitta "tayyor mahsulot" operatsiyasi bор (`isFinal: true`).

## Firestore xavfsizlik qoidalari (Rules)
- Loyiha **Spark (bepul) tarifda** — kunlik limit: 50,000 o'qish / 20,000 yozish.
- Qoidalar Firebase Console'да (kodda emas). "Test mode" qoidasi muddati
  bilan (`request.time < timestamp.date(...)`) BO'LMASLIGI kerak — bir marta
  muddat tugab butun ilova (login + saqlash) to'xtagan. Hozir muddatsiz,
  rol-asosli qoidalar: TV o'qiydigan kolleksiyalar (`factory_departments`,
  `factory_employees`, `factory_operations`, `factory_work_entries`,
  `factory_updates`) — `allow read: if true; write: if request.auth != null`.
  Qolganlari — `read, write: if request.auth != null`.

## OCHIQ MUAMMO: Firestore o'qishlari ko'p (bepul limitни oshiryapti)
Kuniga ~90K o'qish (limit 50K) — bepul tarifда davriy bloklanadi. Sabab:
Dashboard/Reports butun kolleksiyani o'qiydi; Attendance/Employees/Operations/
DepartmentWork butun kolleksiyani real-time (`onSnapshot`) tinglaydi.
- **Bajarildi:** TV displey real-time → `factory_updates` signal (30s'da 1 o'qish)
  — `claude/salom-ta7x4w` branchида, HALI main'ga merge qilinmagan.
- **Kerak:** Dashboard/Reports so'rovlarini toraytirish, real-time tinglashlarni
  kerak bo'lmaganда bir martalik o'qishga o'tkazish. YOKI Blaze tarifiga o'tish
  (hажmда oyiga ~1$ dan kam, limit yo'qoladi).

## REJALASHTIRILGAN: Buyurtma tizimi (hali qurilmagan)
Foydalanuvchi bilan to'liq kelishilgan reja (bosqichma-bosqich quriladi):
- `factory_orders`: nomi + miqdor, navbat (FIFO tartib), holat (avto), arxiv.
- Bo'limlar zanjiri (`factory_chain`): mustaqil (Kamzul, Shim — o'ziga kirim)
  yoki bog'langan (Tana→Astar/Yeng tarqalish; min(Tana,Astar)→Montaj; Montaj=Yeng).
- Smена kiritishda yuqorида buyurtma tanlanadi (Hech qaysi / FIFO avto / qo'lда),
  har xodim uchun alohida o'zgartirish mumkin.
- Progress = bo'lim oxirgi op miqdori buyurtmага teglanган; miqдорга yetganда
  avto "Bajarildi". FIFO: bir chiqim ikki buyurtмага bo'linishi mumkin.
- Buyurtma kartasi (zanjir bo'ylab holati), Dashboard'да kirim/chiqim/qoldiq +
  "tiqilish/qoldiq" ogohlantirishi, tugash prognozi.
- Zanjir sozlash sahifasi (admin), Telegram'га buyurtma hisoboti.
- "Hech qaysi" rejimi = orqaga to'liq mos (buyurtмasiz hozirgidek ishlaydi).

## Ish uslubi (foydalanuvchi bilan)
- Foydalanuvchi o'zbek tilida yozadi, javoblar ham o'zbekcha, qisqa va aniq.
- Har katta o'zgarishдан oldin "muammo tug'dirmaydimi?" deб so'raydi — xavflarni
  ochiq tushuntirish kerak. O'zgarishni ko'rsatib, tasdiqlangач main'ga merge.
- Ish branchi: `claude/salom-ta7x4w`. Tasdiqlangач `main`ga merge → Vercel deploy.
