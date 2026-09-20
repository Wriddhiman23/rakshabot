#!/usr/bin/env python3
"""
RakshaBot - Backend Seed Script
Loads the initial operational demo data into Neon PostgreSQL (or SQLite fallback).
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
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
