import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { dispatchMission } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  Send, 
  Package, 
  Navigation, 
  Battery, 
  MapPin, 
  X, 
  Zap, 
  ShieldAlert, 
  CheckCircle2,
  Clock
} from 'lucide-react';

const PAYLOAD_OPTIONS = [
  { id: 'AED (Automated External Defibrillator)', label: 'AED Defibrillator (Cardiac Golden Hour)', icon: '⚡' },
  { id: 'Trauma Kit & Burn Dressing', label: 'Trauma Kit & Clotting Hemostatics', icon: '🩹' },
  { id: 'Antivenom & EpiPen Injectors', label: 'Polyvalent Antivenom & Epinephrine', icon: '💉' },
  { id: 'Inflatable Lifebuoys & Baby Rations', label: 'Inflatable Lifebuoys & Survival Rations', icon: '🛟' },
  { id: 'Emergency Rations, Clean Water, Radios', label: 'Heavy Rations & Water 50kg (Ground Rover)', icon: '📦' }
];

export default function MissionDispatchModal({ isOpen, onClose, targetData, onSuccess }) {
  const { units } = useWebSocket();
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(PAYLOAD_OPTIONS[0].id);
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(9.9925);
  const [longitude, setLongitude] = useState(76.3075);
  const [priority, setPriority] = useState('HIGH');
  const [incidentType, setIncidentType] = useState('cardiac');
  const [victimId, setVictimId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (units.length > 0 && !selectedUnitId) {
      const readyDrone = units.find(u => u.status === 'IDLE' && u.unit_type === 'drone') || units[0];
      setSelectedUnitId(readyDrone.id);
    }
  }, [units, selectedUnitId]);

  useEffect(() => {
    if (targetData) {
      if (targetData.lat) setLatitude(targetData.lat);
      if (targetData.lng) setLongitude(targetData.lng);
      if (targetData.landmark) setLandmark(targetData.landmark);
      if (targetData.victim_id) setVictimId(targetData.victim_id);
      if (targetData.incident_type) setIncidentType(targetData.incident_type);

      if (targetData.suggested_payload) {
        setSelectedPayload(targetData.suggested_payload);
      } else if (targetData.incident_type === 'cardiac') {
        setSelectedPayload('AED (Automated External Defibrillator)');
      } else if (targetData.incident_type === 'snakebite') {
        setSelectedPayload('Antivenom & EpiPen Injectors');
      } else if (targetData.incident_type === 'flood') {
        setSelectedPayload('Inflatable Lifebuoys & Baby Rations');
      }

      if (targetData.suggested_unit) {
        const found = units.find(u => u.callsign === targetData.suggested_unit);
        if (found) setSelectedUnitId(found.id);
      }
    }
  }, [targetData, units]);

  if (!isOpen) return null;

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      alert('Please select a unit to dispatch.');
      return;
    }

    try {
      setIsSubmitting(true);
      playSound('dispatch');

      await dispatchMission({
        unit_id: selectedUnitId,
        target_lat: Number(latitude),
        target_lng: Number(longitude),
        target_landmark: landmark || 'Designated Coordinates',
        incident_type: incidentType,
        priority: priority,
        payload_item: selectedPayload,
        victim_id: victimId,
        title: `Emergency Dispatch - ${incidentType.toUpperCase()} at ${landmark}`
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSelectedUnit = units.find(u => u.id === selectedUnitId);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-ops-card border border-ops-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-ops-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-base text-white">MISSION DISPATCH CONSOLE</h2>
              <p className="text-xs text-slate-400">Scramble Autonomous Responders & Assign Payloads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleDispatch} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Unit Selection Grid */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              1. Choose Responder Unit
            </label>
            <div className="grid grid-cols-2 gap-2">
              {units.map((unit) => {
                const isSelected = selectedUnitId === unit.id;
                const isReady = unit.status === 'IDLE';

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => { playSound('click'); setSelectedUnitId(unit.id); }}
                    className={`p-2.5 rounded-xl border text-left transition relative ${
                      isSelected
                        ? 'bg-cyan-950/90 border-cyan-400 ring-1 ring-cyan-400 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{unit.unit_type === 'drone' ? '🚁' : '🚜'}</span>
                        <span>{unit.callsign}</span>
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                        isReady ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40' :
                        'bg-amber-950 text-amber-300 border border-amber-600/40'
                      }`}>
                        {unit.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">{unit.model_name}</div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/70 px-2 py-1 rounded">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" />
                        {Math.round(unit.battery)}%
                      </span>
                      <span className="text-cyan-300">
                        Cap: {unit.payload_capacity_kg}kg
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payload Selection */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              2. Assign Mission Payload
            </label>
            <div className="space-y-1.5">
              {PAYLOAD_OPTIONS.map((opt) => {
                const isSelected = selectedPayload === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { playSound('click'); setSelectedPayload(opt.id); }}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/40'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{opt.icon}</span>
                      <span className="text-xs font-mono font-semibold">{opt.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination & Coordinates */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
              3. Target Destination Landmark & Coordinates
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Target landmark name (e.g. Sector 3 Porch)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Target Lat"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Target Lng"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedUnitId}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Scrambling Drone...' : `Scramble & Dispatch ${currentSelectedUnit?.callsign || 'Unit'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
