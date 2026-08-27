import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Phone, 
  PhoneOff, 
  Volume2, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  CloudSun, 
  TrendingUp, 
  HelpCircle, 
  RotateCcw,
  Signal,
  Battery,
  Wifi,
  MessageSquare,
  Hash,
  X,
  VolumeX,
  Radio
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../translations';
import { cn } from '../lib/utils';

interface MessageLog {
  id: string;
  type: 'sent' | 'received';
  text: string;
  time: string;
  isWeather?: boolean;
  isPrice?: boolean;
}

interface FeaturePhoneProps {
  language: Language;
  location?: string;
  onClose?: () => void;
}

const QUICK_CHIPS = [
  { label: "🌦 Weather Harare", text: "WEATHER HARARE" },
  { label: "🌽 Maize Price", text: "PRICE MAIZE" },
  { label: "🍅 Tomato Price", text: "PRICE TOMATOES" },
  { label: "🐛 Armyworm Fix", text: "How to treat fall armyworm without chemicals?" },
  { label: "🌱 Pfumvudza Guide", text: "What are the exact pfumvudza basin dimensions?" },
  { label: "🍂 Yellow Leaves", text: "Why are my maize leaves turning yellow?" },
  { label: "❓ SMS Help", text: "HELP" }
];

export function FeaturePhoneSimulatorView({ language, location = "Harare, Zimbabwe", onClose }: FeaturePhoneProps) {
  const t = TRANSLATIONS[language];
  const [activeMode, setActiveMode] = useState<'sms' | 'ussd'>('sms');
  const [smsQuery, setSmsQuery] = useState('');
  const [smsLogs, setSmsLogs] = useState<MessageLog[]>([
    {
      id: 'init-1',
      type: 'received',
      text: "AgriSmart SMS: Welcome! Text 'WEATHER [City]' for live conditions, 'PRICE [Crop]' for market prices, or text any farming issue for advice. Dial *143# for USSD.",
      time: '08:00'
    }
  ]);
  const [loadingSMS, setLoadingSMS] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // USSD State
  const [ussdSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [ussdScreenText, setUssdScreenText] = useState<string | null>(null);
  const [ussdInput, setUssdInput] = useState('');
  const [ussdDialedCode, setUssdDialedCode] = useState('*143#');
  const [ussdActive, setUssdActive] = useState(false);
  const [loadingUSSD, setLoadingUSSD] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeMode === 'sms') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [smsLogs, activeMode]);

  // Audio click helper
  const playKeyTone = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // SMS Sending Handler
  const handleSendSMS = async (textToSend?: string) => {
    const query = (textToSend || smsQuery).trim();
    if (!query || loadingSMS) return;

    const timeStr = currentTime;
    const userMsg: MessageLog = {
      id: 'msg_' + Date.now(),
      type: 'sent',
      text: query,
      time: timeStr
    };

    setSmsLogs(prev => [...prev, userMsg]);
    if (!textToSend) setSmsQuery('');
    setLoadingSMS(true);

    try {
      const res = await fetch('/api/sms-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          language,
          location
        })
      });

      if (!res.ok) throw new Error('SMS service error');
      const data = await res.json();

      const botReply: MessageLog = {
        id: 'reply_' + Date.now(),
        type: 'received',
        text: data.reply || "AgriSmart: Message processed.",
        time: currentTime,
        isWeather: data.isLiveWeather,
        isPrice: data.isMarketPrice
      };
      setSmsLogs(prev => [...prev, botReply]);
    } catch (err) {
      setSmsLogs(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          type: 'received',
          text: "AgriSmart: Maize leaves turning yellow? Possible Nitrogen deficiency. Apply Ammonium Nitrate (50kg/ha) or cattle manure tea. Dial *143# for live menu.",
          time: currentTime
        }
      ]);
    } finally {
      setLoadingSMS(false);
    }
  };

  // USSD Execution Handler
  const handleDialUSSD = async (codeToDial = '*143#') => {
    setLoadingUSSD(true);
    setUssdActive(true);
    setIsSessionEnded(false);
    setUssdInput('');

    try {
      const res = await fetch('/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ussdSessionId,
          text: codeToDial
        })
      });
      const responseText = await res.text();
      
      const isEnd = responseText.startsWith('END');
      setIsSessionEnded(isEnd);
      setUssdScreenText(responseText.replace(/^(CON|END)\s*/, ''));
    } catch (err) {
      setUssdScreenText("AgriSmart USSD:\nService temporarily unreachable. Please retry dial *143#.");
      setIsSessionEnded(true);
    } finally {
      setLoadingUSSD(false);
    }
  };

  const handleSendUSSDReply = async () => {
    if (!ussdInput.trim() || loadingUSSD) return;
    setLoadingUSSD(true);
    const sent = ussdInput.trim();
    setUssdInput('');

    try {
      const res = await fetch('/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ussdSessionId,
          text: sent
        })
      });
      const responseText = await res.text();
      const isEnd = responseText.startsWith('END');
      setIsSessionEnded(isEnd);
      setUssdScreenText(responseText.replace(/^(CON|END)\s*/, ''));
    } catch (err) {
      setUssdScreenText("AgriSmart: Error processing selection.");
      setIsSessionEnded(true);
    } finally {
      setLoadingUSSD(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    playKeyTone();
    if (activeMode === 'ussd' && ussdActive && !isSessionEnded) {
      setUssdInput(prev => prev + val);
    } else if (activeMode === 'ussd' && !ussdActive) {
      setUssdDialedCode(prev => (prev === '*143#' ? val : prev + val));
    } else {
      setSmsQuery(prev => prev + val);
    }
  };

  const handleSpeak = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
      {/* LEFT: Physical Feature Phone Simulator */}
      <div className="w-[320px] sm:w-[350px] bg-gradient-to-b from-slate-800 via-slate-900 to-black p-4 rounded-[48px] shadow-2xl border-4 border-slate-700/80 flex flex-col relative select-none">
        {/* Speaker grille */}
        <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-3" />

        {/* Screen Bezel & LCD Panel */}
        <div className="bg-[#121c16] rounded-3xl p-3 border-2 border-slate-700/60 shadow-inner flex flex-col h-[380px] overflow-hidden text-emerald-300 font-mono relative">
          
          {/* Top Status Bar */}
          <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-emerald-500/20 text-emerald-400 font-sans">
            <div className="flex items-center gap-1.5">
              <Signal size={12} />
              <span className="font-bold tracking-tight text-[10px]">AgriSmart 4G</span>
            </div>
            <div className="font-mono text-[11px]">{currentTime}</div>
            <div className="flex items-center gap-1">
              <Battery size={13} className="text-emerald-400" />
            </div>
          </div>

          {/* Mode Switcher Tabs on LCD */}
          <div className="grid grid-cols-2 gap-1 my-2 p-0.5 bg-emerald-950/60 rounded-xl border border-emerald-500/20 font-sans text-xs">
            <button
              onClick={() => { playKeyTone(); setActiveMode('sms'); }}
              className={cn(
                "py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1",
                activeMode === 'sms' 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-emerald-400/70 hover:text-emerald-300"
              )}
            >
              <MessageSquare size={13} />
              <span>SMS ({smsLogs.length})</span>
            </button>
            <button
              onClick={() => { playKeyTone(); setActiveMode('ussd'); }}
              className={cn(
                "py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1",
                activeMode === 'ussd' 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-emerald-400/70 hover:text-emerald-300"
              )}
            >
              <Hash size={13} />
              <span>USSD *143#</span>
            </button>
          </div>

          {/* LCD CONTENT AREA: SMS MODE */}
          {activeMode === 'sms' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden font-sans text-xs">
              {/* Message History */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                <div className="text-[10px] text-center text-emerald-400/60 py-1 border-b border-emerald-500/10">
                  GSM Text Message Service • Low-Bandwidth Mode
                </div>

                {smsLogs.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[88%] rounded-xl p-2.5 shadow-xs relative group",
                      msg.type === 'sent'
                        ? "ml-auto bg-emerald-600 text-white rounded-br-none"
                        : "mr-auto bg-emerald-950/90 text-emerald-100 border border-emerald-500/30 rounded-bl-none"
                    )}
                  >
                    <div className="leading-relaxed break-words text-[11px]">
                      {msg.text}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] opacity-70">
                      <span>{msg.time}</span>
                      {msg.type === 'received' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleSpeak(msg.text, msg.id)}
                            className="p-0.5 hover:text-emerald-300"
                            title="Read SMS aloud"
                          >
                            <Volume2 size={11} className={speakingId === msg.id ? "text-amber-300 animate-pulse" : ""} />
                          </button>
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="p-0.5 hover:text-emerald-300"
                            title="Copy SMS text"
                          >
                            {copiedId === msg.id ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loadingSMS && (
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse p-1">
                    <Radio size={12} className="animate-spin" />
                    <span>Transmitting over GSM cellular network...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Character count & input bar */}
              <div className="pt-2 border-t border-emerald-500/20">
                <div className="flex items-center justify-between text-[9px] text-emerald-400/80 mb-1 px-1">
                  <span>{smsQuery.length}/160 Chars</span>
                  <span>{Math.ceil((smsQuery.length || 1) / 160)} SMS</span>
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={smsQuery}
                    onChange={(e) => setSmsQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendSMS()}
                    placeholder="Type SMS..."
                    className="flex-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-400 placeholder:text-emerald-700"
                  />
                  <button
                    onClick={() => handleSendSMS()}
                    disabled={!smsQuery.trim() || loadingSMS}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-1.5 rounded-lg transition-all active:scale-95"
                    title="Send SMS"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LCD CONTENT AREA: USSD MODE */}
          {activeMode === 'ussd' && (
            <div className="flex-1 flex flex-col justify-between font-sans text-xs">
              {!ussdActive ? (
                /* USSD Dialing Screen */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="p-3 bg-emerald-900/40 rounded-full border border-emerald-500/30 text-emerald-300">
                    <Phone size={24} />
                  </div>
                  <div>
                    <div className="text-base font-mono font-bold tracking-widest text-emerald-300">
                      {ussdDialedCode}
                    </div>
                    <div className="text-[10px] text-emerald-400/70 mt-1">
                      AgriSmart Interactive Farmer Service
                    </div>
                  </div>
                  <button
                    onClick={() => handleDialUSSD(ussdDialedCode)}
                    disabled={loadingUSSD}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Phone size={15} />
                    <span>{loadingUSSD ? "Connecting..." : "Dial *143#"}</span>
                  </button>
                </div>
              ) : (
                /* Interactive USSD Dialog Modal */
                <div className="flex-1 flex flex-col justify-between bg-emerald-950/95 border border-emerald-500/40 rounded-2xl p-3 shadow-lg">
                  {/* Dialog Header */}
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span>USSD Session</span>
                    <button
                      onClick={() => { playKeyTone(); setUssdActive(false); setUssdScreenText(null); }}
                      className="text-emerald-400 hover:text-emerald-200"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Menu text */}
                  <div className="flex-1 overflow-y-auto py-2 font-mono text-[11px] leading-relaxed whitespace-pre-line text-emerald-200 scrollbar-thin">
                    {loadingUSSD ? "Transmitting request to base station..." : ussdScreenText}
                  </div>

                  {/* Input / Control Footer */}
                  <div className="pt-2 border-t border-emerald-500/20">
                    {!isSessionEnded ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={ussdInput}
                            onChange={(e) => setUssdInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendUSSDReply()}
                            placeholder="Enter option..."
                            className="flex-1 bg-emerald-900/60 border border-emerald-500/50 text-emerald-100 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-300"
                          />
                          <button
                            onClick={handleSendUSSDReply}
                            disabled={!ussdInput.trim() || loadingUSSD}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
                          >
                            Send
                          </button>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <button
                            onClick={() => { playKeyTone(); setUssdActive(false); }}
                            className="text-rose-400 hover:underline"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDialUSSD('*143#')}
                            className="text-emerald-400 hover:underline"
                          >
                            0. Main Menu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDialUSSD('*143#')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Redial *143#
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PHYSICAL KEYPAD */}
        <div className="mt-4 space-y-2.5 px-2">
          {/* Top Soft Action Keys */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                playKeyTone();
                if (activeMode === 'sms') handleSendSMS();
                else if (ussdActive) handleSendUSSDReply();
                else handleDialUSSD(ussdDialedCode);
              }}
              className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
              title="Call / Send (Green Key)"
            >
              <Phone size={15} />
            </button>
            <button
              onClick={() => {
                playKeyTone();
                setActiveMode(prev => prev === 'sms' ? 'ussd' : 'sms');
              }}
              className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center shadow-md active:scale-95"
            >
              Mode
            </button>
            <button
              onClick={() => {
                playKeyTone();
                if (activeMode === 'ussd') {
                  setUssdActive(false);
                  setUssdScreenText(null);
                } else {
                  setSmsQuery('');
                }
              }}
              className="py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
              title="End / Clear (Red Key)"
            >
              <PhoneOff size={15} />
            </button>
          </div>

          {/* 3x4 Numeric Matrix */}
          <div className="grid grid-cols-3 gap-2 text-white font-sans">
            {[
              { num: '1', sub: '.,' },
              { num: '2', sub: 'ABC' },
              { num: '3', sub: 'DEF' },
              { num: '4', sub: 'GHI' },
              { num: '5', sub: 'JKL' },
              { num: '6', sub: 'MNO' },
              { num: '7', sub: 'PQRS' },
              { num: '8', sub: 'TUV' },
              { num: '9', sub: 'WXYZ' },
              { num: '*', sub: '+' },
              { num: '0', sub: '␣' },
              { num: '#', sub: '⇧' }
            ].map((k) => (
              <button
                key={k.num}
                onClick={() => handleKeypadPress(k.num)}
                className="bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-800 text-slate-100 py-2.5 rounded-xl border border-slate-700 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95"
              >
                <span className="text-base font-bold leading-none">{k.num}</span>
                <span className="text-[8px] text-slate-400 font-medium tracking-wider">{k.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Quick Reference & Instructions Panel */}
      <div className="flex-1 max-w-md bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              <Sparkles size={13} className="text-amber-600" />
              GSM & 2G/3G Cellular Engine
            </span>
            {onClose && (
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">
            Low-Bandwidth SMS & USSD Service
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Ensures complete agricultural advisory accessibility for smallholder farmers using basic feature phones (Nokia, KaiOS) without requiring internet or smartphones.
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>One-Tap SMS Inquiries</span>
            <span className="text-[10px] text-emerald-600 font-medium">Auto-populates phone</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  playKeyTone();
                  setActiveMode('sms');
                  setSmsQuery(chip.text);
                  handleSendSMS(chip.text);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 transition-all text-slate-700 flex items-center gap-1 active:scale-95"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* USSD Menu Reference Guide */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2.5 text-xs text-slate-700">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Hash size={14} className="text-emerald-600" />
            <span>Interactive USSD Code Directory (*143#)</span>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-600 font-mono">
            <li>• <strong>*143*1#</strong> : Regional Live Weather & Rain Alerts</li>
            <li>• <strong>*143*2#</strong> : Wholesale Spot Commodity Prices</li>
            <li>• <strong>*143*3#</strong> : Fall Armyworm & Pest Solutions</li>
            <li>• <strong>*143*4#</strong> : Pfumvudza Planting Dimensions</li>
            <li>• <strong>*143*6#</strong> : Switch to Shona / Ndebele / Swahili</li>
          </ul>
        </div>

        {/* Clean History Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setSmsLogs([
              {
                id: 'init-fresh',
                type: 'received',
                text: "AgriSmart SMS: Message logs cleared. Text any farming query or text HELP.",
                time: currentTime
              }
            ])}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear SMS History</span>
          </button>

          <span className="text-[10px] text-slate-400">
            Carrier: netone / econet / safaricom
          </span>
        </div>
      </div>
    </div>
  );
}
