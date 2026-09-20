import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { fetchUnits, fetchMissions, fetchVictims, fetchHazards, fetchLogs } from '../utils/api';
import { playSound } from '../utils/audio';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [units, setUnits] = useState([]);
  const [missions, setMissions] = useState([]);
  const [victims, setVictims] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initial data loading
  const loadInitialData = useCallback(async () => {
    try {
      const [u, m, v, h, l] = await Promise.all([
        fetchUnits(),
        fetchMissions(),
        fetchVictims(),
        fetchHazards(),
        fetchLogs(30)
      ]);
      setUnits(u);
      setMissions(m);
      setVictims(v);
      setHazards(h);
      setLogs(l);
    } catch (err) {
      console.error('Initial data load failed:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // WebSocket connection management
  useEffect(() => {
    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to RakshaBot C2 telemetry stream');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, data } = msg;

          if (type === 'TELEMETRY_TICK') {
            setUnits((prevUnits) => {
              const unitMap = new Map(data.units.map(u => [u.id, u]));
              return prevUnits.map(unit => {
                const updated = unitMap.get(unit.id);
                return updated ? { ...unit, ...updated } : unit;
              });
            });

            if (data.demo_active !== undefined) setDemoActive(data.demo_active);
            if (data.demo_step !== undefined) setDemoStep(data.demo_step);
          }
          else if (type === 'NEW_EMERGENCY_ALERT') {
            playSound('critical');
            setActiveAlert({
              type: 'CRITICAL_EMERGENCY',
              title: data.title || `Emergency: ${data.incident_type?.toUpperCase()}`,
              landmark: data.landmark,
              priority: data.severity || 'CRITICAL',
              suggested_unit: data.suggested_unit || 'Garuda-01',
              suggested_payload: data.suggested_payload || 'AED Unit',
              lat: data.lat,
              lng: data.lng,
              timestamp: new Date().toLocaleTimeString()
            });
            loadInitialData();
          }
          else if (type === 'VICTIM_DETECTED') {
            playSound('alert');
            setActiveAlert({
              type: 'VICTIM_DETECTED',
              title: `AI Recon: Victim Detected (${data.name || data.victim_code})`,
              landmark: data.landmark,
              priority: 'HIGH',
              suggested_unit: 'Garuda-02',
              suggested_payload: 'Trauma Kit & Rations',
              lat: data.lat,
              lng: data.lng,
              timestamp: new Date().toLocaleTimeString()
            });
            loadInitialData();
          }
          else if (type === 'PAYLOAD_DELIVERED') {
            playSound('payload_drop');
            setActiveAlert({
              type: 'SUCCESS_DELIVERY',
              title: `Payload Delivered: ${data.payload}`,
              landmark: data.landmark,
              priority: 'SUCCESS',
              suggested_unit: data.unit_callsign,
              timestamp: new Date().toLocaleTimeString()
            });
            loadInitialData();
          }
          else if (type === 'MISSION_DISPATCHED' || type === 'MISSION_UPDATE') {
            playSound('dispatch');
            loadInitialData();
          }
          else if (type === 'OVERRIDE_EXECUTED' || type === 'DEMO_RESET') {
            loadInitialData();
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Retry connection in 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error, will reconnect:', err);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [loadInitialData]);

  // Periodic polling fallback (every 5 seconds) to ensure missions and victims stay fresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMissions().then(setMissions).catch(() => {});
      fetchVictims().then(setVictims).catch(() => {});
      fetchLogs(30).then(setLogs).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = () => setActiveAlert(null);

  return (
    <WebSocketContext.Provider
      value={{
        units,
        missions,
        victims,
        hazards,
        logs,
        isConnected,
        activeAlert,
        dismissAlert,
        demoActive,
        demoStep,
        selectedUnit,
        setSelectedUnit,
        refreshData: loadInitialData
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
