import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { playSound } from '../utils/audio';
import { 
  Radio, 
  ShieldAlert, 
  Send, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  ChevronRight,
  Zap,
  Activity,
  Award
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const { switchRole, DEMO_USERS, currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState('dispatcher');

  const handleSelectRole = (key) => {
    playSound('click');
    setSelectedRole(key);
  };

  const handleEnterDashboard = () => {
    playSound('dispatch');
    switchRole(selectedRole);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-ops-bg bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative selection:bg-cyan-500 selection:text-black">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-mono text-cyan-400 mb-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SMART INDIA HACKATHON 2024 &bull; LIVE DEMO</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-xl shadow-red-950/50 border border-red-400/40">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono font-extrabold tracking-wider text-white">
              RAKSHA<span className="text-cyan-400">BOT</span>
            </h1>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-medium">
            Autonomous Drone & Ground-Rover Coordinated Emergency Response System for Search, Rescue & Medical Golden-Hour Delivery
          </p>
        </div>

        {/* Role Selection Container */}
        <div className="bg-ops-panel/90 backdrop-blur border border-ops-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Select Tactical C2 Role</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                  Role-Based Access
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates authorized user personas with specific emergency command permissions
              </p>
            </div>
            <div className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Telemetry Engine: Ready (1Hz)</span>
            </div>
          </div>

          {/* 3 Interactive Persona Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(DEMO_USERS).map(([key, user]) => {
              const isSelected = selectedRole === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelectRole(key)}
                  className={`cursor-pointer rounded-xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-xl shadow-cyan-950/60 ring-1 ring-cyan-400'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-mono font-bold rounded-full shadow">
                      ACTIVE SELECTION
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl p-2 rounded-lg bg-slate-800 border border-slate-700">{user.avatar}</span>
                      <span className="font-mono text-[10px] px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-cyan-400 font-bold">
                        {user.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{user.name}</h3>
                      <p className="text-xs font-mono text-cyan-400 font-semibold">{user.role}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{user.title}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1.5">Granted Clearance:</div>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {key === 'dispatcher' && (
                          <>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Emergency Alert Intake</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 1-Click Nearest Scramble</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Live Telemetry View</li>
                          </>
                        )}
                        {key === 'rescue_lead' && (
                          <>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Manual Flight Overrides</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Push-To-Talk Audio Comms</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Force Drop & Triage</li>
                          </>
                        )}
                        {key === 'admin' && (
                          <>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Autonomous Demo Orchestrator</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Full Telemetry Reset</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Analytics CSV Export</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3">
                    <span className={`block text-center text-xs font-mono font-bold py-1.5 rounded-lg border ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                        : 'text-slate-400 border-slate-800'
                    }`}>
                      {isSelected ? 'Ready to Deploy' : 'Click to Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 text-center sm:text-left font-medium">
              Logging into <span className="text-slate-200 font-bold">Kochi Periyar NDRF Sector 04 Command Hub</span>
            </div>

            <button
              onClick={handleEnterDashboard}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-mono font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-cyan-900/40 border border-cyan-400/40 transition"
            >
              <span>Launch Command Center</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SIH Capability Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="font-mono text-cyan-400 font-bold text-sm">3 Drones + 1 Rover</div>
            <div className="text-[11px] text-slate-400">Autonomous Fleet</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="font-mono text-emerald-400 font-bold text-sm">Real-Time WS</div>
            <div className="text-[11px] text-slate-400">1Hz Telemetry Feed</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="font-mono text-amber-400 font-bold text-sm">AI FLIR Detection</div>
            <div className="text-[11px] text-slate-400">92%+ Confidence</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <div className="font-mono text-red-400 font-bold text-sm">Push-To-Talk</div>
            <div className="text-[11px] text-slate-400">Two-Way Victim Intercom</div>
          </div>
        </div>
      </div>
    </div>
  );
}
