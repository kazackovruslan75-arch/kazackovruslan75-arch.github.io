"""Удалённое управление ПК с телефона: экран, мышь, клавиатура.

Запуск: python server.py  ->  открыть на телефоне http://<IP-ПК>:8000
"""
import asyncio
import io
import json
import os
import socket
import sys
import threading

if sys.platform == "win32":
    # Иначе при масштабировании Windows (125%, 150%) клики уезжают
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        ctypes.windll.user32.SetProcessDPIAware()

import mss
from aiohttp import web, WSMsgType
from PIL import Image, ImageDraw
from pynput.keyboard import Controller as KeyboardController, Key
from pynput.mouse import Button, Controller as MouseController

PORT = int(os.environ.get("PORT", 8000))
HERE = os.path.dirname(os.path.abspath(__file__))

mouse = MouseController()
keyboard = KeyboardController()
_local = threading.local()

BUTTONS = {"left": Button.left, "right": Button.right, "middle": Button.middle}
KEYS = {
    "enter": Key.enter, "esc": Key.esc, "tab": Key.tab, "backspace": Key.backspace,
    "delete": Key.delete, "space": Key.space, "up": Key.up, "down": Key.down,
    "left": Key.left, "right": Key.right, "home": Key.home, "end": Key.end,
    "pageup": Key.page_up, "pagedown": Key.page_down, "ctrl": Key.ctrl,
    "alt": Key.alt, "shift": Key.shift, "win": Key.cmd, "capslock": Key.caps_lock,
    "printscreen": getattr(Key, "print_screen", Key.esc),
    "volup": getattr(Key, "media_volume_up", None),
    "voldown": getattr(Key, "media_volume_down", None),
    "mute": getattr(Key, "media_volume_mute", None),
    "playpause": getattr(Key, "media_play_pause", None),
    **{f"f{i}": getattr(Key, f"f{i}") for i in range(1, 13)},
}

CURSOR = [(0, 0), (0, 17), (4, 13), (7, 20), (10, 19), (7, 12), (12, 12)]


def sct():
    if not hasattr(_local, "sct"):
        _local.sct = getattr(mss, "MSS", mss.mss)()
    return _local.sct


def monitors():
    return sct().monitors[1:] or sct().monitors


def resolve_key(name):
    if name in KEYS and KEYS[name] is not None:
        return KEYS[name]
    if len(name) == 1:
        return name
    raise ValueError(f"unknown key {name}")


def grab(mon_idx, max_w, quality):
    mons = monitors()
    mon = mons[min(mon_idx, len(mons) - 1)]
    shot = sct().grab(mon)
    img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
    # Рисуем курсор — скриншот его не содержит
    mx, my = mouse.position
    cx, cy = mx - mon["left"], my - mon["top"]
    if 0 <= cx < mon["width"] and 0 <= cy < mon["height"]:
        k = max(1, mon["width"] // 1600 + 1)
        pts = [(cx + x * k, cy + y * k) for x, y in CURSOR]
        ImageDraw.Draw(img).polygon(pts, fill="white", outline="black")
    if img.width > max_w:
        img = img.resize((max_w, int(img.height * max_w / img.width)), Image.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return buf.getvalue()


def handle(msg, state):
    t = msg["t"]
    mons = monitors()
    mon = mons[min(state["mon"], len(mons) - 1)]
    if t == "move":
        mouse.position = (
            mon["left"] + round(msg["x"] * (mon["width"] - 1)),
            mon["top"] + round(msg["y"] * (mon["height"] - 1)),
        )
    elif t == "rel":
        mouse.move(round(msg["dx"]), round(msg["dy"]))
    elif t == "down":
        mouse.press(BUTTONS[msg.get("b", "left")])
    elif t == "up":
        mouse.release(BUTTONS[msg.get("b", "left")])
    elif t == "click":
        mouse.click(BUTTONS[msg.get("b", "left")], msg.get("n", 1))
    elif t == "scroll":
        mouse.scroll(msg.get("dx", 0), msg.get("dy", 0))
    elif t == "text":
        keyboard.type(msg["s"])
    elif t == "key":
        k = resolve_key(msg["k"])
        keyboard.press(k)
        keyboard.release(k)
    elif t == "combo":
        keys = [resolve_key(k) for k in msg["k"]]
        for k in keys:
            keyboard.press(k)
        for k in reversed(keys):
            keyboard.release(k)
    elif t == "keydown":
        keyboard.press(resolve_key(msg["k"]))
    elif t == "keyup":
        keyboard.release(resolve_key(msg["k"]))


async def index(_):
    return web.FileResponse(os.path.join(HERE, "index.html"))


async def ws_handler(request):
    ws = web.WebSocketResponse(max_msg_size=1 << 20)
    await ws.prepare(request)
    loop = asyncio.get_running_loop()
    state = {"mon": 0, "w": 1280, "q": 60}
    mons = await loop.run_in_executor(None, monitors)
    await ws.send_str(json.dumps({"t": "info", "mons": [[m["width"], m["height"]] for m in mons]}))
    print(f"[+] подключился {request.remote}")
    async for m in ws:
        if m.type != WSMsgType.TEXT:
            continue
        try:
            msg = json.loads(m.data)
            if msg["t"] == "next":
                frame = await loop.run_in_executor(None, grab, state["mon"], state["w"], state["q"])
                await ws.send_bytes(frame)
            elif msg["t"] == "cfg":
                state["mon"] = int(msg.get("mon", state["mon"]))
                state["w"] = max(320, min(3840, int(msg.get("w", state["w"]))))
                state["q"] = max(10, min(95, int(msg.get("q", state["q"]))))
            else:
                await loop.run_in_executor(None, handle, msg, state)
        except Exception as e:
            print("ошибка:", e)
    print(f"[-] отключился {request.remote}")
    return ws


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main():
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_get("/ws", ws_handler)
    ip = lan_ip()
    print("=" * 50)
    print(f"  На ПК:       http://localhost:{PORT}")
    print(f"  С телефона:  http://{ip}:{PORT}")
    print("  (телефон должен быть в той же Wi-Fi сети)")
    print("=" * 50)
    web.run_app(app, host="0.0.0.0", port=PORT, print=None)


if __name__ == "__main__":
    main()
