import os
import logging
from dotenv import load_dotenv
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)
from pdf_generator import generate_pdf

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID"))

# Conversation steps
(
    FULL_NAME, BIRTH_DATE, BIRTH_PLACE,
    FAMILY_STATUS, ADDRESS,
    EDUCATION, WORK_EXPERIENCE,
    PHOTO
) = range(8)

FAMILY_OPTIONS = [["Turmushga chiqmagan / Uylanmagan"], ["Turmush o'rtoqli"], ["Ajrashgan"], ["Beva/Bevа"]]


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text(
        "Salom! 👋\n\nBu anketa ish uchun ma'lumotnoma to'ldirish botidir.\n"
        "Savolga javob bering, oxirida PDF tayyorlanib yuboriladi.\n\n"
        "Boshlaylik!\n\n"
        "1️⃣ Ism, Familiya, Otasining ismini kiriting:\n"
        "(Masalan: Karimov Jasur Aliyevich)",
        reply_markup=ReplyKeyboardRemove()
    )
    return FULL_NAME


async def get_full_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["full_name"] = update.message.text.strip()
    await update.message.reply_text("2️⃣ Tug'ilgan sanangizni kiriting:\n(Masalan: 15.03.1995)")
    return BIRTH_DATE


async def get_birth_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["birth_date"] = update.message.text.strip()
    await update.message.reply_text("3️⃣ Tug'ilgan joyingizni kiriting:\n(Viloyat, tuman, qishloq/shahar)")
    return BIRTH_PLACE


async def get_birth_place(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["birth_place"] = update.message.text.strip()
    await update.message.reply_text(
        "4️⃣ Oilaviy holatingizni tanlang:",
        reply_markup=ReplyKeyboardMarkup(FAMILY_OPTIONS, one_time_keyboard=True, resize_keyboard=True)
    )
    return FAMILY_STATUS


async def get_family_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["family_status"] = update.message.text.strip()
    await update.message.reply_text(
        "5️⃣ Hozirgi turar manzilingizni kiriting:\n(Viloyat, tuman, ko'cha, uy raqami)",
        reply_markup=ReplyKeyboardRemove()
    )
    return ADDRESS


async def get_address(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["address"] = update.message.text.strip()
    await update.message.reply_text(
        "6️⃣ Ta'lim ma'lumotlaringizni kiriting:\n\n"
        "Quyidagi tartibda yozing:\n"
        "• Maktab: (nomi, tugatgan yili)\n"
        "• Oliy/O'rta maxsus: (nomi, mutaxassislik, tugatgan yili)\n\n"
        "Masalan:\n"
        "Maktab: 15-maktab, 2012\n"
        "Oliy: ToshDTU, Iqtisodiyot, 2016"
    )
    return EDUCATION


async def get_education(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["education"] = update.message.text.strip()
    await update.message.reply_text(
        "7️⃣ Ish tajribangizni kiriting:\n\n"
        "Har bir ish joyini quyidagicha yozing:\n"
        "• Tashkilot nomi\n"
        "• Lavozim\n"
        "• Qaysi yildan qaysi yilgacha\n\n"
        "Masalan:\n"
        "ABC Kompaniya — Buxgalter — 2016-2019\n"
        "XYZ Korxona — Katta mutaxassis — 2019-hozir\n\n"
        "Agar tajriba bo'lmasa: «Tajriba yo'q» deb yozing."
    )
    return WORK_EXPERIENCE


async def get_work_experience(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["work_experience"] = update.message.text.strip()
    await update.message.reply_text(
        "📷 Rasmingizni yuboring (ixtiyoriy).\n\n"
        "Rasm yubormasangiz — /skip bosing yoki «O'tkazib yuborish» deb yozing.",
        reply_markup=ReplyKeyboardMarkup([["O'tkazib yuborish"]], one_time_keyboard=True, resize_keyboard=True)
    )
    return PHOTO


async def get_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.photo:
        photo = update.message.photo[-1]
        file = await photo.get_file()
        photo_path = f"/tmp/photo_{update.effective_user.id}.jpg"
        await file.download_to_drive(photo_path)
        context.user_data["photo_path"] = photo_path
    else:
        context.user_data["photo_path"] = None

    await update.message.reply_text("⏳ Ma'lumotlar qayta ishlanmoqda, PDF tayyorlanmoqda...", reply_markup=ReplyKeyboardRemove())
    await finish(update, context)
    return ConversationHandler.END


async def skip_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["photo_path"] = None
    await update.message.reply_text("⏳ Ma'lumotlar qayta ishlanmoqda, PDF tayyorlanmoqda...", reply_markup=ReplyKeyboardRemove())
    await finish(update, context)
    return ConversationHandler.END


async def finish(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    data = context.user_data

    pdf_path = generate_pdf(data, user)

    # Send PDF to applicant
    await update.message.reply_text("✅ Anketa muvaffaqiyatli to'ldirildi! PDF hujjatingiz:")
    with open(pdf_path, "rb") as f:
        await update.message.reply_document(document=f, filename="anketa.pdf")

    # Send PDF to admin
    caption = (
        f"📋 Yangi anketa!\n"
        f"👤 {data.get('full_name', '—')}\n"
        f"📅 {data.get('birth_date', '—')}\n"
        f"📍 {data.get('address', '—')}\n"
        f"🆔 Telegram: @{user.username or user.first_name} (ID: {user.id})"
    )
    with open(pdf_path, "rb") as f:
        await context.bot.send_document(
            chat_id=ADMIN_CHAT_ID,
            document=f,
            filename=f"anketa_{data.get('full_name', 'nomsiz')}.pdf",
            caption=caption
        )

    os.remove(pdf_path)
    if data.get("photo_path") and os.path.exists(data["photo_path"]):
        os.remove(data["photo_path"])


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Anketa bekor qilindi. Qayta boshlash uchun /start bosing.",
        reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END


def main():
    app = Application.builder().token(BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            FULL_NAME:       [MessageHandler(filters.TEXT & ~filters.COMMAND, get_full_name)],
            BIRTH_DATE:      [MessageHandler(filters.TEXT & ~filters.COMMAND, get_birth_date)],
            BIRTH_PLACE:     [MessageHandler(filters.TEXT & ~filters.COMMAND, get_birth_place)],
            FAMILY_STATUS:   [MessageHandler(filters.TEXT & ~filters.COMMAND, get_family_status)],
            ADDRESS:         [MessageHandler(filters.TEXT & ~filters.COMMAND, get_address)],
            EDUCATION:       [MessageHandler(filters.TEXT & ~filters.COMMAND, get_education)],
            WORK_EXPERIENCE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_work_experience)],
            PHOTO: [
                MessageHandler(filters.PHOTO, get_photo),
                MessageHandler(filters.TEXT & ~filters.COMMAND, skip_photo),
                CommandHandler("skip", skip_photo),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(conv_handler)
    logger.info("Bot ishga tushdi...")
    app.run_polling()


if __name__ == "__main__":
    main()
