import React, { useRef, useEffect, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { playSound } from '../utils/audio';
import { 
  Camera, 
  Maximize2, 
  Layers, 
  Sliders, 
  Radio, 
  Eye, 
  Video, 
  Crosshair, 
  Zap, 
  Activity,
  Volume2
} from 'lucide-react';

export default function CameraFeedTile({ activeUnitId, onSelectUnit }) {
  const { units } = useWebSocket();
  const canvasRef = useRef(null);

  // Selected camera feed unit
  const [selectedFeedId, setSelectedFeedId] = useState(activeUnitId || (units[0]?.id ?? 1));
  const [visionMode, setVisionMode] = useState('flir'); // 'flir' | 'rgb' | 'nvg'
  const [aiOverlayActive, setAiOverlayActive] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(247);
  const [snapshotEffect, setSnapshotEffect] = useState(false);

  // Sync if activeUnitId changed externally
  useEffect(() => {
    if (activeUnitId) setSelectedFeedId(activeUnitId);
  }, [activeUnitId]);

  const currentUnit = units.find(u => u.id === selectedFeedId) || units[0] || {
    callsign: 'Garuda-01',
    altitude: 55.0,
    speed: 22.0,
    heading_deg: 45.0,
    latitude: 9.9925,
    longitude: 76.3075,
    unit_type: 'drone'
  };

  // Recording counter
  useEffect(() => {
    const timer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas animation loop for synthetic camera feed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let frame = 0;

    const render = () => {
      frame++;
      const width = canvas.width;
      const height = canvas.height;

      // Background palette based on visionMode
      if (visionMode === 'flir') {
        // FLIR White-Hot / Ironbow dark gradient
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
      } else if (visionMode === 'nvg') {
        // Night Vision Green
        ctx.fillStyle = '#022c22';
      } else {
        // Natural RGB terrain tone
        ctx.fillStyle = '#0b1329';
      }
      ctx.fillRect(0, 0, width, height);

      // Draw synthetic moving ground grid to simulate drone movement
      ctx.strokeStyle = visionMode === 'nvg' ? 'rgba(34, 197, 94, 0.15)' : visionMode === 'flir' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;

      const speedFactor = (currentUnit.speed || 15) * 0.4;
      const offsetY = (frame * speedFactor) % 40;
      const offsetX = (frame * 0.2) % 40;

      // Perspective grid lines
      ctx.beginPath();
      for (let y = offsetY; y < height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let x = offsetX; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Draw subtle terrain/water wave features
      ctx.beginPath();
      ctx.strokeStyle = visionMode === 'flir' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const py = height * 0.35 + i * 50 + Math.sin(frame * 0.03 + i) * 15;
        ctx.moveTo(0, py);
        ctx.bezierCurveTo(width * 0.3, py - 20, width * 0.7, py + 20, width, py);
      }
      ctx.stroke();

      // Draw Simulated Target (Person on ground / roof)
      const targetX = width * 0.52 + Math.sin(frame * 0.02) * 8;
      const targetY = height * 0.48 + Math.cos(frame * 0.02) * 5;

      // Target heat blob / human silhouette
      const heatGrad = ctx.createRadialGradient(targetX, targetY, 4, targetX, targetY, 26);
      if (visionMode === 'flir') {
        heatGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); // Core white-hot
        heatGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)'); // Orange body
        heatGrad.addColorStop(0.7, 'rgba(225, 29, 72, 0.5)'); // Red perimeter
        heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (visionMode === 'nvg') {
        heatGrad.addColorStop(0, 'rgba(187, 247, 208, 0.9)');
        heatGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.5)');
        heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        heatGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        heatGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.ellipse(targetX, targetY, 18, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // AI Bounding Box & HUD Detection Overlays
      if (aiOverlayActive) {
        const boxW = 85;
        const boxH = 95;
        const bx = targetX - boxW / 2;
        const by = targetY - boxH / 2;
        const bracketLen = 14;

        // Tactical Green / Red corner brackets
        const boxColor = visionMode === 'flir' ? '#ef4444' : '#22c55e';
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2.5;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bracketLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + bracketLen, by);
        // Top-right
        ctx.moveTo(bx + boxW - bracketLen, by);
        ctx.lineTo(bx + boxW, by);
        ctx.lineTo(bx + boxW, by + bracketLen);
        // Bottom-left
        ctx.moveTo(bx, by + boxH - bracketLen);
        ctx.lineTo(bx, by + boxH);
        ctx.lineTo(bx + bracketLen, by + boxH);
        // Bottom-right
        ctx.moveTo(bx + boxW - bracketLen, by + boxH);
        ctx.lineTo(bx + boxW, by + boxH);
        ctx.lineTo(bx + boxW, by + boxH - bracketLen);
        ctx.stroke();

        // AI Detection Label banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(bx - 2, by - 26, 175, 22);
        ctx.strokeStyle = boxColor;
        ctx.strokeRect(bx - 2, by - 26, 175, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText('● PERSON DETECTED: 94.8%', bx + 4, by - 11);

        // Under-box telemetry tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(bx - 2, by + boxH + 4, 140, 32);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText('DIST: 38.2m | ELEV: 18m', bx + 4, by + boxH + 16);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('HEAT: 37.1°C | PULSE: 78 BPM', bx + 4, by + boxH + 28);
      }

      // HUD Center Crosshair
      const cx = width / 2;
      const cy = height / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      // Reticle circle
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      // Cross lines
      ctx.moveTo(cx - 50, cy);
      ctx.lineTo(cx - 38, cy);
      ctx.moveTo(cx + 38, cy);
      ctx.lineTo(cx + 50, cy);
      ctx.moveTo(cx, cy - 50);
      ctx.lineTo(cx, cy - 38);
      ctx.moveTo(cx, cy + 38);
      ctx.lineTo(cx, cy + 50);
      ctx.stroke();

      // Pitch Ladder Marks
      ctx.beginPath();
      ctx.moveTo(cx - 25, cy - 30);
      ctx.lineTo(cx + 25, cy - 30);
      ctx.moveTo(cx - 25, cy + 30);
      ctx.lineTo(cx + 25, cy + 30);
      ctx.stroke();

      // CRT Scanline Overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [visionMode, aiOverlayActive, currentUnit]);

  const handleSnapshot = () => {
    playSound('click');
    setSnapshotEffect(true);
    setTimeout(() => setSnapshotEffect(false), 200);
  };

  return (
    <div className="rounded-xl bg-ops-panel border border-ops-border overflow-hidden shadow-2xl flex flex-col">
      {/* Tile Header Bar */}
      <div className="p-2.5 bg-slate-900 border-b border-ops-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-mono font-bold text-xs uppercase text-slate-200 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            LIVE OPTICAL RECON HUD
          </span>
          <span className="font-mono text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/40">
            REC {formatTime(recordingSeconds)}
          </span>
        </div>

        {/* Camera Feed Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          {units.slice(0, 3).map(u => (
            <button
              key={u.id}
              onClick={() => {
                playSound('click');
                setSelectedFeedId(u.id);
                if (onSelectUnit) onSelectUnit(u.id);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                selectedFeedId === u.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {u.callsign}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Camera Video View */}
      <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-cover"
        />

        {/* Flash Snapshot Effect */}
        {snapshotEffect && (
          <div className="absolute inset-0 bg-white/90 z-20 pointer-events-none transition-opacity" />
        )}

        {/* Top HUD Overlay Inside Video */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between font-mono text-[10px] text-slate-200 pointer-events-none drop-shadow-md">
          <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 flex items-center gap-2">
            <span className="text-cyan-400 font-bold">{currentUnit.callsign}</span>
            <span>|</span>
            <span>GPS: 16 SAT RTK</span>
            <span>|</span>
            <span>BAT: {Math.round(currentUnit.battery || 90)}%</span>
          </div>

          <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 flex items-center gap-2">
            <span className="text-amber-400">ALT: {Math.round(currentUnit.altitude || 0)}m</span>
            <span>|</span>
            <span className="text-emerald-400">SPD: {currentUnit.speed || 0} m/s</span>
            <span>|</span>
            <span>YAW: {Math.round(currentUnit.heading_deg || 0)}°</span>
          </div>
        </div>

        {/* Bottom HUD Coordinates & Mode inside Video */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between font-mono text-[10px] text-slate-200 pointer-events-none drop-shadow-md">
          <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10">
            LOC: {currentUnit.latitude?.toFixed(4)}°N, {currentUnit.longitude?.toFixed(4)}°E
          </div>

          <div className="bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 text-cyan-300 font-bold uppercase">
            MODE: {visionMode.toUpperCase()} | AI VISION: {aiOverlayActive ? 'LOCKED' : 'OFF'}
          </div>
        </div>
      </div>

      {/* Camera Controls Bar */}
      <div className="p-2 bg-slate-900 border-t border-ops-border flex items-center justify-between text-xs font-mono">
        {/* Vision Mode Filters */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">Vision:</span>
          <button
            onClick={() => setVisionMode('flir')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
              visionMode === 'flir' ? 'bg-red-950 text-red-300 border border-red-500/50' : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            FLIR Thermal
          </button>
          <button
            onClick={() => setVisionMode('nvg')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
              visionMode === 'nvg' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            Tactical NVG
          </button>
          <button
            onClick={() => setVisionMode('rgb')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
              visionMode === 'rgb' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            RGB 4K
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAiOverlayActive(!aiOverlayActive)}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
              aiOverlayActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            AI Boxes
          </button>
          <button
            onClick={handleSnapshot}
            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1 border border-slate-700"
          >
            <Camera className="w-3 h-3 text-cyan-400" />
            Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}
