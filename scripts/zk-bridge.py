#!/usr/bin/env python3
"""
Tiny CLI bridge between the Next.js sync actions and the ZKTeco MB10-VL.

We tried three Node.js libraries (zklib-js, node-zklib, zkteco-js) and all of
them failed to parse responses from this device's firmware ("Ver 6.60 Oct 12
2021"). Python's pyzk handles it correctly and also supports the comm-key
authentication that the device requires (password 123456 in our case).

This script is invoked via `child_process.spawnSync` from the Node.js
`syncDeviceUsers` / `syncDevicePunches` server actions. It prints a single
JSON document to stdout and exits 0 on success / 1 on failure.

Usage:
    python3 zk-bridge.py <command> [args...]

Commands:
    info               – returns device info (firmware, serial, counts)
    users              – returns the user roster
    attendance         – returns the attendance log

Configuration is read from environment variables:
    ZKTECO_IP        (default 192.168.1.202)
    ZKTECO_PORT      (default 4370)
    ZKTECO_PASSWORD  (default 0)
    ZKTECO_TIMEOUT   (seconds, default 15)
"""

import json
import os
import sys
import traceback

try:
    from zk import ZK
except ImportError:
    print(json.dumps({"ok": False, "error": "pyzk not installed"}))
    sys.exit(1)


def get_conn():
    ip = os.environ.get("ZKTECO_IP", "192.168.1.202")
    port = int(os.environ.get("ZKTECO_PORT", "4370"))
    password = int(os.environ.get("ZKTECO_PASSWORD", "0"))
    timeout = int(os.environ.get("ZKTECO_TIMEOUT", "15"))

    zk = ZK(
        ip,
        port=port,
        timeout=timeout,
        password=password,
        force_udp=False,
        ommit_ping=True,
    )
    return zk.connect()


def cmd_info():
    conn = get_conn()
    try:
        return {
            "ok": True,
            "firmware": conn.get_firmware_version(),
            "serial": conn.get_serialnumber(),
            "platform": conn.get_platform(),
            "deviceName": conn.get_device_name(),
            "userCount": len(conn.get_users()),
            "attendanceCount": len(conn.get_attendance()),
        }
    finally:
        conn.disconnect()


def cmd_users():
    conn = get_conn()
    try:
        users = conn.get_users()
        return {
            "ok": True,
            "users": [
                {
                    "uid": u.uid,
                    "userId": str(u.user_id),
                    "name": u.name or "",
                    "privilege": u.privilege,  # 0 = user, 14 = admin
                    "password": u.password or "",
                    "groupId": u.group_id,
                    "card": u.card,
                }
                for u in users
            ],
        }
    finally:
        conn.disconnect()


def cmd_attendance():
    conn = get_conn()
    try:
        records = conn.get_attendance()
        return {
            "ok": True,
            "records": [
                {
                    "uid": r.uid,
                    "userId": str(r.user_id),
                    # ISO 8601 in local time of the device — pyzk returns naive datetimes
                    "timestamp": r.timestamp.isoformat(),
                    "status": r.status,  # 0 = check-in, 1 = check-out, etc.
                    "punch": r.punch,    # raw punch type from the device
                }
                for r in records
            ],
        }
    finally:
        conn.disconnect()


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing command"}))
        sys.exit(1)

    cmd = sys.argv[1]
    handlers = {
        "info": cmd_info,
        "users": cmd_users,
        "attendance": cmd_attendance,
    }

    if cmd not in handlers:
        print(json.dumps({"ok": False, "error": f"unknown command: {cmd}"}))
        sys.exit(1)

    try:
        result = handlers[cmd]()
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"{type(e).__name__}: {e}",
                    "traceback": traceback.format_exc(),
                }
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
