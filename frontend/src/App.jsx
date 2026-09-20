import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Navbar from './components/Navbar';
import MapDashboard from './components/MapDashboard';
import UnitSidePanel from './components/UnitSidePanel';
import CameraFeedTile from './components/CameraFeedTile';
import CommsIntercomPanel from './components/CommsIntercomPanel';
import VictimTrackerView from './components/VictimTrackerView';
import AnalyticsView from './components/AnalyticsView';
import EmergencyIntakeModal from './components/EmergencyIntakeModal';
import MissionDispatchModal from './components/MissionDispatchModal';
import LoginPage from './components/LoginPage';
import { playSound } from './utils/audio';
import { 
  Camera, 
  Radio, 
  X, 
  Minimize2, 
  Maximize2,
  PhoneCall,
  Video
} from 'lucide-react';

function MainApp() {
  const { currentUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'victims' | 'comms' | 'analytics'

  // Modals state
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [intakeInitialData, setIntakeInitialData] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchTargetData, setDispatchTargetData] = useState(null);

  // Live Camera Feed & Intercom Dock states
  const [activeCameraUnitId, setActiveCameraUnitId] = useState(1);
  const [showCameraDock, setShowCameraDock] = useState(true);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);

  const [activeCommsChannel, setActiveCommsChannel] = useState('GARUDA-01-LINK');
  const [showCommsFloating, setShowCommsFloating] = useState(false);

  // Callbacks
  const handleOpenIntake = (initialData = null) => {
    setIntakeInitialData(initialData);
    setIntakeModalOpen(true);
  };

  const handleQuickDispatch = (targetData = null) => {
    setDispatchTargetData(targetData);
    setDispatchModalOpen(true);
  };

  const handleSelectCameraUnit = (unitId) => {
    setActiveCameraUnitId(unitId);
    setShowCameraDock(true);
    setIsCameraMinimized(false);
  };

  const handleOpenCommsWithUnit = (callsign) => {
    const channelMap = {
      'Garuda-01': 'GARUDA-01-LINK',
      'Garuda-02': 'GARUDA-02-LINK',
      'Netra-01': 'NETRA-01-LINK',
      'Varun-01': 'VARUN-01-LINK',
    };
    setActiveCommsChannel(channelMap[callsign] || 'GARUDA-01-LINK');
    setShowCommsFloating(true);
  };

  // If user opened login portal
  if (showLoginModal) {
    return <LoginPage onLoginSuccess={() => setShowLoginModal(false)} />;
  }

  return (
    <div className="min-h-screen bg-ops-bg text-slate-100 flex flex-col font-sans select-none">
      {/* Top Tactical Command Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIntake={() => handleOpenIntake()}
        onQuickDispatch={handleQuickDispatch}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: Live Command Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 flex flex-col lg:flex-row w-full h-[calc(100vh-57px)] overflow-hidden relative">
            {/* Center / Left: Full Screen Interactive Tactical Map */}
            <div className="flex-1 relative h-full flex flex-col overflow-hidden">
              <MapDashboard
                onDispatchUnit={(unit) => handleQuickDispatch({ unit_id: unit.id, unit_callsign: unit.callsign })}
                onOpenCommsWithUnit={handleOpenCommsWithUnit}
                onSelectCameraUnit={handleSelectCameraUnit}
              />

              {/* Floating Quick Action Buttons on Map */}
              <div className="absolute top-14 left-3 z-[400] flex flex-col gap-2">
                <button
                  onClick={() => {
                    playSound('click');
                    setShowCameraDock(!showCameraDock);
                    if (!showCameraDock) setIsCameraMinimized(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl border backdrop-blur transition ${
                    showCameraDock
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-cyan-950/50'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showCameraDock ? 'Hide Video Feed' : 'Show Video Feed'}</span>
                </button>

                <button
                  onClick={() => {
                    playSound('click');
                    setShowCommsFloating(!showCommsFloating);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl border backdrop-blur transition ${
                    showCommsFloating
                      ? 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-amber-950/50'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showCommsFloating ? 'Hide Intercom' : 'Audio Intercom'}</span>
                </button>
              </div>

              {/* Floating PiP Live AI Camera Feed Overlay */}
              {showCameraDock && (
                <div
                  className={`absolute bottom-12 left-3 z-[400] transition-all duration-300 shadow-2xl rounded-xl border border-ops-border overflow-hidden bg-ops-card/95 backdrop-blur ${
                    isCameraMinimized ? 'w-64' : 'w-80 sm:w-96'
                  }`}
                >
                  {/* Overlay Header */}
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">AI CAM PIP STREAM</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsCameraMinimized(!isCameraMinimized)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                        title={isCameraMinimized ? 'Expand Video' : 'Minimize Video'}
                      >
                        {isCameraMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setShowCameraDock(false)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                        title="Close Video Dock"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Tile Body (hidden when minimized) */}
                  {!isCameraMinimized && (
                    <div className="p-1">
                      <CameraFeedTile
                        activeUnitId={activeCameraUnitId}
                        onSelectUnit={(id) => setActiveCameraUnitId(id)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Floating Two-Way Audio Intercom Modal / Drawer */}
              {showCommsFloating && (
                <div className="absolute top-14 right-3 z-[450] w-96 max-h-[85vh] bg-ops-panel/95 backdrop-blur border border-ops-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="font-mono font-bold text-xs uppercase text-slate-200">Two-Way Intercom</span>
                    </div>
                    <button
                      onClick={() => setShowCommsFloating(false)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2 overflow-y-auto max-h-[75vh] custom-scrollbar">
                    <CommsIntercomPanel initialChannel={activeCommsChannel} />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Tactical Fleet & Active Missions Side Panel */}
            <UnitSidePanel
              onSelectCameraUnit={handleSelectCameraUnit}
              onDispatchUnit={(unit) => handleQuickDispatch({ unit_id: unit.id, unit_callsign: unit.callsign })}
              onOpenCommsWithUnit={handleOpenCommsWithUnit}
            />
          </div>
        )}

        {/* TAB 2: Victim Tracker View */}
        {activeTab === 'victims' && (
          <VictimTrackerView
            onDispatchToVictim={(victim) => {
              handleQuickDispatch({
                victim_id: victim.id,
                landmark: victim.landmark,
                lat: victim.latitude,
                lng: victim.longitude,
                incident_type: victim.condition?.toLowerCase().includes('cardiac') ? 'cardiac' : 'trauma',
                priority: victim.priority
              });
            }}
            onOpenComms={(channel) => {
              setActiveCommsChannel(channel || 'GARUDA-01-LINK');
              setActiveTab('comms');
            }}
          />
        )}

        {/* TAB 3: Dedicated Two-Way Comms Intercom View */}
        {activeTab === 'comms' && (
          <CommsIntercomPanel initialChannel={activeCommsChannel} />
        )}

        {/* TAB 4: Logs & Analytics View */}
        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}
      </main>

      {/* Emergency Alert Intake Modal */}
      <EmergencyIntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        initialData={intakeInitialData}
        onSuccess={(victim) => {
          // Open dispatch modal for immediate scramble
          handleQuickDispatch({
            victim_id: victim.id,
            landmark: victim.landmark,
            lat: victim.latitude,
            lng: victim.longitude,
            incident_type: victim.condition?.toLowerCase().includes('cardiac') ? 'cardiac' : 'trauma',
            priority: victim.priority
          });
        }}
      />

      {/* Mission Dispatch Modal */}
      <MissionDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        targetData={dispatchTargetData}
        onSuccess={() => {
          // Switch to dashboard to watch drone flight
          setActiveTab('dashboard');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <MainApp />
      </WebSocketProvider>
    </AuthProvider>
  );
}
