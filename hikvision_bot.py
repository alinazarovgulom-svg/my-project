import requests
import json
import time
import threading
from datetime import datetime
from requests.auth import HTTPDigestAuth
import telebot

# ============================================================
#  SOZLAMALAR
# ============================================================
DEVICES = [
    {
        "ip":        "192.168.1.30",
        "port":      8000,
        "user":      "admin",
        "password":  "12345",
        "door_name": "Asosiy kirish",
        "direction": "in",
    },
    {
        "ip":        "192.168.1.55",
        "port":      8000,
        "user":      "admin",
        "password":  "12345",
        "door_name": "Asosiy chiqish",
        "direction": "out",
    },
]

TELEGRAM_TOKEN   = "YOUR_BOT_TOKEN"   # ← @BotFather dan token
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"     # ← Chat yoki guruh ID
# ============================================================

bot = telebot.TeleBot(TELEGRAM_TOKEN)


def send_telegram_message(name: str, event_time: str, direction: str,
                          door_name: str, photo: bytes | None):
    icon   = "✅" if direction == "in" else "🚪"
    action = "kirdi" if direction == "in" else "chiqdi"

    text = (
        f"Xodim {action} {icon}\n"
        f"👤 Ism: {name}\n"
        f"🕐 Vaqt: {event_time}\n"
        f"📍 Eshik: {door_name}"
    )
    try:
        if photo:
            bot.send_photo(TELEGRAM_CHAT_ID, photo, caption=text)
        else:
            bot.send_message(TELEGRAM_CHAT_ID, text)
    except Exception as e:
        print(f"[Telegram xato] {e}")


def get_capture_photo(base_url: str, auth, employee_id: str) -> bytes | None:
    try:
        url = f"{base_url}/ISAPI/Intelligent/FDLib/FDSearch?format=json"
        payload = {
            "searchResultPosition": 0,
            "maxResults": 1,
            "faceLibType": "blackFD",
            "FDID": employee_id,
        }
        r = requests.post(url, json=payload, auth=auth, timeout=5)
        if r.status_code == 200:
            pics = r.json().get("FDSearchResult", {}).get("MatchList", [])
            if pics:
                pic_url = pics[0].get("faceURL")
                if pic_url:
                    img = requests.get(f"{base_url}{pic_url}", auth=auth, timeout=5)
                    return img.content
    except Exception:
        pass
    return None


def parse_event(event_data: dict, device: dict, base_url: str, auth):
    try:
        if event_data.get("eventType") != "AccessControllerEvent":
            return

        info   = event_data.get("AccessControllerEvent", {})
        name   = info.get("name", "Noma'lum")
        emp_id = info.get("employeeNoString", "")

        raw_time = event_data.get("dateTime", "")
        try:
            dt = datetime.strptime(raw_time[:19], "%Y-%m-%dT%H:%M:%S")
            event_time = dt.strftime("%d %B %Y, %H:%M")
        except Exception:
            event_time = raw_time

        print(f"[{device['door_name']}] {name} — {event_time}")

        photo = get_capture_photo(base_url, auth, emp_id) if emp_id else None
        send_telegram_message(name, event_time, device["direction"],
                              device["door_name"], photo)
    except Exception as e:
        print(f"[Parse xato] {e}")


def listen_device(device: dict):
    base_url = f"http://{device['ip']}:{device['port']}"
    auth     = HTTPDigestAuth(device["user"], device["password"])
    url      = f"{base_url}/ISAPI/Event/notification/alertStream"

    while True:
        try:
            print(f"[Ulanyapti] {device['door_name']} → {base_url}")
            with requests.get(url, auth=auth, stream=True, timeout=30) as resp:
                if resp.status_code != 200:
                    print(f"[{device['door_name']}] HTTP {resp.status_code} — 10s kutilmoqda")
                    time.sleep(10)
                    continue

                print(f"[OK] {device['door_name']} ulandi!")
                buffer = ""
                for chunk in resp.iter_content(chunk_size=1024, decode_unicode=True):
                    if chunk:
                        buffer += chunk
                        while True:
                            start = buffer.find("{")
                            end   = buffer.find("\n--")
                            if start != -1 and end != -1 and end > start:
                                json_str = buffer[start:end]
                                buffer   = buffer[end:]
                                try:
                                    event = json.loads(json_str)
                                    threading.Thread(
                                        target=parse_event,
                                        args=(event, device, base_url, auth),
                                        daemon=True,
                                    ).start()
                                except json.JSONDecodeError:
                                    pass
                            else:
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
