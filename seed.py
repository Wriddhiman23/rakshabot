#!/usr/bin/env python3
"""
RakshaBot - Seed Script
Loads the initial operational demo data into Neon PostgreSQL (or SQLite fallback):
- Units: Garuda-01, Garuda-02, Netra-01, Netra-02, Ashwa-01, Varun-01
- Victims: VIC-101 (cardiac), VIC-102 (flood), VIC-103 (collapse), VIC-104 (snakebite)
- Hazards: Periyar Basin Inundation, Kalamassery Collapse, Vallarpadam Power Corridor
- Historical missions, mission logs, and comms messages
"""

import os
import sys

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import SessionLocal, init_db
from seed_data import seed_database

def main():
    print("=================================================================")
    print("🛡️  RAKSHABOT C2 - DATABASE SEED INITIALIZATION")
    print("=================================================================")
    force = "--reset" in sys.argv or "--force" in sys.argv
    init_db()
    with SessionLocal() as session:
        seed_database(session, force=force)
    print("=================================================================")

if __name__ == "__main__":
    main()
