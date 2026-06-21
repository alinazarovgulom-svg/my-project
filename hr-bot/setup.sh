#!/bin/bash

echo "=== HR Bot o'rnatilmoqda ==="

# Create fonts directory and download DejaVu fonts
mkdir -p fonts
echo "Shriftlar yuklanmoqda..."

if [ ! -f fonts/DejaVuSans.ttf ]; then
    curl -L "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.tar.bz2" \
        -o /tmp/dejavu.tar.bz2
    tar -xjf /tmp/dejavu.tar.bz2 -C /tmp
    cp /tmp/dejavu-fonts-ttf-2.37/ttf/DejaVuSans.ttf fonts/
    cp /tmp/dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf fonts/
    echo "Shriftlar tayyor."
fi

# Install Python dependencies
echo "Kutubxonalar o'rnatilmoqda..."
pip install -r requirements.txt

echo ""
echo "=== O'rnatish tugadi ==="
echo ""
echo "Endi .env faylni to'ldiring:"
echo "  BOT_TOKEN=sizning_token"
echo "  ADMIN_CHAT_ID=sizning_chat_id"
echo ""
echo "Botni ishga tushirish: python bot.py"
