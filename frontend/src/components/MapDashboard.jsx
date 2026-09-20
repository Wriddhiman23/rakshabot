import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { overrideUnit } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  Crosshair, 
  Layers, 
  Radio, 
  Battery, 
  Navigation, 
  Compass, 
  ShieldAlert, 
  Eye, 
  RotateCw, 
  Pause, 
  Home, 
  Package, 
  X,
  Zap,
  PhoneCall
} from 'lucide-react';

// Base Camp coordinates (NDRF Base 04, Kochi Periyar Sector)
const BASE_COORDS = [9.9850, 76.2950];

export default function MapDashboard({ onDispatchUnit, onOpenCommsWithUnit, onSelectCameraUnit }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({
    units: {},
    victims: {},
    hazards: [],
    baseCamp: null,
    flightLines: {}
  });

  const { units, victims, hazards, missions, selectedUnit, setSelectedUnit } = useWebSocket();
  const { hasPermission, currentUser } = useAuth();

  const [filterLayers, setFilterLayers] = useState({
    drones: true,
    rovers: true,
    victims: true,
    hazards: true,
    paths: true
  });
  const [mouseCoords, setMouseCoords] = useState({ lat: 9.9950, lng: 76.3100 });
  const [activeUnitModal, setActiveUnitModal] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [9.995, 76.310],
      zoom: 13,
      minZoom: 11,
      maxZoom: 17,
      zoomControl: false
    });

    // Standard OpenStreetMap Tile Layer (darkened via CSS filter on .leaflet-tile-pane)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('mousemove', (e) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5))
      });
    });

    // Add Base Camp Marker
    const baseIcon = L.divIcon({
      className: 'base-camp-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full border-2 border-cyan-400/40 animate-ping"></div>
          <div class="absolute w-8 h-8 rounded-full border border-cyan-400 bg-cyan-950/80 shadow-lg shadow-cyan-500/50"></div>
          <div class="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-black">HQ</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const baseMarker = L.marker(BASE_COORDS, { icon: baseIcon }).addTo(map);
    baseMarker.bindTooltip('<div class="font-mono text-xs font-bold text-cyan-300">NDRF BASE 04 (COMMAND HQ)</div>', {
      direction: 'top',
      offset: [0, -20],
      className: 'tactical-tooltip'
    });
    markersRef.current.baseCamp = baseMarker;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Hazard Zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hazards) return;

    // Clear old hazards
    markersRef.current.hazards.forEach(h => map.removeLayer(h));
    markersRef.current.hazards = [];

    if (!filterLayers.hazards) return;

    hazards.forEach((hazard) => {
      try {
        const coords = JSON.parse(hazard.coordinates_json);
        const color = hazard.severity === 'CRITICAL' ? '#ef4444' : hazard.severity === 'WARNING' ? '#f59e0b' : '#38bdf8';
        const polygon = L.polygon(coords, {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.15,
          dashArray: '6, 6'
        }).addTo(map);

        polygon.bindTooltip(`
          <div class="font-mono text-xs">
            <div class="font-bold uppercase text-${hazard.severity === 'CRITICAL' ? 'red' : 'amber'}-400">${hazard.name}</div>
            <div class="text-[10px] text-slate-300">${hazard.description}</div>
          </div>
        `, { sticky: true, className: 'tactical-tooltip' });

        markersRef.current.hazards.push(polygon);
      } catch (e) {
        console.error('Error parsing hazard polygon:', e);
      }
    });
  }, [hazards, filterLayers.hazards]);

  // Update Victims Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !victims) return;

    // Remove old victim markers that aren't in current list
    const currentVicCodes = new Set(victims.map(v => v.victim_code));
    Object.keys(markersRef.current.victims).forEach(code => {
      if (!currentVicCodes.has(code)) {
        map.removeLayer(markersRef.current.victims[code]);
        delete markersRef.current.victims[code];
      }
    });

    if (!filterLayers.victims) {
      Object.values(markersRef.current.victims).forEach(m => map.removeLayer(m));
      markersRef.current.victims = {};
      return;
    }

    victims.forEach((victim) => {
      const isCritical = victim.priority === 'CRITICAL';
      const isRescued = victim.status === 'RESCUED' || victim.status === 'FIRST_AID_DROPPED';
      const color = isRescued ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute w-8 h-8 rounded-full ${isCritical && !isRescued ? 'animate-ping' : ''}" style="background-color: ${color}33;"></div>
          <div class="w-6 h-6 rounded-full flex items-center justify-center border-2 border-black font-mono font-bold text-[10px] text-white shadow-lg" style="background-color: ${color};">
            ${isRescued ? '✓' : '!'}
          </div>
          <div class="absolute -bottom-4 px-1.5 py-0.2 rounded bg-black/90 border border-slate-700 text-[9px] font-mono font-bold text-slate-200 whitespace-nowrap shadow">
            ${victim.victim_code}
          </div>
        </div>
      `;

      const vicIcon = L.divIcon({
        className: 'victim-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      if (markersRef.current.victims[victim.victim_code]) {
        // Update existing marker position
        markersRef.current.victims[victim.victim_code].setLatLng([victim.latitude, victim.longitude]);
        markersRef.current.victims[victim.victim_code].setIcon(vicIcon);
      } else {
        const marker = L.marker([victim.latitude, victim.longitude], { icon: vicIcon }).addTo(map);
        marker.on('click', () => {
          playSound('click');
          onDispatchUnit({
            lat: victim.latitude,
            lng: victim.longitude,
            landmark: victim.landmark,
            victim_id: victim.id,
            victim_code: victim.victim_code,
            condition: victim.condition,
            incident_type: victim.condition.toLowerCase().includes('cardiac') ? 'cardiac' : victim.condition.toLowerCase().includes('snake') ? 'snakebite' : victim.condition.toLowerCase().includes('flood') ? 'flood' : 'trauma'
          });
        });

        marker.bindTooltip(`
          <div class="p-1 font-mono">
            <div class="text-xs font-bold text-red-400">${victim.name} (${victim.victim_code})</div>
            <div class="text-[11px] text-slate-200">${victim.condition}</div>
            <div class="text-[10px] text-slate-400">${victim.landmark}</div>
            <div class="text-[10px] text-cyan-400 font-semibold mt-1">Status: ${victim.status} (Click to Dispatch)</div>
          </div>
        `, { className: 'tactical-tooltip', direction: 'top', offset: [0, -15] });

        markersRef.current.victims[victim.victim_code] = marker;
      }
    });
  }, [victims, filterLayers.victims, onDispatchUnit]);

  // Update Units (Drones & Ground Robots) & Flight Tracks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !units) return;

    units.forEach((unit) => {
      const isDrone = unit.unit_type === 'drone';
      const isVisible = isDrone ? filterLayers.drones : filterLayers.rovers;

      if (!isVisible) {
        if (markersRef.current.units[unit.id]) {
          map.removeLayer(markersRef.current.units[unit.id]);
          delete markersRef.current.units[unit.id];
        }
        if (markersRef.current.flightLines[unit.id]) {
          map.removeLayer(markersRef.current.flightLines[unit.id]);
          delete markersRef.current.flightLines[unit.id];
        }
        return;
      }

      const statusColor = 
        unit.status === 'EN_ROUTE' ? '#06b6d4' : // Tactical Cyan
        unit.status === 'ON_SITE' ? '#f59e0b' : // Amber
        unit.status === 'RETURNING' ? '#818cf8' : // Indigo
        unit.status === 'HOLDING' ? '#ec4899' : // Magenta
        '#10b981'; // Emerald Idle

      // Custom SVG tactical marker with heading rotation
      const heading = unit.heading_deg || 0;
      const markerHtml = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          <!-- Pulse ring for active mission -->
          ${unit.status !== 'IDLE' ? `<div class="absolute w-12 h-12 rounded-full animate-ping opacity-30" style="background-color: ${statusColor};"></div>` : ''}

          <!-- Rotating Vehicle Icon Container -->
          <div class="relative w-9 h-9 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xl transition-transform duration-300"
               style="background-color: ${statusColor}; transform: rotate(${heading}deg);">
            ${isDrone ? `
              <!-- Drone Quadcopter SVG -->
              <svg class="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                <!-- Heading Arrow -->
                <polygon points="12,1 15,7 9,7" fill="#000" />
              </svg>
            ` : `
              <!-- Ground Rover UGV SVG -->
              <svg class="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="7" width="14" height="10" rx="2"/>
                <circle cx="7" cy="19" r="2"/>
                <circle cx="17" cy="19" r="2"/>
                <polygon points="12,2 15,6 9,6" fill="#000" />
              </svg>
            `}
          </div>

          <!-- Unit Callsign & Altitude Badge -->
          <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-md whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${statusColor};"></span>
            <span>${unit.callsign}</span>
            ${isDrone && unit.altitude > 0 ? `<span class="text-cyan-400">${Math.round(unit.altitude)}m</span>` : ''}
          </div>
        </div>
      `;

      const unitIcon = L.divIcon({
        className: 'unit-marker',
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [0, 0]
      });

      if (markersRef.current.units[unit.id]) {
        // Move smoothly to current coordinates
        markersRef.current.units[unit.id].setLatLng([unit.latitude, unit.longitude]);
        markersRef.current.units[unit.id].setIcon(unitIcon);
      } else {
        const marker = L.marker([unit.latitude, unit.longitude], { icon: unitIcon }).addTo(map);
        marker.on('click', () => {
          playSound('click');
          setActiveUnitModal(unit);
          setSelectedUnit(unit);
        });

        markersRef.current.units[unit.id] = marker;
      }

      // Draw dashed flight path to active mission target or home
      if (filterLayers.paths && (unit.status === 'EN_ROUTE' || unit.status === 'RETURNING')) {
        let destLat = unit.home_lat;
        let destLng = unit.home_lng;

        if (unit.status === 'EN_ROUTE' && unit.current_mission_id && missions) {
          const m = missions.find(ms => ms.id === unit.current_mission_id);
          if (m) {
            destLat = m.target_lat;
            destLng = m.target_lng;
          }
        }

        const pathCoords = [
          [unit.latitude, unit.longitude],
          [destLat, destLng]
        ];

        if (markersRef.current.flightLines[unit.id]) {
          markersRef.current.flightLines[unit.id].setLatLngs(pathCoords);
        } else {
          const line = L.polyline(pathCoords, {
            color: statusColor,
            weight: 2,
            dashArray: '5, 8',
            opacity: 0.7
          }).addTo(map);
          markersRef.current.flightLines[unit.id] = line;
        }
      } else {
        if (markersRef.current.flightLines[unit.id]) {
          map.removeLayer(markersRef.current.flightLines[unit.id]);
          delete markersRef.current.flightLines[unit.id];
        }
      }
    });
  }, [units, missions, filterLayers, onOpenCommsWithUnit, setSelectedUnit]);

  // Center Map View Options
  const centerOnBase = () => {
    playSound('click');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(BASE_COORDS, 14, { duration: 1.2 });
    }
  };

  const centerOnActiveMission = () => {
    playSound('click');
    const activeUnit = units.find(u => u.status === 'EN_ROUTE' || u.status === 'ON_SITE');
    if (activeUnit && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([activeUnit.latitude, activeUnit.longitude], 15, { duration: 1.2 });
    } else {
      centerOnBase();
    }
  };

  const fitAll = () => {
    playSound('click');
    if (mapInstanceRef.current && units.length > 0) {
      const group = new L.featureGroup(Object.values(markersRef.current.units));
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  };

  // Handle Manual Overrides from Map Popover
  const handleOverride = async (unitId, cmd) => {
    try {
      playSound('dispatch');
      await overrideUnit(unitId, cmd);
      setActiveUnitModal(null);
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[550px] bg-slate-950 overflow-hidden flex flex-col">
      {/* Top Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2">
        {/* Layer Toggles */}
        <div className="flex items-center gap-1 bg-ops-panel/90 backdrop-blur border border-ops-border rounded-lg p-1 shadow-xl">
          <span className="text-[10px] font-mono uppercase text-slate-400 px-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Layers:
          </span>
          <button
            onClick={() => setFilterLayers(p => ({ ...p, drones: !p.drones }))}
            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition ${
              filterLayers.drones ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Drones
          </button>
          <button
            onClick={() => setFilterLayers(p => ({ ...p, rovers: !p.rovers }))}
            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition ${
              filterLayers.rovers ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Ground UGV
          </button>
          <button
            onClick={() => setFilterLayers(p => ({ ...p, victims: !p.victims }))}
            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition ${
              filterLayers.victims ? 'bg-red-950/80 border border-red-500/50 text-red-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Victims
          </button>
          <button
            onClick={() => setFilterLayers(p => ({ ...p, hazards: !p.hazards }))}
            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition ${
              filterLayers.hazards ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Hazards
          </button>
        </div>

        {/* Quick Zoom Presets */}
        <div className="flex items-center gap-1 bg-ops-panel/90 backdrop-blur border border-ops-border rounded-lg p-1 shadow-xl">
          <button
            onClick={centerOnBase}
            className="px-2 py-1 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
          >
            <Home className="w-3 h-3 text-cyan-400" />
            Base HQ
          </button>
          <button
            onClick={centerOnActiveMission}
            className="px-2 py-1 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
          >
            <Crosshair className="w-3 h-3 text-amber-400" />
            Follow Mission
          </button>
          <button
            onClick={fitAll}
            className="px-2 py-1 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Fit Fleet
          </button>
        </div>
      </div>

      {/* Actual Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Bottom Telemetry HUD Bar on Map */}
      <div className="absolute bottom-2 left-2 z-[400] bg-ops-panel/90 backdrop-blur border border-ops-border px-3 py-1.5 rounded-lg flex items-center gap-4 text-xs font-mono text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>CURSOR: {mouseCoords.lat.toFixed(4)}° N, {mouseCoords.lng.toFixed(4)}° E</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>OPERATIONAL GRID:</span>
          <span className="text-emerald-400 font-bold">KOCHI-PERIYAR SECTOR</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-white font-bold">{units.filter(u => u.status !== 'OFFLINE').length} UNITS AIRBORNE/READY</span>
        </div>
      </div>

      {/* Unit Detail Modal / Overlay when clicked on map */}
      {activeUnitModal && (
        <div className="absolute top-16 right-4 z-[500] w-84 sm:w-96 rounded-xl bg-ops-card/95 backdrop-blur-md border border-cyan-500/40 p-4 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black ${
                activeUnitModal.unit_type === 'drone' ? 'bg-cyan-400' : 'bg-emerald-400'
              }`}>
                {activeUnitModal.unit_type === 'drone' ? '🚁' : '🚜'}
              </div>
              <div>
                <h3 className="font-mono font-bold text-base text-white">{activeUnitModal.callsign}</h3>
                <p className="text-xs text-slate-400">{activeUnitModal.model_name}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveUnitModal(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetry Numbers */}
          <div className="grid grid-cols-3 gap-2 my-3 font-mono text-center">
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Battery</div>
              <div className={`text-base font-bold ${activeUnitModal.battery < 25 ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(activeUnitModal.battery)}%
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Altitude</div>
              <div className="text-base font-bold text-cyan-400">{Math.round(activeUnitModal.altitude)}m</div>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Speed</div>
              <div className="text-base font-bold text-amber-400">{activeUnitModal.speed} m/s</div>
            </div>
          </div>

          {/* Status & Payload */}
          <div className="space-y-2 text-xs font-mono bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Mission State:</span>
              <span className="font-bold text-cyan-300">{activeUnitModal.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Payload:</span>
              <span className="font-bold text-emerald-300">{activeUnitModal.current_payload}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Signal RSSI:</span>
              <span className="text-slate-200">{activeUnitModal.signal_dbm} dBm (99% Link)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sensors:</span>
              <span className="text-slate-200">{activeUnitModal.detection_label || 'Optical 4K + FLIR'}</span>
            </div>
          </div>

          {/* Quick Shortcuts: Camera & Push-to-Talk */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => {
                onSelectCameraUnit(activeUnitModal.id);
                setActiveUnitModal(null);
              }}
              className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              View Camera Feed
            </button>
            <button
              onClick={() => {
                onOpenCommsWithUnit(activeUnitModal.callsign);
                setActiveUnitModal(null);
              }}
              className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Two-Way Audio
            </button>
          </div>

          {/* Manual Flight Overrides (Role Protected: Rescue Lead or Admin) */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Manual Flight Overrides</span>
              {!hasPermission('OVERRIDE_UNITS') && (
                <span className="text-red-400 text-[9px]">(Rescue Lead or Admin Only)</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                disabled={!hasPermission('OVERRIDE_UNITS')}
                onClick={() => handleOverride(activeUnitModal.id, 'HOLD')}
                className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-amber-600/30"
              >
                <Pause className="w-3 h-3" />
                Hold
              </button>
              <button
                disabled={!hasPermission('OVERRIDE_UNITS')}
                onClick={() => handleOverride(activeUnitModal.id, 'RTH')}
                className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-cyan-600/30"
              >
                <Home className="w-3 h-3" />
                RTH
              </button>
              <button
                disabled={!hasPermission('OVERRIDE_UNITS')}
                onClick={() => handleOverride(activeUnitModal.id, 'DROP_PAYLOAD')}
                className="py-1 px-2 rounded bg-red-950/80 hover:bg-red-900/80 disabled:opacity-40 text-red-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-red-600/40"
              >
                <Package className="w-3 h-3" />
                Drop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
