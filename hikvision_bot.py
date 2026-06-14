import requests
import json
import time
import threading
from datetime import datetime
from requests.auth import HTTPDigestAuth
import telebot

# ============================================================
#  SOZLAMALAR — faqat shu joyni o'zgartiring
# ============================================================
HIKVISION_IP       = "192.168.1.64"   # Qurilma IP manzili
HIKVISION_USER     = "admin"           # Login
HIKVISION_PASS     = "12345"           # Parol
HIKVISION_PORT     = 80                # Port (odatda 80)

TELEGRAM_TOKEN     = "YOUR_BOT_TOKEN"  # Telegram bot token
TELEGRAM_CHAT_ID   = "YOUR_CHAT_ID"    # Chat yoki guruh ID

DOOR_NAME          = "Asosiy kirish"   # Eshik nomi
# ============================================================

bot = telebot.TeleBot(TELEGRAM_TOKEN)

BASE_URL = f"http://{HIKVISION_IP}:{HIKVISION_PORT}"
AUTH     = HTTPDigestAuth(HIKVISION_USER, HIKVISION_PASS)


def get_capture_photo(employee_id: str) -> bytes | None:
    """Xodim rasmini qurilmadan olish."""
    try:
        url = f"{BASE_URL}/ISAPI/Intelligent/FDLib/FDSearch?format=json"
        payload = {
            "searchResultPosition": 0,
            "maxResults": 1,
            "faceLibType": "blackFD",
            "FDID": employee_id,
        }
        r = requests.post(url, json=payload, auth=AUTH, timeout=5)
        if r.status_code == 200:
            data = r.json()
            pics = data.get("FDSearchResult", {}).get("MatchList", [])
            if pics:
                pic_url = pics[0].get("faceURL")
                if pic_url:
                    img = requests.get(f"{BASE_URL}{pic_url}", auth=AUTH, timeout=5)
                    return img.content
    except Exception:
        pass
    return None


def send_telegram_message(name: str, event_time: str, direction: str, photo: bytes | None):
    """Telegramga xabar yuborish."""
    icon  = "✅" if direction == "in" else "🚪"
    action = "kirdi" if direction == "in" else "chiqdi"

    text = (
        f"Xodim {action} {icon}\n"
        f"👤 Ism: {name}\n"
        f"🕐 Vaqt: {event_time}\n"
        f"📍 Eshik: {DOOR_NAME}"
    )

    try:
        if photo:
            bot.send_photo(TELEGRAM_CHAT_ID, photo, caption=text)
        else:
            bot.send_message(TELEGRAM_CHAT_ID, text)
    except Exception as e:
        print(f"[Telegram xato] {e}")


def parse_event(event_data: dict):
    """Hikvision eventini tahlil qilish."""
    try:
        event_type = event_data.get("eventType", "")
        # Faqat kirish/chiqish hodisalari
        if event_type not in ("AccessControllerEvent",):
            return

        info      = event_data.get("AccessControllerEvent", {})
        name      = info.get("name", "Noma'lum")
        emp_id    = info.get("employeeNoString", "")
        direction = "in" if info.get("currentVerifyMode", "") != "exit" else "out"

        raw_time  = event_data.get("dateTime", "")
        try:
            dt = datetime.strptime(raw_time[:19], "%Y-%m-%dT%H:%M:%S")
            event_time = dt.strftime("%d %B %Y, %H:%M")
        except Exception:
            event_time = raw_time

        print(f"[Hodisa] {name} — {direction} — {event_time}")

        photo = get_capture_photo(emp_id) if emp_id else None
        send_telegram_message(name, event_time, direction, photo)

    except Exception as e:
        print(f"[Parse xato] {e}")


def listen_events():
    """Qurilmadan real-vaqt eventlarini tinglash (ISAPI streaming)."""
    url = f"{BASE_URL}/ISAPI/Event/notification/alertStream"
    print(f"[Ulanyapti] {url}")

    while True:
        try:
            with requests.get(url, auth=AUTH, stream=True, timeout=30) as resp:
                if resp.status_code != 200:
                    print(f"[Xato] HTTP {resp.status_code} — 10 soniyadan keyin qayta ulanadi")
                    time.sleep(10)
                    continue

                print("[OK] Qurilmaga ulandi. Hodisalar kuzatilmoqda...")
                buffer = ""

                for chunk in resp.iter_content(chunk_size=1024, decode_unicode=True):
                    if chunk:
                        buffer += chunk
                        # JSON blokni ajratib olish
                        while True:
                            start = buffer.find("{")
                            end   = buffer.find("\n--")
                            if start != -1 and end != -1 and end > start:
                                json_str = buffer[start:end]
                                buffer   = buffer[end:]
                                try:
                                    event = json.loads(json_str)
                                    threading.Thread(
                                        target=parse_event, args=(event,), daemon=True
                                    ).start()
                                except json.JSONDecodeError:
                                    pass
                            else:
                                break

        except requests.exceptions.ConnectionError:
            print("[Uzildi] Tarmoq xatosi — 10 soniyadan keyin qayta ulanadi")
            time.sleep(10)
        except Exception as e:
            print(f"[Xato] {e} — 10 soniyadan keyin qayta ulanadi")
            time.sleep(10)


if __name__ == "__main__":
    print("=" * 50)
    print("  Hikvision → Telegram Bot")
    print("=" * 50)
    listen_events()
