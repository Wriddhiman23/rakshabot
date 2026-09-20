import React, { createContext, useContext, useState } from 'react';

const DEMO_USERS = {
  dispatcher: {
    id: 'usr_disp_01',
    role: 'Dispatcher',
    name: 'Priya Sharma',
    title: 'Lead Emergency Dispatcher (Kerala NDRF)',
    badge: 'C2-DISPATCH',
    avatar: '👩‍💼',
    permissions: ['REPORT_EMERGENCY', 'DISPATCH_MISSION', 'BROADCAST_COMMS', 'VIEW_TELEMETRY']
  },
  rescue_lead: {
    id: 'usr_lead_02',
    role: 'Rescue Lead',
    name: 'Capt. Vikram Rathore',
    title: 'NDRF Field Rescue Commander',
    badge: 'TAC-COMMAND',
    avatar: '👨‍✈️',
    permissions: ['OVERRIDE_UNITS', 'RECALL_RTH', 'FORCE_DROP', 'TWO_WAY_COMMS', 'TRIAGE_VICTIMS']
  },
  admin: {
    id: 'usr_adm_03',
    role: 'Admin',
    name: 'Dr. Arvind Swaminathan',
    title: 'Operations Director (NDMA / SIH)',
    badge: 'OPS-DIRECTOR',
    avatar: '👨‍🔬',
    permissions: ['ALL_PERMISSIONS', 'RUN_DEMO', 'RESET_SYSTEM', 'EXPORT_ANALYTICS', 'OVERRIDE_UNITS']
  }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Default to Dispatcher or check localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('rakshabot_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.dispatcher;
  });

  const switchRole = (roleKey) => {
    const user = DEMO_USERS[roleKey] || DEMO_USERS.dispatcher;
    setCurrentUser(user);
    localStorage.setItem('rakshabot_user', JSON.stringify(user));
  };

  const hasPermission = (perm) => {
    if (!currentUser) return false;
    if (currentUser.permissions.includes('ALL_PERMISSIONS')) return true;
    return currentUser.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchRole, hasPermission, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
