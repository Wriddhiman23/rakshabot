import React, { useState, useEffect } from 'react';
import { suggestNearestUnits, reportEmergency, dispatchMission } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  AlertTriangle, 
  Heart, 
  Activity, 
  Waves, 
  Building2, 
  ShieldAlert, 
  MapPin, 
  Users, 
  Send, 
  CheckCircle2, 
  Zap, 
  X, 
  Clock,
  Battery,
  Navigation
} from 'lucide-react';

const EMERGENCY_TYPES = [
  { id: 'cardiac', label: 'Cardiac Arrest', icon: Heart, color: 'border-red-500 text-red-400 bg-red-950/40', defaultPayload: 'AED (Automated External Defibrillator)' },
  { id: 'trauma', label: 'Trauma / Crush', icon: Activity, color: 'border-orange-500 text-orange-400 bg-orange-950/40', defaultPayload: 'Trauma Kit & Burn Dressing' },
  { id: 'flood', label: 'Flood Stranded', icon: Waves, color: 'border-cyan-500 text-cyan-400 bg-cyan-950/40', defaultPayload: 'Inflatable Lifebuoys & Baby Rations' },
  { id: 'collapse', label: 'Building Collapse', icon: Building2, color: 'border-amber-500 text-amber-400 bg-amber-950/40', defaultPayload: 'Search & Rescue Locator Beacon & Trauma Pack' },
  { id: 'snakebite', label: 'Snakebite / Venom', icon: ShieldAlert, color: 'border-emerald-500 text-emerald-400 bg-emerald-950/40', defaultPayload: 'Antivenom & EpiPen Injectors' },
];

const PRESET_LOCATIONS = [
  { name: 'Sector 3 Community Hall', lat: 9.9925, lng: 76.3075 },
  { name: 'Aluva Riverbank Terrace', lat: 10.0125, lng: 76.3540 },
  { name: 'Kalamassery Warehouse Zone', lat: 10.0460, lng: 76.3230 },
  { name: 'Vallarpadam Wetland Dyke', lat: 9.9995, lng: 76.2640 },
  { name: 'Bolgatty Marine Approach', lat: 9.9820, lng: 76.2690 },
];

export default function EmergencyIntakeModal({ isOpen, onClose, initialData, onSuccess }) {
  const [incidentType, setIncidentType] = useState('cardiac');
  const [severity, setSeverity] = useState('CRITICAL');
  const [affectedCount, setAffectedCount] = useState(1);
  const [landmark, setLandmark] = useState('Sector 3 Community Hall');
  const [latitude, setLatitude] = useState(9.9925);
  const [longitude, setLongitude] = useState(76.3075);
  const [callerName, setCallerName] = useState('Emergency 112 Control Room');
  const [description, setDescription] = useState('Patient collapsed, bystanders attempting CPR.');

  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill if opened from an alert or map click
  useEffect(() => {
    if (initialData) {
      if (initialData.incident_type) setIncidentType(initialData.incident_type);
      if (initialData.lat) setLatitude(initialData.lat);
      if (initialData.lng) setLongitude(initialData.lng);
      if (initialData.landmark) setLandmark(initialData.landmark);
      if (initialData.condition) setDescription(initialData.condition);
    }
  }, [initialData]);

  // Query nearest unit suggestions whenever coords or incidentType change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingSuggestions(true);

    suggestNearestUnits(latitude, longitude, incidentType)
      .then(data => {
        if (isMounted) {
          setSuggestions(data);
          if (data && data.length > 0) {
            setSelectedSuggestion(data[0]); // top recommendation
          }
        }
      })
      .catch(err => console.error('Error getting unit suggestions:', err))
      .finally(() => {
        if (isMounted) setLoadingSuggestions(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, latitude, longitude, incidentType]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset) => {
    playSound('click');
    setLandmark(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
  };

  const handleSubmitAndDispatch = async (e) => {
    e.preventDefault();
    if (!selectedSuggestion) {
      alert('Please select a recommended unit for dispatch.');
      return;
    }

    try {
      setIsSubmitting(true);
      playSound('dispatch');

      // 1. Report emergency to register victim/incident
      const reportRes = await reportEmergency({
        incident_type: incidentType,
        severity: severity,
        affected_count: Number(affectedCount),
        latitude: Number(latitude),
        longitude: Number(longitude),
        landmark: landmark,
        caller_name: callerName,
        description: description,
        preferred_payload: selectedSuggestion.recommended_payload
      });

      const newVictim = reportRes.victim;

      // 2. Dispatch the chosen drone/ground robot immediately
      await dispatchMission({
        unit_id: selectedSuggestion.unit.id,
        target_lat: Number(latitude),
        target_lng: Number(longitude),
        target_landmark: landmark,
        incident_type: incidentType,
        priority: severity,
        payload_item: selectedSuggestion.recommended_payload,
        victim_id: newVictim?.id,
        title: `Priority Dispatch: ${incidentType.toUpperCase()} at ${landmark}`,
        notes: `Reported by ${callerName}: ${description}`
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-ops-card border border-ops-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-ops-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-base text-white">EMERGENCY ALERT INTAKE</h2>
              <p className="text-xs text-slate-400">112 Dispatch & Autonomous Unit Assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmitAndDispatch} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* 1. Incident Type Selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              1. Select Emergency Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMERGENCY_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = incidentType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { playSound('click'); setIncidentType(t.id); }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      isSelected 
                        ? `${t.color} ring-1 ring-white/20 shadow-lg` 
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">{t.label}</div>
                      <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">Payload auto-matched</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Severity & Persons Affected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                Severity Triage
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg transition ${
                      severity === sev
                        ? sev === 'CRITICAL' ? 'bg-red-600 text-white' : sev === 'HIGH' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                Persons Affected
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs font-mono text-slate-400 whitespace-nowrap">Individuals</span>
              </div>
            </div>
          </div>

          {/* 3. Location Picker with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                Location & Coordinates
              </label>
              <span className="text-[10px] font-mono text-cyan-400">Quick Indian Disaster Presets</span>
            </div>

            {/* Presets Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                    landmark === preset.name
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Landmark name"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Caller & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                Caller / Origin
              </label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                Clinical / Situation Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 5. Auto-Suggested Nearest Drone/Robot */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Auto-Suggested Nearest Responders
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Calculated via Haversine & ETA
              </span>
            </div>

            {loadingSuggestions ? (
              <div className="p-4 text-center text-xs font-mono text-slate-400 animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
                Calculating closest drone telemetry and transit times...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                No units within operational range.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.slice(0, 4).map((sugg, idx) => {
                  const isSelected = selectedSuggestion?.unit.id === sugg.unit.id;
                  const isTop = idx === 0;

                  return (
                    <div
                      key={sugg.unit.id}
                      onClick={() => { playSound('click'); setSelectedSuggestion(sugg); }}
                      className={`p-3 rounded-xl border cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isTop && (
                        <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-black font-mono text-[9px] font-bold uppercase shadow">
                          ★ Best Match ({sugg.suitability_score}%)
                        </span>
                      )}

                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">
                          {sugg.unit.unit_type === 'drone' ? '🚁' : '🚜'}
                        </span>
                        <div>
                          <div className="font-mono font-bold text-xs text-white">{sugg.unit.callsign}</div>
                          <div className="text-[10px] text-slate-400">{sugg.unit.model_name}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 font-mono text-[10px] bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 text-center">
                        <div>
                          <span className="text-slate-500 block">DIST</span>
                          <span className="text-slate-200 font-bold">{(sugg.distance_meters / 1000).toFixed(1)} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ETA</span>
                          <span className="text-cyan-400 font-bold">{sugg.estimated_arrival_seconds}s</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">BAT</span>
                          <span className="text-emerald-400 font-bold">{Math.round(sugg.unit.battery)}%</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] font-mono text-emerald-300 flex items-center gap-1 truncate">
                        <span className="text-slate-500">Payload:</span>
                        <span className="font-bold truncate">{sugg.recommended_payload}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit / One-Click Dispatch Button */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedSuggestion}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition shadow-lg shadow-red-950/50 flex items-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Scrambling Unit...' 
                  : selectedSuggestion 
                  ? `Dispatch ${selectedSuggestion.unit.callsign} (${selectedSuggestion.recommended_payload})`
                  : 'Select Unit to Dispatch'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
