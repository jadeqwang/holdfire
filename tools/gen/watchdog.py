#!/usr/bin/env python3
"""Relay watchdog: every 60 s, requeue our jobs whose cron minute passed without the relay picking them up
(their job: key is still in KV 2+ minutes after its bucket). Runs until killed.  python3 tools/gen/watchdog.py"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen

while True:
    try:
        now = int(time.time() // 60)
        for k in gen.kv_keys("job:"):
            _, b, jid = k.split(":", 2)
            if jid.startswith(gen.PREFIX) and int(b) < now - 1:
                try:
                    gen.requeue(jid)
                    print(time.strftime("%H:%M:%S"), "requeued", jid, flush=True)
                except SystemExit as e:
                    print(time.strftime("%H:%M:%S"), "skip", jid, e, flush=True)
    except Exception as e:
        print("watchdog error", e, flush=True)
    time.sleep(60)
