#!/usr/bin/env python3
"""
RakshaBot - Live Demo Runner Script (Smart India Hackathon 2024)
Executes an automated end-to-end multi-unit emergency rescue scenario:
1. Triggers Flood Rescue & Cardiac Arrest alerts
2. Dispatches Garuda-01 & Garuda-02 drones
3. Monitors live flight telemetry and AI detection overlays
4. Drops critical payloads (AED & Inflatable Lifebuoys)
5. Returns drones to home base
"""

import urllib.request
import json
import time
import sys

API_BASE = "http://127.0.0.1:8000/api"

def trigger_demo():
    print("==================================================================")
    print("🚨 RAKSHABOT C2: SMART INDIA HACKATHON LIVE DEMO ORCHESTRATOR 🚨")
    print("==================================================================")
    print("\n[1/3] Connecting to RakshaBot Backend API...")
    try:
        req = urllib.request.Request(f"{API_BASE}/demo/run", method="POST")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"✅ Demo scenario initiated successfully: {data.get('message')}")
    except Exception as e:
        print(f"❌ Error triggering demo: {e}")
        print("Ensure the backend is running at http://127.0.0.1:8000")
        sys.exit(1)

    print("\n[2/3] Streaming live mission progress (Watch dashboard at http://localhost:5173)...")
    for i in range(12):
        try:
            with urllib.request.urlopen(f"{API_BASE}/demo/status") as resp:
                status = json.loads(resp.read().decode())
                step = status.get('demo_step') or 'Executing flight path...'
                active = status.get('demo_active', False)
                print(f"  ⏱️ [{i*2:02d}s] Active: {active} | Stage: {step}")
                if not active and i > 2:
                    print("  ✨ Demo sequence completed successfully!")
                    break
        except Exception as e:
            print(f"  ⚠️ Status check error: {e}")
        time.sleep(2)

    print("\n[3/3] Fetching updated emergency response analytics...")
    try:
        with urllib.request.urlopen(f"{API_BASE}/analytics") as resp:
            analytics = json.loads(resp.read().decode())
            print(f"  📊 Total Missions: {analytics.get('total_missions')}")
            print(f"  ⏱️ Avg Response Time: {analytics.get('average_response_seconds')} seconds")
            print(f"  📦 Payloads Delivered: {analytics.get('payloads_delivered')}")
            print(f"  🎯 AI Detection Accuracy: {analytics.get('ai_detection_accuracy_pct')}%")
    except Exception as e:
        print(f"⚠️ Could not fetch analytics: {e}")

    print("\n==================================================================")
    print("🎉 Demo complete! Open http://localhost:5173 to review results.")
    print("==================================================================")

if __name__ == "__main__":
    trigger_demo()
