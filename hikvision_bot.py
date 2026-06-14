import requests
import json
import time
import threading
from datetime import datetime, timezone, timedelta
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
POLL_INTERVAL    = 10  # soniya
# ============================================================

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# Har bir qurilma uchun oxirgi ko'rilgan event ID
last_event_ids = {}


def get_auth(device):
    return HTTPDigestAuth(device["user"], device["password"])


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
        print(f"[Telegram] Yuborildi: {name}")
    except Exception as e:
        print(f"[Telegram xato] {e}")


def fetch_events(device):
    """Qurilmadan so'nggi hodisalarni olish."""
    base_url = f"http://{device['ip']}:{device['port']}"
    auth     = get_auth(device)
    url      = f"{base_url}/ISAPI/AccessControl/AcsEvent?format=json"

    tz_uz = timezone(timedelta(hours=5))
    now = datetime.now(tz_uz)
    start_time = (now - timedelta(seconds=POLL_INTERVAL + 5)).strftime("%Y-%m-%dT%H:%M:%S+05:00")
    end_time   = now.strftime("%Y-%m-%dT%H:%M:%S+05:00")

    payload = {
        "AcsEventCond": {
            "searchID":             "1",
            "searchResultPosition": 0,
            "maxResults":           20,
            "startTime":            start_time,
            "endTime":              end_time,
        }
    }

    try:
        r = requests.post(url, json=payload, auth=auth, timeout=8)
        print(f"[{device['door_name']}] HTTP {r.status_code} | {r.text[:300]}")
        if r.status_code == 200:
            data = r.json()
            events = (data.get("AcsEvent", {})
                         .get("InfoList", []))
            return events
    except Exception as e:
        print(f"[{device['door_name']}] Xato: {e}")
    return []


def poll_device(device):
    key = device["ip"]
    last_event_ids[key] = set()
    print(f"[Polling] {device['door_name']} → {device['ip']}:{device['port']}")

    while True:
        events = fetch_events(device)
        for ev in events:
            event_no = ev.get("serialNo") or ev.get("SerialNo") or str(ev.get("time", ""))
            if event_no in last_event_ids[key]:
                continue
            last_event_ids[key].add(event_no)

            name = ev.get("name") or ev.get("Name") or "Noma'lum"
            raw_time = ev.get("time") or ev.get("Time") or ""
            try:
                dt = datetime.strptime(raw_time[:19], "%Y-%m-%dT%H:%M:%S")
                event_time = dt.strftime("%d %B %Y, %H:%M")
            except Exception:
                event_time = raw_time

            print(f"[{device['door_name']}] {name} — {event_time}")
            send_telegram_message(name, event_time, device["direction"], device["door_name"])

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    print("=" * 50)
    print("  Hikvision (2 eshik) → Telegram Bot")
    print("  Har 10 soniyada yangi hodisalar tekshiriladi")
    print("=" * 50)

    threads = []
    for dev in DEVICES:
        t = threading.Thread(target=poll_device, args=(dev,), daemon=True)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()
