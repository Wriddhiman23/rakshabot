import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { updateVictimStatus } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  Users, 
  Search, 
  MapPin, 
  Clock, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Send, 
  Eye, 
  Radio, 
  Heart,
  Thermometer
} from 'lucide-react';

export default function VictimTrackerView({ onDispatchToVictim, onOpenComms }) {
  const { victims, refreshData } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusUpdating, setStatusUpdating] = useState(null);

  const filteredVictims = victims.filter(v => {
    const matchesSearch = 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.victim_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === 'ALL' || v.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const handleStatusChange = async (victimId, newStatus) => {
    try {
      setStatusUpdating(victimId);
      playSound('click');
      await updateVictimStatus(victimId, newStatus);
      refreshData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setStatusUpdating(null);
    }
  };

  const criticalCount = victims.filter(v => v.priority === 'CRITICAL' && v.status !== 'RESCUED').length;
  const rescuedCount = victims.filter(v => v.status === 'RESCUED' || v.status === 'FIRST_AID_DROPPED').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-7xl mx-auto w-full custom-scrollbar">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-ops-card border border-ops-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Total Tracked</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-1">{victims.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Detected across Periyar Sector</p>
        </div>

        <div className="p-4 rounded-xl bg-ops-card border border-red-500/30 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-red-400">Critical (Unrescued)</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-red-400 mt-1">{criticalCount}</div>
          <p className="text-[11px] text-red-300/70 mt-0.5">Urgent intervention required</p>
        </div>

        <div className="p-4 rounded-xl bg-ops-card border border-emerald-500/30 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-emerald-400">Payload Dropped / Rescued</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{rescuedCount}</div>
          <p className="text-[11px] text-emerald-300/70 mt-0.5">Stabilized via drone payload</p>
        </div>

        <div className="p-4 rounded-xl bg-ops-card border border-cyan-500/30 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-cyan-400">AI Detection Mean</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">93.8%</div>
          <p className="text-[11px] text-cyan-300/70 mt-0.5">Thermal & Optical FLIR fusion</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 bg-ops-panel border border-ops-border rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search victim ID, name, landmark, or condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((pri) => (
            <button
              key={pri}
              onClick={() => { playSound('click'); setPriorityFilter(pri); }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                priorityFilter === pri
                  ? pri === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-500/50' :
                    pri === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                    'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pri}
            </button>
          ))}
        </div>
      </div>

      {/* Victims Cards List */}
      <div className="space-y-3">
        {filteredVictims.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-ops-card border border-ops-border text-slate-400 font-mono text-xs">
            No victim records match your current filter.
          </div>
        ) : (
          filteredVictims.map((victim) => {
            const isCritical = victim.priority === 'CRITICAL';
            const isRescued = victim.status === 'RESCUED' || victim.status === 'FIRST_AID_DROPPED';

            return (
              <div
                key={victim.id}
                className="p-4 rounded-xl bg-ops-card border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow ${
                      isRescued ? 'bg-emerald-600' : isCritical ? 'bg-red-600 animate-pulse' : 'bg-amber-600'
                    }`}>
                      {isRescued ? '✓' : isCritical ? '!' : '⚠'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{victim.name}</span>
                        <span className="text-xs font-mono text-cyan-400 font-bold">[{victim.victim_code}]</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isCritical ? 'bg-red-950 text-red-300 border border-red-600/40' :
                          'bg-amber-950 text-amber-300 border border-amber-600/40'
                        }`}>
                          {victim.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">{victim.condition}</p>
                    </div>
                  </div>

                  {/* Status Dropdown & Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      value={victim.status}
                      disabled={statusUpdating === victim.id}
                      onChange={(e) => handleStatusChange(victim.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="DETECTED">DETECTED</option>
                      <option value="AWAITING_RESCUE">AWAITING RESCUE</option>
                      <option value="DRONE_EN_ROUTE">DRONE EN ROUTE</option>
                      <option value="FIRST_AID_DROPPED">FIRST AID DROPPED</option>
                      <option value="RESCUED">RESCUED</option>
                      <option value="EVACUATED">EVACUATED</option>
                    </select>

                    <button
                      onClick={() => onDispatchToVictim(victim)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Drone</span>
                    </button>
                  </div>
                </div>

                {/* Vitals, Sensor Info & Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">LANDMARK LOCATION</span>
                      <span className="text-slate-200 font-bold truncate block">{victim.landmark}</span>
                      <span className="text-[10px] text-slate-500">{victim.latitude.toFixed(4)}°N, {victim.longitude.toFixed(4)}°E</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">THERMAL SCAN & SENSORS</span>
                      <span className="text-amber-300 font-bold block">{victim.thermal_signature}</span>
                      <span className="text-[10px] text-slate-400">Via {victim.detected_by_unit} ({victim.confidence_score}% Conf)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] block">CLINICAL TRIAGE STATUS</span>
                      <span className="text-emerald-300 font-medium truncate block">{victim.vitals_summary}</span>
                      <span className="text-[10px] text-slate-500">Detected {new Date(victim.detected_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
