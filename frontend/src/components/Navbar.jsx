import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { runDemoScenario, resetDemoState } from '../utils/api';
import { playSound } from '../utils/audio';
import { 
  Radio, 
  ShieldAlert, 
  Activity, 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  ChevronDown, 
  PlusCircle, 
  MapPin, 
  Send,
  X,
  Compass,
  FileBarChart2,
  Users
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenIntake, onQuickDispatch, onOpenLogin }) {
  const { currentUser, switchRole, DEMO_USERS } = useAuth();
  const { isConnected, activeAlert, dismissAlert, demoActive, demoStep, refreshData } = useWebSocket();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isDemoTriggering, setIsDemoTriggering] = useState(false);

  const handleRunDemo = async () => {
    try {
      setIsDemoTriggering(true);
      playSound('dispatch');
      await runDemoScenario();
    } catch (err) {
      console.error('Demo trigger error:', err);
    } finally {
      setIsDemoTriggering(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      playSound('click');
      await resetDemoState();
      refreshData();
    } catch (err) {
      console.error('Demo reset error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-ops-panel/95 backdrop-blur border-b border-ops-border shadow-xl">
      {/* Top Tactical Command Strip */}
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Branding & Connection */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30 border border-red-400/30">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-ops-panel ${isConnected ? 'bg-emerald-500 shadow-emerald-500/80' : 'bg-amber-500'} shadow-sm`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider text-lg text-white">RAKSHA<span className="text-cyan-400">BOT</span></span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-wide rounded bg-red-950/80 border border-red-600/40 text-red-300 font-semibold uppercase">NDRF C2</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-blue-950/70 border border-blue-600/30 text-blue-300">SIH 2024</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">Autonomous Drone & UGV Coordinated Disaster Response</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-700/60 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
              <span className="font-mono text-[11px]">{isConnected ? 'TELEMETRY LIVE (1Hz)' : 'CONNECTING...'}</span>
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800 shadow-inner">
          <button
            onClick={() => { playSound('click'); setActiveTab('dashboard'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Command Dashboard
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('victims'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'victims' 
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Victim Tracker
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('comms'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'comms' 
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Audio Intercom
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('analytics'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'analytics' 
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileBarChart2 className="w-3.5 h-3.5" />
            Logs & Analytics
          </button>
        </nav>

        {/* Right: Actions & Demo Runner & Role Selector */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Emergency Intake Button */}
          <button
            onClick={() => { playSound('click'); onOpenIntake(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-red-950/40 border border-red-400/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report Alert</span>
          </button>

          {/* Demo Scenario Button */}
          <button
            onClick={handleRunDemo}
            disabled={demoActive || isDemoTriggering}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-md border ${
              demoActive 
                ? 'bg-amber-600/90 text-white border-amber-400/50 animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 active:scale-95'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${demoActive ? 'animate-spin' : ''}`} />
            <span>{demoActive ? 'Demo Active' : 'Run Demo Scenario'}</span>
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            title="Reset simulation to initial state"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Role-Based Demo User Selector */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-left transition"
            >
              <span className="text-base leading-none">{currentUser.avatar}</span>
              <div className="hidden xl:block">
                <div className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-cyan-400 font-mono leading-none">{currentUser.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Role Dropdown Menu */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg bg-ops-card border border-ops-border shadow-2xl z-50 p-1.5">
                <div className="px-3 py-2 border-b border-slate-700/80 mb-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Persona (Demo)</div>
                  <div className="text-xs text-slate-300">Simulate different user permissions</div>
                </div>
                {Object.entries(DEMO_USERS).map(([key, user]) => (
                  <button
                    key={key}
                    onClick={() => {
                      playSound('click');
                      switchRole(key);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-md text-left transition ${
                      currentUser.role === user.role ? 'bg-cyan-950/70 border border-cyan-700/40 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-lg">{user.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">{user.name}</span>
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-cyan-400">{user.role}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{user.title}</p>
                    </div>
                  </button>
                ))}
                <div className="pt-2 mt-1 border-t border-slate-700/80">
                  <button
                    onClick={() => {
                      playSound('click');
                      setRoleDropdownOpen(false);
                      if (onOpenLogin) onOpenLogin();
                    }}
                    className="w-full py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Role Portal / Switch Login</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Scenario Step Banner (when running) */}
      {demoActive && (
        <div className="bg-amber-950/90 border-t border-b border-amber-600/60 px-4 py-1.5 flex items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono font-bold tracking-wide text-amber-400 uppercase">SIH DEMO ACTIVE:</span>
            <span className="font-medium text-slate-100">{demoStep || 'Orchestrating multi-unit rescue sequence...'}</span>
          </div>
          <span className="font-mono text-[11px] text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/40">
            AUTO-PILOT SIMULATION
          </span>
        </div>
      )}

      {/* Real-Time Emergency Alert Banner */}
      {activeAlert && (
        <div className={`px-4 py-2 border-b flex items-center justify-between gap-3 transition-all ${
          activeAlert.priority === 'CRITICAL' || activeAlert.type === 'CRITICAL_EMERGENCY'
            ? 'bg-red-950/95 border-red-600 text-red-100'
            : activeAlert.priority === 'SUCCESS' || activeAlert.type === 'SUCCESS_DELIVERY'
            ? 'bg-emerald-950/90 border-emerald-600 text-emerald-100'
            : 'bg-amber-950/90 border-amber-600 text-amber-100'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1 rounded bg-black/30">
              {activeAlert.priority === 'SUCCESS' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">{activeAlert.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10">{activeAlert.timestamp}</span>
              </div>
              <p className="text-xs text-slate-200 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{activeAlert.landmark}</span>
                {activeAlert.suggested_unit && (
                  <span className="text-cyan-300 font-mono ml-2">Recommended: {activeAlert.suggested_unit} ({activeAlert.suggested_payload})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAlert.suggested_unit && activeAlert.type !== 'SUCCESS_DELIVERY' && (
              <button
                onClick={() => {
                  playSound('dispatch');
                  onQuickDispatch(activeAlert);
                  dismissAlert();
                }}
                className="px-3 py-1 rounded bg-white text-slate-900 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1 shadow"
              >
                <Send className="w-3 h-3 text-red-600" />
                Instant Dispatch
              </button>
            )}
            <button
              onClick={dismissAlert}
              className="p-1 rounded hover:bg-black/30 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
