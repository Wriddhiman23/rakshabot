# 🛡️ RakshaBot: Command & Control Disaster Response System
### Smart India Hackathon 2024 — Problem Statement: Autonomous Drone & Ground-Robot Emergency Coordination

**RakshaBot** is an emergency command-and-control (C2) web dashboard designed for rapid coordinated deployment of autonomous drones and ground robots (UGVs) during disaster events and medical golden-hour emergencies in India (e.g., cardiac arrest, floods, building collapses, trauma, and snakebites).

Built with **React + Vite + Tailwind CSS + Leaflet** on the frontend, and **FastAPI + WebSockets + SQLite** on the backend, RakshaBot streams live 1Hz telemetry, simulated FLIR AI thermal camera feeds, and automated multi-unit rescue missions.

---

## 🚀 Live Demo Quickstart

### One-Click Launch
To start both the FastAPI backend and Vite frontend with a single command:
```bash
./start.sh
```
- **Live Command Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Automated SIH Demo Script**: `python3 run_demo.py`

---

## 🛠️ Tech Stack & Architecture

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 18 + Vite | Modular UI with instant HMR and optimized builds |
| **Styling** | Tailwind CSS | Tactical dark emergency-ops theme (`#0a0d14`), high-contrast alert indicators |
| **Mapping** | Leaflet + CartoDB Dark Matter | Full-screen tactical GIS with live aircraft icons, flight paths, hazard circles |
| **Charts** | Recharts | Interactive response time curves, incident breakdown, and AI accuracy metrics |
| **Audio** | Web Audio API | Realistic tactical radio squelch, push-to-talk tones, siren alerts, payload pings |
| **Backend** | FastAPI + Python 3.12 | High-throughput asynchronous REST API and WebSocket hub |
| **Telemetry** | Asyncio Telemetry Engine | Simulates live drone physics (heading, altitude, battery drain, GPS waypoint transit) |
| **Database** | SQLite + SQLAlchemy | Lightweight database pre-seeded with realistic NDRF assets and mission logs |

---

## 📋 Features Overview (PRD Compliance)

### 1. Role-Based Login & Persona Simulator
- **Dispatcher (`Priya Sharma`)**: Handles 112 emergency calls, intakes incidents, auto-calculates nearest units, and scrambles drones.
- **Rescue Lead (`Capt. Vikram Rathore`)**: Tactical flight overrides (`HOLD`, `RTH`, `RECALL`, `DROP_PAYLOAD`), two-way push-to-talk intercom, victim triage.
- **Admin / Director (`Dr. Arvind Swaminathan`)**: Runs automated SIH demo scenarios, resets telemetry states, and exports compliance CSV logs.
- *Switch persona instantly via top-right dropdown or dedicated Role Portal.*

### 2. Live Command Dashboard
- **Interactive Tactical Map**: Live markers for hexacopters (`Garuda-01`, `Garuda-02`), reconnaissance drones (`Netra-01`), amphibious rovers (`Varun-01`), victims, and hazard flood zones.
- **Fleet Side Panel**: Real-time battery levels, GPS coordinates, signal strength (dBm), current payload, and mission status progression (`ASSIGNED` → `EN_ROUTE` → `ON_SITE` → `PAYLOAD_DELIVERED` → `RETURNING` → `COMPLETED`).
- **Live Video Feed HUD**: Picture-in-Picture (PiP) synthetic camera tile with vision filters (FLIR Thermal, Tactical NVG, RGB 4K) and AI bounding boxes (*"Person detected, 92% confidence"*).
- **Emergency Alert Banner**: Instant notifications with 1-click drone dispatch.

### 3. Emergency Alert Intake
- Modal form to record incident type (*Cardiac, Trauma, Flood, Collapse, Snakebite*), severity, affected victim count, and landmark.
- **Auto-Suggestion Algorithm**: Computes real-time Euclidean distance and unit suitability score (battery %, current status, unit speed, payload match) to suggest the best responder.

### 4. Mission Dispatch & Overrides
- One-click dispatch with specialized payload assignments:
  - **AED Defibrillator** for cardiac arrest
  - **Trauma Kit & Clotting Hemostatics** for crush/wound injuries
  - **Polyvalent Antivenom & Epinephrine** for snakebites
  - **Inflatable Lifebuoys & Survival Rations** for flood stranded victims
  - **Heavy Rations (50kg)** for ground rover transport
- In-flight manual override commands: **Loiter/Hold**, **Return-to-Home (RTH)**, **Recall Base**, and **Force Drop Payload**.

### 5. Victim Tracker
- Comprehensive triage dashboard with priority ranking (CRITICAL / HIGH / MEDIUM / LOW), GPS coordinates, detected vitals summary, and status updating (*Detected*, *Drone En Route*, *First Aid Dropped*, *Evacuated*).

### 6. Mission Logs & Analytics
- Visualized analytics using Recharts:
  - Average response time vs. Golden Hour target (sub-3 minutes)
  - Incident distribution by category
  - Total emergency payloads delivered
  - AI thermal detection accuracy score (93%+)
- **CSV Export**: Instant download of complete incident audit logs.

### 7. Two-Way Audio Intercom
- Push-to-talk button with radio squelch synthesizer and acoustic audio feedback simulation.
- Channel selector across active drones and loudspeakers.
- Pre-set tactical emergency broadcasts for crowd control and patient instructions.

### 8. Automated Demo Scenario
- Single-click **"Run Demo Scenario"** button in navbar or terminal (`python3 run_demo.py`).
- Automatically simulates a flood stranding and a cardiac emergency in Kochi Periyar sector:
  1. Intake alert triggers siren
  2. Garuda-01 scrambles from HQ Base
  3. Live flight path updates on map
  4. AI camera locks onto victim
  5. Defibrillator payload drops
  6. Drone initiates automated Return-to-Home (RTH)
  7. Mission log and response times are permanently recorded

---

## 🔧 Manual Setup (Optional)

### Backend
```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python seed_data.py
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing & Verification
- Check REST API endpoints:
  ```bash
  curl http://127.0.0.1:8000/api/units
  curl http://127.0.0.1:8000/api/analytics
  ```
- Trigger live demo from terminal:
  ```bash
  python3 run_demo.py
  ```
- Build production bundle:
  ```bash
  cd frontend && npm run build
  ```
