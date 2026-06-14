import requests
import json
import time
import threading
from datetime import datetime
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import telebot

# ============================================================
#  SOZLAMALAR
# ============================================================
DEVICES = [
    {
        "ip":        "192.168.1.30",
        "port":      80,
        "user":      "admin",
        "password":  "qwerty@12",
        "door_name": "Asosiy kirish",
        "direction": "in",
    },
    {
        "ip":        "192.168.1.55",
        "port":      80,
        "user":      "admin",
        "password":  "qwerty@12",
        "door_name": "Asosiy chiqish",
        "direction": "out",
    },
]

TELEGRAM_TOKEN   = "8861647970:AAEJlWA1BQvcdwe0_MrRZ0bhD03EGwnTzO8"
TELEGRAM_CHAT_ID = "1884849724"
# ============================================================

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# Ilk ulanishda kelgan eski hodisalarni o'tkazib yuborish
first_connect = {}


def send_telegram_message(name, event_time, direction, door_name):
    icon   = "✅" if direction == "in" else "🚪"
    action = "kirdi" if direction == "in" else "chiqdi"
    text = (
        f"Xodim {action} {icon}\n"
        f"👤 Ism: {name}\n"
        f"🕐 Vaqt: {event_time}\n"
        f"📍 Eshik: {door_name}"
    )
    try:
        bot.send_message(TELEGRAM_CHAT_ID, text)
        print(f"[Telegram ✓] {name} → {door_name}")
    except Exception as e:
        print(f"[Telegram xato] {e}")


def parse_event(event_data, device, is_first_batch):
    try:
        event_type = event_data.get("eventType", "NOETYPE")
        print(f"[EVENT] {device['door_name']} | type={event_type} | first={is_first_batch} | {str(event_data)[:200]}")

        if event_type != "AccessControllerEvent":
            return

        info     = event_data.get("AccessControllerEvent", {})
        name     = info.get("name", "Noma'lum")
        raw_time = event_data.get("dateTime", "")

        try:
            dt = datetime.strptime(raw_time[:19], "%Y-%m-%dT%H:%M:%S")
            event_time = dt.strftime("%d %B %Y, %H:%M")
        except Exception:
            event_time = raw_time

        print(f"[{device['door_name']}] {name} — {event_time} {'(eski)' if is_first_batch else '>>> YUBORILDI'}")

        if not is_first_batch:
            send_telegram_message(name, event_time, device["direction"], device["door_name"])

    except Exception as e:
        print(f"[Parse xato] {e}")


def listen_device(device):
    key      = device["ip"]
    base_url = f"http://{device['ip']}:{device['port']}"
    url      = f"{base_url}/ISAPI/Event/notification/alertStream"

    while True:
        auth = HTTPDigestAuth(device["user"], device["password"])
        first_connect[key] = True  # Birinchi ulanish — eski eventlarni o'tkazib yubor
        try:
            print(f"[Ulanyapti] {device['door_name']} → {base_url}")
            with requests.get(url, auth=auth, stream=True, timeout=60) as resp:
                if resp.status_code == 401:
                    auth = HTTPBasicAuth(device["user"], device["password"])
                    print(f"[{device['door_name']}] Basic auth sinayapti...")
                    time.sleep(2)
                    continue
                if resp.status_code != 200:
                    print(f"[{device['door_name']}] HTTP {resp.status_code} — 10s kutilmoqda")
                    time.sleep(10)
                    continue

                print(f"[OK] {device['door_name']} ulandi! Hodisalar kuzatilmoqda...")
                buffer = ""
                event_count = 0

                for chunk in resp.iter_content(chunk_size=1024, decode_unicode=False):
                    if chunk:
                        if isinstance(chunk, bytes):
                            chunk = chunk.decode("utf-8", errors="ignore")
                        buffer += chunk

                        while True:
                            start = buffer.find("{")
                            end   = buffer.find("\n--")
                            if start != -1 and end != -1 and end > start:
                                json_str = buffer[start:end]
                                buffer   = buffer[end:]
                                try:
                                    event = json.loads(json_str)
                                    is_first = first_connect.get(key, True)
                                    threading.Thread(
                                        target=parse_event,
                                        args=(event, device, is_first),
                                        daemon=True,
                                    ).start()
                                    event_count += 1
                                    # Birinchi to'plamdan keyin real vaqt rejimiga o'tish
                                    if event_count >= 5:
                                        first_connect[key] = False
                                except json.JSONDecodeError:
                                    pass
                            else:
                                # Agar uzoq vaqt event kelmasa, real vaqt rejimiga o'tish
                                if first_connect.get(key, True):
                                    first_connect[key] = False
                                break

        except requests.exceptions.ConnectionError:
            print(f"[{device['door_name']}] Uzildi — 10s kutilmoqda")
            time.sleep(10)
        except Exception as e:
            print(f"[{device['door_name']}] Xato: {e} — 10s kutilmoqda")
            time.sleep(10)


if __name__ == "__main__":
    print("=" * 50)
    print("  Hikvision (2 eshik) → Telegram Bot")
    print("=" * 50)

    threads = []
    for dev in DEVICES:
        t = threading.Thread(target=listen_device, args=(dev,), daemon=True)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()
