import React, { useState, useEffect, useRef } from 'react';
import { fetchComms, sendCommsMessage } from '../utils/api';
import { playSound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { 
  Radio, 
  Mic, 
  Send, 
  Volume2, 
  Users, 
  CheckCircle2, 
  ShieldAlert, 
  MessageSquare, 
  Sparkles,
  Zap
} from 'lucide-react';

const PRESET_BROADCASTS = [
  "NDRF Drone overhead: Help is on the way, please stay calm and do not move.",
  "Emergency payload dropping in 10 seconds. Stand 3 meters clear of the marker.",
  "AED Unit Dropped: Open lid and follow automated audible defibrillator instructions.",
  "NDRF amphibious rescue boat arriving in 3 minutes. Wave if you can hear this."
];

export default function CommsIntercomPanel({ initialChannel }) {
  const { currentUser } = useAuth();
  const [comms, setComms] = useState([]);
  const [channel, setChannel] = useState(initialChannel || 'GARUDA-01-LINK');
  const [inputText, setInputText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchComms(40).then(setComms).catch(console.error);
    const interval = setInterval(() => {
      fetchComms(40).then(setComms).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialChannel) setChannel(initialChannel);
  }, [initialChannel]);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comms]);

  const handlePushToTalkStart = () => {
    playSound('radio_squelch');
    setIsTalking(true);
  };

  const handlePushToTalkEnd = async () => {
    setIsTalking(false);
    playSound('click');
    // Transmit spoken voice note
    try {
      const msg = await sendCommsMessage({
        channel: channel,
        sender: `${currentUser.name} (${currentUser.role})`,
        recipient: 'Victim / Ground Responders',
        message: 'Voice transmission transmitted via high-output directional drone speaker.',
        is_audio: true,
        is_from_drone: false
      });
      setComms(prev => [...prev, msg]);

      // Simulate acoustic return after 2.5s
      setTimeout(async () => {
        const reply = await sendCommsMessage({
          channel: channel,
          sender: 'Victim Ground Acoustic Return',
          recipient: 'Command Center',
          message: '[Acoustic Return] "We hear the drone siren! We are waving a white cloth!"',
          is_audio: true,
          is_from_drone: true
        });
        setComms(prev => [...prev, reply]);
        playSound('alert');
      }, 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendPreset = async (presetText) => {
    try {
      playSound('radio_squelch');
      const msg = await sendCommsMessage({
        channel: channel,
        sender: `${currentUser.name} (${currentUser.role})`,
        recipient: 'Victim / On-Site',
        message: presetText,
        is_audio: true,
        is_from_drone: false
      });
      setComms(prev => [...prev, msg]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCustomText = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setIsSending(true);
      playSound('dispatch');
      const msg = await sendCommsMessage({
        channel: channel,
        sender: `${currentUser.name} (${currentUser.role})`,
        recipient: 'Victim / Ground Responders',
        message: inputText,
        is_audio: false,
        is_from_drone: false
      });
      setComms(prev => [...prev, msg]);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full custom-scrollbar">
      {/* Panel Header */}
      <div className="p-4 bg-ops-panel border border-ops-border rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-base text-white">TWO-WAY DRONE AUDIO & LOUDSPEAKER INTERCOM</h2>
            <p className="text-xs text-slate-400">Direct Voice Broadcast & Acoustic Triage with On-Site Victims</p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Active Link:</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow"
          >
            <option value="GARUDA-01-LINK">GARUDA-01 (Medic Drone 120dB PA)</option>
            <option value="GARUDA-02-LINK">GARUDA-02 (Rapid Drone Speaker)</option>
            <option value="NETRA-01-LINK">NETRA-01 (FLIR Thermal Dual Mic)</option>
            <option value="VARUN-01-LINK">VARUN-01 (Amphibious Marine PA)</option>
            <option value="ALL-TACTICAL">ALL UNITS (Sector Broadcast)</option>
          </select>
        </div>
      </div>

      {/* Push-To-Talk Tactical Module */}
      <div className="p-6 bg-ops-card border border-ops-border rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
        {/* Glow ambient background when transmitting */}
        {isTalking && (
          <div className="absolute inset-0 bg-red-600/15 animate-pulse pointer-events-none" />
        )}

        <div className="space-y-1">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
            {isTalking ? '● TRANSMITTING LIVE AUDIO TO DRONE' : 'READY TO TRANSMIT'}
          </span>
          <div className="text-sm font-semibold text-slate-200">
            Push and hold to broadcast your voice directly through the drone's PA loudspeaker
          </div>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isTalking ? 'bg-red-500 animate-pulse shadow-red-500/50 shadow' : 'bg-slate-800'
              }`}
              style={{
                height: isTalking ? `${Math.max(15, Math.sin(i * 0.8 + Date.now() / 100) * 45 + 10)}%` : '20%'
              }}
            />
          ))}
        </div>

        {/* Big PTT Button */}
        <button
          onMouseDown={handlePushToTalkStart}
          onMouseUp={handlePushToTalkEnd}
          onTouchStart={handlePushToTalkStart}
          onTouchEnd={handlePushToTalkEnd}
          className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-2xl select-none ${
            isTalking
              ? 'bg-red-600 border-red-300 text-white shadow-red-600/60 scale-105'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-cyan-400 hover:border-cyan-400 shadow-black'
          }`}
        >
          <Mic className={`w-9 h-9 ${isTalking ? 'animate-bounce' : ''}`} />
          <span className="text-[10px] font-mono font-bold mt-1 tracking-wider uppercase">
            {isTalking ? 'TALKING' : 'HOLD TO TALK'}
          </span>
        </button>

        <span className="text-[11px] font-mono text-slate-500">
          Encrypted 2.4 GHz digital audio stream • RTK Audio Latency: 42ms
        </span>
      </div>

      {/* Quick Tactical Preset Broadcasts */}
      <div className="space-y-2">
        <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          One-Touch Drone Voice Broadcast Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_BROADCASTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPreset(preset)}
              className="p-3 rounded-xl bg-ops-card border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition text-left text-xs font-mono text-slate-300 flex items-start gap-2.5 shadow group"
            >
              <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
              <span>{preset}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Two-Way Message Log Transcript */}
      <div className="p-4 bg-ops-card border border-ops-border rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-xs uppercase text-slate-200">Live Acoustic & Radio Transcript</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{comms.length} Transmissions</span>
        </div>

        {/* Messages List */}
        <div
          ref={scrollRef}
          className="space-y-2.5 max-h-72 overflow-y-auto pr-1 font-mono text-xs custom-scrollbar"
        >
          {comms.map((msg) => {
            const isDroneMsg = msg.is_from_drone;
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  isDroneMsg 
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isDroneMsg ? 'bg-amber-600/30 text-amber-400' : 'bg-cyan-600/30 text-cyan-400'
                }`}>
                  {isDroneMsg ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{msg.sender}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{msg.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                    <span>Channel: {msg.channel}</span>
                    {msg.is_audio && <span className="text-cyan-400">● Spoken Audio Broadcast</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Text Transmitter */}
        <form onSubmit={handleSendCustomText} className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder="Type custom broadcast message to transmit to drone speaker..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
