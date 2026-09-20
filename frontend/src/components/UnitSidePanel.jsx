import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { overrideUnit } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  Radio, 
  Battery, 
  Navigation, 
  Wind, 
  Signal, 
  Pause, 
  RotateCcw, 
  Home, 
  Package, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ChevronRight, 
  Sliders, 
  Eye, 
  Send
} from 'lucide-react';

const MISSION_STEPS = [
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'EN_ROUTE', label: 'En Route' },
  { key: 'ON_SITE', label: 'On Site' },
  { key: 'PAYLOAD_DELIVERED', label: 'Delivered' },
  { key: 'RETURNING', label: 'Returning' },
  { key: 'COMPLETED', label: 'Completed' }
];

export default function UnitSidePanel({ onSelectCameraUnit, onDispatchUnit, onOpenCommsWithUnit }) {
  const { units, missions } = useWebSocket();
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'missions'
  const [overrideLoading, setOverrideLoading] = useState({});

  const handleOverride = async (unitId, command) => {
    try {
      setOverrideLoading(prev => ({ ...prev, [unitId]: command }));
      playSound('dispatch');
      await overrideUnit(unitId, command);
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setOverrideLoading(prev => ({ ...prev, [unitId]: null }));
    }
  };

  const getStepIndex = (status) => {
    const idx = MISSION_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <aside className="w-full lg:w-96 bg-ops-panel border-l border-ops-border flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Panel Header & Tabs */}
      <div className="p-3 border-b border-ops-border bg-slate-900/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">TACTICAL FLEET HUB</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
            {units.length} UNITS ONLINE
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => { playSound('click'); setActiveTab('fleet'); }}
            className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'fleet'
                ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Fleet Units ({units.length})
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('missions'); }}
            className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'missions'
                ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Active Missions ({missions.filter(m => m.status !== 'COMPLETED' && m.status !== 'ABORTED').length})
          </button>
        </div>
      </div>

      {/* Tab 1: Fleet Units Telemetry */}
      {activeTab === 'fleet' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {units.map((unit) => {
            const isDrone = unit.unit_type === 'drone';
            const isBusy = unit.status === 'EN_ROUTE' || unit.status === 'ON_SITE' || unit.status === 'RETURNING';
            
            return (
              <div
                key={unit.id}
                className="rounded-xl bg-ops-card/80 border border-slate-800 hover:border-slate-700 transition p-3 space-y-2.5 shadow-md"
              >
                {/* Unit Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-black shadow ${
                      isDrone ? 'bg-cyan-400 shadow-cyan-900/30' : 'bg-emerald-400 shadow-emerald-900/30'
                    }`}>
                      {isDrone ? '🚁' : '🚜'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-white">{unit.callsign}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                          {unit.unit_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{unit.model_name}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    unit.status === 'EN_ROUTE' ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 animate-pulse' :
                    unit.status === 'ON_SITE' ? 'bg-amber-950 text-amber-300 border-amber-500/50' :
                    unit.status === 'RETURNING' ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50' :
                    unit.status === 'HOLDING' ? 'bg-pink-950 text-pink-300 border-pink-500/50' :
                    'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  }`}>
                    {unit.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Telemetry Meters */}
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono py-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <div className="p-1">
                    <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                      <Battery className="w-2.5 h-2.5 text-emerald-400" />
                      BAT
                    </div>
                    <div className={`text-xs font-bold ${unit.battery < 25 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {Math.round(unit.battery)}%
                    </div>
                  </div>

                  <div className="p-1">
                    <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                      <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                      ALT
                    </div>
                    <div className="text-xs font-bold text-cyan-300">
                      {isDrone ? `${Math.round(unit.altitude)}m` : '0m'}
                    </div>
                  </div>

                  <div className="p-1">
                    <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                      <Wind className="w-2.5 h-2.5 text-amber-400" />
                      SPD
                    </div>
                    <div className="text-xs font-bold text-amber-300">
                      {unit.speed}m/s
                    </div>
                  </div>

                  <div className="p-1">
                    <div className="text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                      <Signal className="w-2.5 h-2.5 text-slate-400" />
                      RSSI
                    </div>
                    <div className="text-xs font-bold text-slate-200">
                      {unit.signal_dbm}
                    </div>
                  </div>
                </div>

                {/* Payload & Detection Info */}
                <div className="text-xs font-mono flex items-center justify-between text-slate-300 bg-slate-900/40 px-2 py-1.5 rounded border border-slate-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{unit.current_payload}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold shrink-0 ml-1 px-1.5 py-0.5 rounded ${
                    unit.payload_status === 'LOADED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' :
                    unit.payload_status === 'IN_TRANSIT' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {unit.payload_status}
                  </span>
                </div>

                {/* Action Bar: Overrides & Tools */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectCameraUnit(unit.id)}
                      title="View live camera POV"
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenCommsWithUnit(unit.callsign)}
                      title="Open push-to-talk channel"
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Manual Overrides */}
                  {hasPermission('OVERRIDE_UNITS') ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOverride(unit.id, 'HOLD')}
                        disabled={overrideLoading[unit.id] === 'HOLD' || unit.status === 'IDLE'}
                        title="Hold position / hover in place"
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[10px] font-mono text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        Hold
                      </button>
                      <button
                        onClick={() => handleOverride(unit.id, 'RTH')}
                        disabled={overrideLoading[unit.id] === 'RTH' || unit.status === 'IDLE'}
                        title="Return to Home (Base 04)"
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[10px] font-mono text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1"
                      >
                        <Home className="w-3 h-3" />
                        RTH
                      </button>
                      <button
                        onClick={() => handleOverride(unit.id, 'DROP_PAYLOAD')}
                        disabled={overrideLoading[unit.id] === 'DROP_PAYLOAD' || unit.payload_status === 'DEPLOYED' || unit.status === 'IDLE'}
                        title="Drop Payload on site"
                        className="px-2 py-1 rounded bg-red-950 hover:bg-red-900 disabled:opacity-30 text-[10px] font-mono text-red-300 border border-red-500/40 transition flex items-center gap-1"
                      >
                        <Package className="w-3 h-3" />
                        Drop
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">Overrides Locked (View Only)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Active Missions Pipeline */}
      {activeTab === 'missions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {missions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No active missions recorded.
            </div>
          ) : (
            missions.map((mission) => {
              const currentStepIdx = getStepIndex(mission.status);
              const assignedUnit = units.find(u => u.id === mission.unit_id);

              return (
                <div
                  key={mission.id}
                  className="rounded-xl bg-ops-card/90 border border-slate-800 p-3.5 space-y-2.5 shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white">{mission.mission_number}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                          mission.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700/50' :
                          'bg-amber-950 text-amber-300 border border-amber-700/50'
                        }`}>
                          {mission.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{mission.title}</h4>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/40 uppercase font-bold">
                      {mission.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Site:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[180px]">{mission.target_landmark}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Responder Unit:</span>
                      <span className="text-cyan-400 font-bold">{assignedUnit?.callsign || 'Auto-Assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payload Deployed:</span>
                      <span className="text-emerald-400 font-semibold truncate max-w-[180px]">{mission.payload_item}</span>
                    </div>
                    {mission.response_time_seconds && (
                      <div className="flex justify-between text-emerald-300 font-bold">
                        <span>Response Time:</span>
                        <span>{Math.floor(mission.response_time_seconds / 60)}m {mission.response_time_seconds % 60}s</span>
                      </div>
                    )}
                  </div>

                  {/* 6-State Pipeline Visualizer */}
                  <div className="pt-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase mb-1.5 flex justify-between">
                      <span>Lifecycle Pipeline</span>
                      <span className="text-cyan-400">Step {currentStepIdx + 1} of 6</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {MISSION_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div key={step.key} className="flex flex-col items-center">
                            <div className={`h-1.5 w-full rounded-full transition-all ${
                              isCurrent ? 'bg-cyan-400 animate-pulse shadow shadow-cyan-400' :
                              isDone ? 'bg-emerald-500' :
                              'bg-slate-800'
                            }`} />
                            <span className={`text-[8px] font-mono mt-1 truncate max-w-full text-center ${
                              isCurrent ? 'text-cyan-300 font-bold' :
                              isDone ? 'text-slate-400' :
                              'text-slate-600'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
