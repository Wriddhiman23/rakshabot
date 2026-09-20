#!/usr/bin/env bash
# RakshaBot Full-Stack Startup Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================="
echo "🛡️  STARTING RAKSHABOT C2 DISASTER RESPONSE SYSTEM (SIH 2024)"
echo "================================================================="

# Check backend venv
if [ ! -d "backend/venv" ]; then
  echo "Setting up Python virtual environment..."
  python3 -m venv backend/venv
  ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# Seed database
echo "Checking database..."
./backend/venv/bin/python backend/seed_data.py

# Trap to kill background jobs on exit
cleanup() {
  echo ""
  echo "Shutting down RakshaBot servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo "Launching FastAPI WebSocket Backend on http://127.0.0.1:8000..."
cd "$SCRIPT_DIR/backend"
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to come up
sleep 2

# Start frontend
echo "Launching Vite React Frontend on http://localhost:5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "================================================================="
echo "✅ RakshaBot C2 is LIVE and ready for jury demonstration!"
echo "   Dashboard:    http://localhost:5173"
echo "   Backend API:  http://127.0.0.1:8000"
echo "   API Docs:     http://127.0.0.1:8000/docs"
echo "   Run Demo:     python3 run_demo.py (or click 'Run Demo Scenario' in UI)"
echo "================================================================="
echo "Press Ctrl+C to stop all servers."

wait
