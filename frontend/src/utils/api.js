const API_BASE = '/api';

export async function fetchUnits() {
  const res = await fetch(`${API_BASE}/units`);
  if (!res.ok) throw new Error('Failed to fetch units');
  return res.json();
}

export async function fetchMissions(status = null) {
  const url = status ? `${API_BASE}/missions?status=${status}` : `${API_BASE}/missions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch missions');
  return res.json();
}

export async function fetchVictims() {
  const res = await fetch(`${API_BASE}/victims`);
  if (!res.ok) throw new Error('Failed to fetch victims');
  return res.json();
}

export async function fetchHazards() {
  const res = await fetch(`${API_BASE}/hazards`);
  if (!res.ok) throw new Error('Failed to fetch hazards');
  return res.json();
}

export async function fetchLogs(limit = 50) {
  const res = await fetch(`${API_BASE}/logs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchComms(limit = 30) {
  const res = await fetch(`${API_BASE}/comms?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch comms');
  return res.json();
}

export async function sendCommsMessage(data) {
  const res = await fetch(`${API_BASE}/comms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to send comms message');
  return res.json();
}

export async function dispatchMission(data) {
  const res = await fetch(`${API_BASE}/missions/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to dispatch mission');
  }
  return res.json();
}

export async function overrideUnit(unitId, command, reason = '') {
  const res = await fetch(`${API_BASE}/units/${unitId}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, unit_id: unitId, reason })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to override unit');
  }
  return res.json();
}

export async function suggestNearestUnits(lat, lng, incidentType = 'cardiac') {
  const res = await fetch(`${API_BASE}/emergency/suggest-nearest?lat=${lat}&lng=${lng}&incident_type=${incidentType}`);
  if (!res.ok) throw new Error('Failed to get suggestions');
  return res.json();
}

export async function reportEmergency(data) {
  const res = await fetch(`${API_BASE}/emergency/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to report emergency');
  return res.json();
}

export async function updateVictimStatus(victimId, status) {
  const res = await fetch(`${API_BASE}/victims/${victimId}/status?status=${status}`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to update victim status');
  return res.json();
}

export async function runDemoScenario() {
  const res = await fetch(`${API_BASE}/demo/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger demo');
  return res.json();
}

export async function resetDemoState() {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}
