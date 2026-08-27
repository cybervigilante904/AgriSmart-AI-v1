import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LocateFixed,
  Globe,
  Sprout, 
  Camera, 
  History, 
  MessageSquareText, 
  LayoutDashboard, 
  Settings, 
  CloudSun,
  ChevronRight,
  Mic,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  FlaskConical,
  ArrowLeft,
  X,
  Volume2,
  User,
  TrendingUp,
  Coins,
  Target,
  Smartphone,
  MessageSquare,
  Wifi,
  WifiOff,
  Cloud,
  RefreshCw,
  Activity,
  MapPin,
  RotateCw,
  Sparkles,
  ArrowRight,
  Search,
  ChevronDown,
  Check,
  Edit3,
  Navigation,
  Compass,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Eye,
  Layers,
  Wand2,
  Bell,
  BellRing,
  CloudRain,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { db, type Diagnosis, type FarmerProfile, type ScheduledAlert } from './db';
import { TRANSLATIONS, type Language } from './translations';
const CropRotationPlanner = lazy(() => import('./components/CropRotationPlanner').then(({CropRotationPlanner}) => ({default: CropRotationPlanner})));
const NotificationScheduler = lazy(() => import('./components/NotificationScheduler').then(({NotificationScheduler}) => ({default: NotificationScheduler})));
const FarmRecordsManager = lazy(() => import('./components/FarmRecordsManager').then(({FarmRecordsManager}) => ({default: FarmRecordsManager})));
const MarketPricesView = lazy(() => import('./components/MarketPricesView').then(({MarketPricesView}) => ({default: MarketPricesView})));
const WeatherForecastView = lazy(() => import('./components/WeatherForecastView').then(({WeatherForecastView}) => ({default: WeatherForecastView})));
const FeaturePhoneSimulatorView = lazy(() => import('./components/FeaturePhoneSimulatorView').then(({FeaturePhoneSimulatorView}) => ({default: FeaturePhoneSimulatorView})));
const CommunityView = lazy(() => import('./components/CommunityView').then(({CommunityView}) => ({default: CommunityView})));
import { exportDiagnosesToCSV } from './csvExport';
import { 
  runLocalNotificationScheduler, 
  evaluatePlantingWindows, 
  evaluateHeavyRainfallWarnings,
  playNotificationTone 
} from './notificationScheduler';
import { AGRICULTURAL_IMAGES, findMatchingAgriImages, isImageRequest, type AgriImage } from '../../shared/agriculturalImages';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Area, 
  Bar, 
  ComposedChart, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini only when a key is configured so the offline UI can still load.
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// cn utility
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [language, setLanguage] = useState<Language | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'history' | 'chat' | 'records' | 'market' | 'soil' | 'community' | 'weather' | 'sms' | 'scheduler'>('dashboard');
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  // Background scheduler sync on profile or load
  useEffect(() => {
    const syncAlerts = async () => {
      try {
        if (profile) {
          await runLocalNotificationScheduler(profile);
        }
        const currentAlerts = await db.alerts.toArray();
        const unread = currentAlerts.filter(a => !a.isRead && !a.isActioned && (!a.snoozedUntil || a.snoozedUntil < Date.now()));
        setUnreadAlertsCount(unread.length);
      } catch (err) {
        console.warn("Scheduler background sync error:", err);
      }
    };
    
    syncAlerts();
    window.addEventListener('alerts-updated', syncAlerts);
    const interval = setInterval(syncAlerts, 60000);

    return () => {
      window.removeEventListener('alerts-updated', syncAlerts);
      clearInterval(interval);
    };
  }, [profile?.country, profile?.region, profile?.mainCrops]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);

    try {
      const unsyncedDiagnoses = (await db.diagnoses.toArray()).filter(d => !d.synced);
      const unsyncedRecords = (await db.records.toArray()).filter(r => !r.synced);
      
      if (unsyncedDiagnoses.length === 0 && unsyncedRecords.length === 0) {
        setIsSyncing(false);
        return;
      }

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnoses: unsyncedDiagnoses,
          records: unsyncedRecords,
          profile
        })
      });

      if (response.ok) {
        // Mark as synced in local DB
        const diagIds = unsyncedDiagnoses.map(d => d.id).filter((id): id is number => id !== undefined);
        const recordIds = unsyncedRecords.map(r => r.id).filter((id): id is number => id !== undefined);

        await db.diagnoses.bulkUpdate(diagIds.map(id => ({ key: id, changes: { synced: true } })));
        await db.records.bulkUpdate(recordIds.map(id => ({ key: id, changes: { synced: true } })));
        
        window.dispatchEvent(new CustomEvent('db-synced'));
        console.log("Sync complete!");
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    (window as any).performSync = performSync;
    if (isOnline) {
      performSync();
    }
  }, [isOnline]);

  useEffect(() => {
    async function init() {
      try {
        const savedProfile = await db.profiles.toCollection().first();
        if (savedProfile) {
          setProfile(savedProfile);
          // We don't auto-set language to force the "Language First" step as requested
        }
      } catch (err) {
        console.error("DB Init Error:", err);
      } finally {
        // Show splash for at least 1.5s for branding
        setTimeout(() => {
          setShowSplash(false);
          setLoading(false);
        }, 1500);
      }
    }
    init();

    // Suppress benign Vite WebSocket errors from disrupting the UI
    const handleRejection = (event: PromiseRejectionEvent) => {
      const isBenign = (reason: any) => {
        if (!reason) return false;
        const msg = (reason.message || String(reason)).toLowerCase();
        return msg.includes('websocket') || 
               msg.includes('vite') || 
               msg.includes('hmr') || 
               msg.includes('connection refused');
      };

      if (isBenign(event.reason)) {
        event.preventDefault();
        // Silently consume these - they are artifacts of the dev proxy
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleSetLanguage = async (lang: Language) => {
    if (profile) {
      const updatedProfile = { ...profile, language: lang };
      await db.profiles.update(profile.id!, { language: lang });
      setProfile(updatedProfile);
    } else {
      const newProfile: FarmerProfile = { name: "Farmer", language: lang, region: "", country: "", mainCrops: [] };
      const id = await db.profiles.add(newProfile);
      setProfile({ ...newProfile, id });
    }
    setLanguage(lang);
  };

  const handleSetLocation = async (country: string, region: string, gps?: { lat: number, lng: number }) => {
    if (profile) {
      const updatedProfile = { ...profile, country, region, gpsLocation: gps };
      await db.profiles.update(profile.id!, { country, region, gpsLocation: gps });
      setProfile(updatedProfile);
    }
  };

  if (showSplash || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-natural-primary text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-natural-accent shadow-2xl">
            <Sprout size={56} className="text-natural-primary" />
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tighter">AgriSmart AI</h1>
          <p className="mt-4 text-natural-gold font-medium tracking-[0.3em] uppercase text-[10px]">Harvesting Intelligence</p>
        </motion.div>
        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-natural-accent/40" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Loading local data...</p>
        </div>
      </div>
    );
  }

  if (!language) {
    return <LanguageSelector onSelect={handleSetLanguage} />;
  }

  if (!profile?.country) {
    return <LocationSelector language={language} onComplete={handleSetLocation} />;
  }

  const t = TRANSLATIONS[language];

  return (
    <div className="flex h-screen flex-col bg-natural-bg font-sans text-natural-text">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-natural-accent/10 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-natural-primary text-white shadow-sm">
            <Sprout size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-natural-primary">AgriSmart AI</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Location Badge / Action Button */}
          <button 
            id="header-location-badge"
            onClick={() => setShowLocationModal(true)} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-natural-tan/70 hover:bg-natural-tan text-natural-primary border border-natural-accent/20 transition-all text-xs font-semibold max-w-[150px] sm:max-w-[170px] truncate shadow-sm active:scale-95 group"
            title="Choose or change farming location"
          >
            <MapPin size={13} className="text-natural-gold shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">{profile?.region || profile?.country || t.chooseLocation}</span>
            <ChevronDown size={12} className="text-natural-accent shrink-0 opacity-70" />
          </button>

          {/* Local Warnings & Notification Scheduler Button */}
          <button
            id="header-notifications-btn"
            onClick={() => setActiveTab('scheduler')}
            className={cn(
              "relative rounded-full p-2 transition-colors border",
              activeTab === 'scheduler' 
                ? "bg-natural-primary text-white border-natural-primary shadow-sm" 
                : "hover:bg-natural-bg text-natural-accent hover:text-natural-primary border-natural-accent/15 bg-white"
            )}
            title={t.notificationScheduler || "Notification Scheduler"}
          >
            {unreadAlertsCount > 0 ? (
              <BellRing size={19} className="text-natural-gold animate-bounce" />
            ) : (
              <Bell size={19} />
            )}
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button 
            id="header-settings-btn"
            onClick={() => setShowSettingsModal(true)} 
            className="rounded-full p-2 hover:bg-natural-bg text-natural-accent hover:text-natural-primary transition-colors border border-natural-accent/15 bg-white"
            title="Settings & Preferences"
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {/* Global Sync/Status Indicator */}
        <div className="fixed top-16 right-4 z-10 flex items-center gap-2 pointer-events-auto">
          <button 
            id="sync-status-btn"
            onClick={performSync}
            disabled={!isOnline || isSyncing}
            className={cn(
              "p-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2 px-3 shadow-md",
              isOnline ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200" : "bg-red-500/10 text-red-600 border border-red-200"
            )}
          >
            {isSyncing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : isOnline ? (
              <Wifi size={14} />
            ) : (
              <WifiOff size={14} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isSyncing ? "Syncing" : isOnline ? "Online" : "Offline"}
            </span>
          </button>
        </div>

        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-natural-primary">Loading...</div>}>
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              key="dashboard" 
              language={language} 
              profile={profile}
              onNavigate={(tab: any) => setActiveTab(tab)} 
              onOpenLocationModal={() => setShowLocationModal(true)}
            />
          )}
          {activeTab === 'scanner' && <Scanner key="scanner" language={language} />}
          {activeTab === 'history' && <DiagnosisHistory key="history" language={language} profile={profile} />}
          {activeTab === 'chat' && <AgriChat key="chat" language={language} profile={profile} />}
          {activeTab === 'records' && (
            <FarmRecordsManager 
              key="records" 
              language={language} 
              profile={profile}
            />
          )}
          {activeTab === 'market' && (
            <MarketPricesView 
              key="market" 
              language={language} 
              profile={profile}
              onOpenLocationModal={() => setShowLocationModal(true)}
            />
          )}
          {activeTab === 'soil' && <SoilIntelligence key="soil" language={language} />}
          {activeTab === 'sms' && (
            <FeaturePhoneSimulatorView 
              key="sms" 
              language={language} 
              location={profile?.region || profile?.country || 'Harare'} 
            />
          )}
          {activeTab === 'community' && (
            <CommunityView 
              key="community" 
              language={language} 
              profile={profile} 
            />
          )}
          {activeTab === 'weather' && (
            <WeatherForecastView 
              key="weather" 
              language={language} 
              location={profile?.region || profile?.country || 'Harare'} 
              onLocationChange={() => setShowLocationModal(true)}
            />
          )}
          {activeTab === 'scheduler' && (
            <NotificationScheduler 
              key="scheduler"
              language={language}
              profile={profile}
              onOpenLocationModal={() => setShowLocationModal(true)}
              onNavigateToRecords={() => setActiveTab('records')}
            />
          )}
          </AnimatePresence>
        </Suspense>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-around py-2 px-4 min-w-[550px]">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={22} />} label={t.dashboard} />
          <NavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<Camera size={22} />} label={t.scan} />
          <NavButton 
            active={activeTab === 'scheduler'} 
            onClick={() => setActiveTab('scheduler')} 
            icon={
              <div className="relative">
                <Bell size={22} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white animate-ping" />
                )}
              </div>
            } 
            label={t.notificationScheduler ? t.notificationScheduler.split(' ')[0] : "Alerts"} 
          />
          <NavButton active={activeTab === 'records'} onClick={() => setActiveTab('records')} icon={<History size={22} />} label={t.records} />
          <NavButton active={activeTab === 'soil'} onClick={() => setActiveTab('soil')} icon={<Sprout size={22} />} label={t.soil} />
          <NavButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<Coins size={22} />} label={t.market} />
          <NavButton active={activeTab === 'sms'} onClick={() => setActiveTab('sms')} icon={<Smartphone size={22} />} label="SMS/USSD" />
          <NavButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} icon={<MessageSquareText size={22} />} label={t.community} />
          <NavButton active={activeTab === 'weather'} onClick={() => setActiveTab('weather')} icon={<CloudSun size={22} />} label={t.weather} />
          <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={22} />} label={t.chat} />
        </div>
      </nav>

      {/* Location Selector Modal */}
      {showLocationModal && (
        <LocationSelector 
          language={language} 
          currentCountry={profile?.country}
          currentRegion={profile?.region}
          isModal={true}
          onClose={() => setShowLocationModal(false)}
          onComplete={(country, region, gps) => {
            handleSetLocation(country, region, gps);
            setShowLocationModal(false);
          }} 
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          language={language}
          profile={profile}
          onClose={() => setShowSettingsModal(false)}
          onChangeLanguage={() => {
            setShowSettingsModal(false);
            setLanguage(null);
          }}
          onChangeLocation={() => {
            setShowSettingsModal(false);
            setShowLocationModal(true);
          }}
          onOpenScheduler={() => {
            setShowSettingsModal(false);
            setActiveTab('scheduler');
          }}
          onSync={performSync}
          isOnline={isOnline}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

function SettingsModal({ 
  language, 
  profile, 
  onClose, 
  onChangeLanguage, 
  onChangeLocation,
  onOpenScheduler,
  onSync,
  isOnline,
  isSyncing
}: { 
  language: Language; 
  profile: FarmerProfile | null; 
  onClose: () => void;
  onChangeLanguage: () => void;
  onChangeLocation: () => void;
  onOpenScheduler?: () => void;
  onSync: () => void;
  isOnline: boolean;
  isSyncing: boolean;
}) {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white rounded-[36px] card-shadow border border-natural-accent/10 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-natural-accent/10 flex items-center justify-between bg-natural-primary text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-natural-gold">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">{t.settings}</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/60">AgriSmart AI Farm Profile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Notification Scheduler Shortcuts */}
          <div className="bg-amber-50/70 p-5 rounded-[28px] border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={18} className="text-amber-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  {t.notificationScheduler || "Warning Scheduler"}
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Push & Sound
              </span>
            </div>

            <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
              Configure automated warnings for planting windows, heavy rainfall hazards, and soil preparation lead times.
            </p>

            {onOpenScheduler && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScheduler();
                }}
                className="w-full py-3 bg-natural-primary text-white rounded-2xl text-xs font-bold shadow-sm hover:bg-natural-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <Bell size={14} className="text-natural-gold" />
                <span>Configure Alert Preferences</span>
              </button>
            )}
          </div>

          {/* Location Setting Card */}
          <div className="bg-natural-tan/20 p-5 rounded-[28px] border border-natural-accent/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-natural-gold" />
                <span className="text-xs font-bold uppercase tracking-wider text-natural-primary">{t.chooseLocation}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-natural-accent/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-natural-primary">
                  {profile?.region || 'Not set'}
                </p>
                <p className="text-xs text-natural-text/60 font-medium">
                  {profile?.country || 'Select Country'}
                  {profile?.gpsLocation && ' • GPS Coordinates Active'}
                </p>
              </div>
              <button 
                onClick={onChangeLocation}
                className="px-3 py-1.5 rounded-xl bg-natural-primary text-white text-xs font-bold shadow-sm hover:bg-natural-primary/90 transition-all flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>{t.changeLocation}</span>
              </button>
            </div>
          </div>

          {/* Language Setting Card */}
          <div className="bg-natural-tan/20 p-5 rounded-[28px] border border-natural-accent/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-natural-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-natural-primary">{t.language}</span>
              </div>
              <span className="text-xs font-bold text-natural-primary">
                {language}
              </span>
            </div>

            <button 
              onClick={onChangeLanguage}
              className="w-full py-3 bg-white rounded-2xl border border-natural-accent/10 text-xs font-bold text-natural-primary hover:bg-natural-tan/40 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw size={14} />
              <span>Change Language / Chinja Mutauro</span>
            </button>
          </div>

          {/* Cloud Sync Status */}
          <div className="bg-natural-tan/20 p-5 rounded-[28px] border border-natural-accent/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud size={18} className="text-natural-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-natural-primary">Offline & Cloud Sync</span>
              </div>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isOnline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                {isOnline ? "Online" : "Offline Mode"}
              </span>
            </div>

            <p className="text-xs text-natural-text/70 leading-relaxed font-medium">
              AgriSmart AI stores all your crop records, diagnoses, and rotation plans locally on your device first and automatically syncs when online.
            </p>

            <button 
              onClick={onSync}
              disabled={!isOnline || isSyncing}
              className="w-full py-3 bg-natural-primary text-white rounded-2xl text-xs font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Syncing with Cloud..." : "Force Sync Now"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-natural-bg/50 border-t border-natural-accent/10 text-center">
          <button 
            onClick={onClose}
            className="w-full py-3.5 bg-zinc-800 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
          >
            {t.close || "Done"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

type FlagCode = 'gb' | 'zw' | 'ke' | 'za';

function FlagIcon({ country }: { country: FlagCode }) {
  const label = country === 'gb' ? 'United Kingdom' : country === 'zw' ? 'Zimbabwe' : country === 'ke' ? 'Kenya' : 'South Africa';

  if (country === 'gb') {
    return (
      <svg viewBox="0 0 32 22" role="img" aria-label={label} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm">
        <rect width="32" height="22" fill="#1f3c88" />
        <path d="M0 0 32 22M32 0 0 22" stroke="#fff" strokeWidth="5" />
        <path d="M0 0 32 22M32 0 0 22" stroke="#c8102e" strokeWidth="2" />
        <path d="M16 0v22M0 11h32" stroke="#fff" strokeWidth="7" />
        <path d="M16 0v22M0 11h32" stroke="#c8102e" strokeWidth="3" />
      </svg>
    );
  }

  if (country === 'zw') {
    return (
      <svg viewBox="0 0 32 22" role="img" aria-label={label} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm">
        <rect width="32" height="22" fill="#319208" />
        <path d="M0 3.14h32v3.14H0zM0 9.43h32v3.14H0zM0 15.71h32v3.14H0z" fill="#ffd200" />
        <path d="M0 6.28h32v3.15H0zM0 12.57h32v3.14H0zM0 18.85h32V22H0z" fill="#d40000" />
        <path d="M0 0 12 11 0 22z" fill="#fff" />
        <path d="m2.4 5.5 1.3 3.9h4.1L4.5 11.8l1.3 3.9-3.4-2.4-3.4 2.4 1.3-3.9-3.3-2.4h4.1z" fill="#e4002b" />
      </svg>
    );
  }

  if (country === 'ke') {
    return (
      <svg viewBox="0 0 32 22" role="img" aria-label={label} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm">
        <rect width="32" height="7.3" fill="#000" />
        <rect y="7.3" width="32" height="7.4" fill="#bb1e10" />
        <rect y="14.7" width="32" height="7.3" fill="#096a38" />
        <path d="M13 0 20 11 13 22 8 11z" fill="#fff" />
        <path d="M16 1 21 11 16 21 11 11z" fill="#bb1e10" />
        <path d="M16 2v18M12 11h8" stroke="#000" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 22" role="img" aria-label={label} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm">
      <rect width="32" height="22" fill="#de3831" />
      <path d="M0 8h32v6H0z" fill="#fff" />
      <path d="M0 9.5h32v3H0z" fill="#002395" />
      <path d="M0 0v22h13L25 11 13 0z" fill="#007a4d" />
      <path d="M0 3v16l9  -8z" fill="#ffb81c" />
      <path d="M0 6v10l6-5z" fill="#000" />
    </svg>
  );
}

function LanguageSelector({ onSelect }: { onSelect: (lang: Language) => void }) {
  const options: Language[] = ['English', 'Shona', 'Ndebele', 'Swahili', 'Zulu'];
  const flags: Record<Language, FlagCode> = { English: 'gb', Shona: 'zw', Ndebele: 'zw', Swahili: 'ke', Zulu: 'za' };
  
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-natural-primary px-6 text-white text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[32px] bg-natural-accent shadow-xl">
          <Sprout size={48} className="text-natural-primary" />
        </div>
        <h1 className="text-4xl font-serif font-bold tracking-tight">AgriSmart AI</h1>
        <p className="mt-2 text-natural-accent font-medium italic opacity-90">Localized AI for African Farmers</p>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-4"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/60">Choose Language / Hlawula Ulimi / Chagua Lugha</p>
        <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto px-2">
          {options.map((lang) => (
            <button
              key={lang}
              onClick={() => onSelect(lang)}
              className="flex items-center justify-between rounded-2xl bg-white/10 border border-white/20 px-6 py-4 text-left font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <FlagIcon country={flags[lang]} />
                <span>{lang}</span>
              </div>
              <ChevronRight size={20} className="text-natural-accent" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const AFRICAN_COUNTRIES = [
  { 
    name: 'Zimbabwe', 
    flag: '🇿🇼',
    regions: [
      'Harare', 
      'Bulawayo', 
      'Manicaland (Mutare, Chipinge, Nyanga)', 
      'Mashonaland Central (Bindura, Mazowe, Shamva)', 
      'Mashonaland East (Marondera, Goromonzi, Murehwa)', 
      'Mashonaland West (Chinhoyi, Karoi, Kadoma)', 
      'Masvingo (Masvingo, Chiredzi, Gutu)', 
      'Matabeleland North (Lupane, Hwange, Binga)', 
      'Matabeleland South (Gwanda, Beitbridge, Plumtree)', 
      'Midlands (Gweru, Kwekwe, Gokwe)'
    ] 
  },
  { 
    name: 'Kenya', 
    flag: '🇰🇪',
    regions: [
      'Nairobi', 
      'Nakuru (Rift Valley)', 
      'Uasin Gishu (Eldoret)', 
      'Trans Nzoia (Kitale)', 
      'Kiambu (Central)', 
      'Meru (Eastern)', 
      'Machakos', 
      'Kisumu (Nyanza)', 
      'Kakamega (Western)', 
      'Mombasa (Coast)', 
      'Nyeri', 
      'Kericho'
    ] 
  },
  { 
    name: 'South Africa', 
    flag: '🇿🇦',
    regions: [
      'Limpopo (Polokwane, Tzaneen)', 
      'Mpumalanga (Mbombela, Nelspruit)', 
      'KwaZulu-Natal (Durban, Midlands)', 
      'Free State (Bloemfontein, Welkom)', 
      'Gauteng (Johannesburg, Pretoria)', 
      'Western Cape (Cape Town, Stellenbosch)', 
      'Eastern Cape (Gqeberha, East London)', 
      'North West (Rustenburg, Potchefstroom)', 
      'Northern Cape (Kimberley, Upington)'
    ] 
  },
  { 
    name: 'Nigeria', 
    flag: '🇳🇬',
    regions: [
      'Oyo (Ibadan)', 
      'Lagos', 
      'Abuja (FCT)', 
      'Kano', 
      'Kaduna', 
      'Benue (Makurdi)', 
      'Plateau (Jos)', 
      'Ogun (Abeokuta)', 
      'Enugu', 
      'Rivers (Port Harcourt)', 
      'Niger (Minna)'
    ] 
  },
  { 
    name: 'Tanzania', 
    flag: '🇹🇿',
    regions: [
      'Arusha (Northern Zone)', 
      'Kilimanjaro (Moshi)', 
      'Mbeya (Southern Highlands)', 
      'Iringa', 
      'Mwanza (Lake Zone)', 
      'Morogoro', 
      'Dar es Salaam', 
      'Dodoma (Central)', 
      'Tanga', 
      'Zanzibar'
    ] 
  },
  { 
    name: 'Uganda', 
    flag: '🇺🇬',
    regions: [
      'Central (Kampala, Wakiso, Masaka)', 
      'Western (Mbarara, Fort Portal, Kabale)', 
      'Eastern (Jinja, Mbale, Soroti)', 
      'Northern (Gulu, Lira, Arua)'
    ] 
  },
  { 
    name: 'Zambia', 
    flag: '🇿🇲',
    regions: [
      'Central (Kabwe, Mkushi, Serenje)', 
      'Lusaka (Lusaka, Chongwe)', 
      'Southern (Choma, Mazabuka, Livingstone)', 
      'Eastern (Chipata, Petauke)', 
      'Copperbelt (Ndola, Kitwe)', 
      'Northern (Kasama, Mpika)'
    ] 
  },
  { 
    name: 'Ghana', 
    flag: '🇬🇭',
    regions: [
      'Ashanti (Kumasi, Ejura)', 
      'Bono (Techiman, Sunyani)', 
      'Northern (Tamale)', 
      'Eastern (Koforidua)', 
      'Greater Accra', 
      'Western (Takoradi)', 
      'Volta (Ho)'
    ] 
  },
  { 
    name: 'Malawi', 
    flag: '🇲🇼',
    regions: [
      'Central (Lilongwe, Kasungu, Dedza)', 
      'Southern (Blantyre, Zomba, Thyolo)', 
      'Northern (Mzuzu, Mzimba, Karonga)'
    ] 
  },
  { 
    name: 'Ethiopia', 
    flag: '🇪🇹',
    regions: [
      'Oromia (Adama, Jimma)', 
      'Amhara (Bahir Dar, Gondar)', 
      'Sidama (Hawassa)', 
      'Addis Ababa', 
      'Tigray (Mekelle)'
    ] 
  },
  { 
    name: 'Rwanda', 
    flag: '🇷🇼',
    regions: [
      'Northern (Musanze, Gicumbi)', 
      'Southern (Huye, Muhanga)', 
      'Eastern (Rwamagana, Nyagatare)', 
      'Western (Rubavu, Rusizi)', 
      'Kigali'
    ] 
  },
  { 
    name: 'Botswana', 
    flag: '🇧🇼',
    regions: [
      'Central (Serowe, Palapye)', 
      'Southern (Kanye, Goodhope)', 
      'Kweneng (Molepolole)', 
      'Gaborone', 
      'Chobe (Kasane)'
    ] 
  },
  { 
    name: 'Mozambique', 
    flag: '🇲🇿',
    regions: [
      'Manica (Chimoio)', 
      'Sofala (Beira)', 
      'Nampula', 
      'Zambezia (Quelimane)', 
      'Maputo', 
      'Gaza (Chokwe, Xai-Xai)'
    ] 
  }
];

interface LocationSelectorProps {
  language: Language;
  currentCountry?: string;
  currentRegion?: string;
  onComplete: (country: string, region: string, gps?: { lat: number, lng: number }) => void;
  onClose?: () => void;
  isModal?: boolean;
}

function LocationSelector({ 
  language, 
  currentCountry, 
  currentRegion, 
  onComplete, 
  onClose, 
  isModal = false 
}: LocationSelectorProps) {
  const [selectedCountry, setSelectedCountry] = useState(currentCountry || 'Zimbabwe');
  const [selectedRegion, setSelectedRegion] = useState(currentRegion || '');
  const [customDistrict, setCustomDistrict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{ type: 'idle' | 'locating' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');

  const t = TRANSLATIONS[language];

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ 
        type: 'error', 
        message: t.gpsFailed || "Geolocation is not supported by your browser." 
      });
      return;
    }

    setLocating(true);
    setGpsStatus({ 
      type: 'locating', 
      message: t.gpsLocating || "Requesting GPS satellite fix..." 
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setGpsStatus({ type: 'locating', message: "Coordinates acquired. Identifying district & region..." });
          
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            setSelectedCountry(data.country || 'Zimbabwe');
            setSelectedRegion(data.region || `${lat.toFixed(2)}, ${lng.toFixed(2)}`);
            setGpsStatus({ 
              type: 'success', 
              message: `📍 ${data.region}, ${data.country}` 
            });
            onComplete(data.country || 'Zimbabwe', data.region || 'GPS Located', { lat, lng });
          } else {
            setSelectedCountry('Zimbabwe');
            setSelectedRegion(`GPS (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
            setGpsStatus({ type: 'success', message: `📍 GPS Fix: ${lat.toFixed(2)}, ${lng.toFixed(2)}` });
            onComplete('Zimbabwe', `GPS (${lat.toFixed(2)}, ${lng.toFixed(2)})`, { lat, lng });
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setSelectedCountry('Zimbabwe');
          setSelectedRegion('GPS Located');
          onComplete('Zimbabwe', 'GPS Located', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setGpsStatus({ 
          type: 'error', 
          message: t.gpsFailed || "GPS signal unavailable. Please search or pick your region manually below." 
        });
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirmCustom = () => {
    if (customDistrict.trim()) {
      setSelectedRegion(customDistrict.trim());
      onComplete(selectedCountry || 'Zimbabwe', customDistrict.trim());
    }
  };

  const handleSelectSearchResult = (country: string, region: string) => {
    setSelectedCountry(country);
    setSelectedRegion(region);
    onComplete(country, region);
  };

  const currentCountryData = AFRICAN_COUNTRIES.find(c => c.name === selectedCountry) || AFRICAN_COUNTRIES[0];

  // Live search across all countries and regions
  const searchResults = searchQuery.trim() ? AFRICAN_COUNTRIES.flatMap(country => 
    country.regions
      .filter(region => 
        region.toLowerCase().includes(searchQuery.toLowerCase()) || 
        country.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(region => ({ country: country.name, flag: country.flag, region }))
  ) : [];

  const content = (
    <div className="w-full space-y-5">
      {/* Header Info */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-natural-accent/20 text-natural-primary shadow-inner">
          <MapPin size={28} />
        </div>
        <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.chooseLocation || "Choose Your Location"}</h2>
        <p className="mt-1 text-natural-accent font-bold uppercase tracking-widest text-[10px]">
          Personalizing weather forecasts & crop market intelligence
        </p>
      </div>

      {/* GPS Button */}
      <div className="space-y-2">
        <button 
          id="gps-location-btn"
          onClick={handleGPS}
          disabled={locating}
          className="w-full flex items-center justify-center gap-3 bg-natural-primary text-white p-4 rounded-2xl shadow-md font-bold hover:bg-natural-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 text-sm group"
        >
          {locating ? <Loader2 className="animate-spin text-natural-gold" size={20} /> : <LocateFixed size={20} className="text-natural-gold group-hover:rotate-45 transition-transform" />}
          <span>{locating ? (t.gpsLocating || "Locating with GPS...") : (t.useGPS || "Use My Current GPS Location")}</span>
        </button>

        {/* GPS Status message */}
        {gpsStatus.type !== 'idle' && (
          <div className={cn(
            "p-3 rounded-xl text-xs font-medium flex items-center gap-2",
            gpsStatus.type === 'locating' ? "bg-amber-50 text-amber-800 border border-amber-200" :
            gpsStatus.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
            "bg-red-50 text-red-800 border border-red-200"
          )}>
            {gpsStatus.type === 'locating' && <Loader2 size={14} className="animate-spin shrink-0" />}
            {gpsStatus.type === 'success' && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
            {gpsStatus.type === 'error' && <AlertTriangle size={14} className="text-red-600 shrink-0" />}
            <span className="leading-tight">{gpsStatus.message}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-1">
        <div className="h-px flex-1 bg-natural-accent/15" />
        <span className="text-[10px] font-black text-natural-accent/50 uppercase tracking-[0.3em]">OR CHOOSE MANUALLY</span>
        <div className="h-px flex-1 bg-natural-accent/15" />
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-accent" />
        <input 
          id="location-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchLocation || "Search town, district, or province (e.g. Masvingo, Eldoret, Mutare)..."}
          className="w-full bg-white pl-11 pr-10 py-3 rounded-2xl border border-natural-accent/20 text-xs font-medium text-natural-primary placeholder:text-natural-text/40 focus:outline-none focus:ring-2 focus:ring-natural-primary/30"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-accent hover:text-natural-primary p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown / List */}
      {searchQuery.trim() ? (
        <div className="space-y-2 max-h-60 overflow-y-auto p-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-natural-accent px-1">
            Matching Locations ({searchResults.length})
          </p>
          {searchResults.length > 0 ? (
            searchResults.map((res, i) => (
              <button
                key={i}
                onClick={() => handleSelectSearchResult(res.country, res.region)}
                className="w-full p-3 rounded-2xl bg-white border border-natural-accent/10 hover:border-natural-gold hover:bg-natural-tan/30 transition-all flex items-center justify-between text-left shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{res.flag}</span>
                  <div>
                    <p className="text-xs font-bold text-natural-primary group-hover:text-natural-brown">{res.region}</p>
                    <p className="text-[10px] text-natural-accent">{res.country}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-natural-accent group-hover:translate-x-1 transition-transform" />
              </button>
            ))
          ) : (
            <div className="p-4 text-center bg-white rounded-2xl border border-natural-accent/10 space-y-2">
              <p className="text-xs text-natural-text/60">No pre-listed region found for "{searchQuery}".</p>
              <button
                onClick={() => handleSelectSearchResult(selectedCountry || 'Zimbabwe', searchQuery.trim())}
                className="text-xs font-bold text-natural-primary underline hover:text-natural-gold"
              >
                Use "{searchQuery.trim()}" as custom location in {selectedCountry || 'Zimbabwe'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Standard Country & Region Browsing */
        <div className="space-y-4">
          {/* Country Selection Horizontal Scroll / Pills */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-natural-accent flex items-center gap-1.5 mb-2">
              <Globe size={12} /> {t.country || "1. Select Country"}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {AFRICAN_COUNTRIES.map(c => (
                <button
                  key={c.name}
                  onClick={() => { 
                    setSelectedCountry(c.name); 
                    setSelectedRegion(''); 
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border shadow-sm",
                    selectedCountry === c.name 
                      ? "bg-natural-primary text-white border-natural-primary shadow-md scale-105" 
                      : "bg-white border-natural-accent/15 text-natural-primary hover:bg-natural-tan/40"
                  )}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Region / District Tiles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-natural-accent flex items-center gap-1.5">
                <MapPin size={12} /> {t.region || "2. Select Farming District / Region"}
              </label>
              <span className="text-[10px] font-bold text-natural-accent">
                {currentCountryData.flag} {currentCountryData.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {currentCountryData.regions.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={cn(
                    "p-3 rounded-2xl text-xs font-bold text-left border transition-all flex items-center justify-between shadow-sm",
                    selectedRegion === r 
                      ? "bg-natural-gold text-white border-natural-gold shadow-md font-black" 
                      : "bg-white border-natural-accent/15 text-natural-primary hover:bg-natural-tan/30"
                  )}
                >
                  <span className="truncate mr-2">{r}</span>
                  {selectedRegion === r && <Check size={14} className="shrink-0 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom District Field */}
          <div className="bg-natural-tan/20 p-3.5 rounded-2xl border border-natural-accent/15 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-natural-accent flex items-center gap-1">
              <Edit3 size={11} /> {t.customDistrict || "Or enter custom ward/village:"}
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={customDistrict}
                onChange={(e) => setCustomDistrict(e.target.value)}
                placeholder={t.enterCustomLocation || "e.g. Gokwe South, Sanyati, Nyanga..."}
                className="flex-1 bg-white px-3 py-2 rounded-xl border border-natural-accent/20 text-xs font-medium text-natural-primary focus:outline-none focus:ring-1 focus:ring-natural-primary"
              />
              <button 
                onClick={handleConfirmCustom}
                disabled={!customDistrict.trim()}
                className="px-4 py-2 bg-natural-primary text-white rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-natural-primary/90 transition-all shrink-0"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Location Summary & Confirm Button */}
      <div className="pt-2 space-y-3">
        {selectedRegion && (
          <div className="p-3 bg-natural-gold/10 rounded-2xl border border-natural-gold/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-natural-gold" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-natural-accent">Selected Location</p>
                <p className="text-xs font-black text-natural-primary">{selectedRegion}, {selectedCountry}</p>
              </div>
            </div>
            <CheckCircle2 size={18} className="text-natural-gold" />
          </div>
        )}

        <button 
          id="confirm-location-btn"
          disabled={!selectedCountry || !selectedRegion}
          onClick={() => onComplete(selectedCountry, selectedRegion)}
          className="w-full bg-natural-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-25 hover:bg-natural-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <Check size={16} />
          <span>{t.confirmLocation || "Confirm Farming Location"}</span>
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-natural-bg rounded-[36px] card-shadow border border-natural-accent/20 p-6 max-h-[90vh] overflow-y-auto relative shadow-2xl"
        >
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/80 hover:bg-white border border-natural-accent/20 flex items-center justify-center text-natural-accent hover:text-natural-primary transition-all shadow-sm z-10"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
          {content}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-natural-bg p-6 overflow-y-auto justify-center items-center">
      <div className="w-full max-w-md my-auto">
        {content}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors",
        active ? "text-natural-primary" : "text-natural-accent/60 hover:text-natural-primary"
      )}
    >
      <div className={cn(
        "rounded-full p-1.5 transition-colors",
        active && "bg-natural-primary/10"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function StrategicAdvice({ language, profile }: { language: Language; profile?: FarmerProfile | null }) {
  const t = TRANSLATIONS[language];
  const [advice, setAdvice] = useState<{ planting: string; selling: string } | null>(null);

  useEffect(() => {
    async function getAdvice() {
      try {
        const country = profile?.country || 'Zimbabwe';
        const region = profile?.region || 'National';
        const prompt = `
          As an expert African agricultural consultant for ${region}, ${country}, provide 2 key strategic insights for the current week.
          1. On PLANTING: Based on local rainfall, seasonal climate and soil patterns in ${region}, ${country}.
          2. On SELLING: Based on current regional crop market trends (e.g., local grain boards, regional depot and fresh market prices).
          
          Keep each insight under 20 words.
          Response JSON format:
          {
            "planting": "string",
            "selling": "string"
          }
        `;

        const result = await getAI().models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        });

        if (result.text) {
          setAdvice(JSON.parse(result.text));
        }
      } catch (err) {
        console.warn('Strategic advice unavailable:', err);
        setAdvice({ 
          planting: `Optimal time for early planting and moisture conservation in ${profile?.region || 'your region'}.`, 
          selling: "Stockpile grain for upcoming market cycles; regional prices stabilizing." 
        });
      }
    }
    getAdvice();
  }, [language, profile?.region, profile?.country]);

  if (!advice) return null;

  return (
    <div className="bg-natural-tan/30 rounded-[32px] p-5 border border-natural-accent/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-natural-accent flex items-center gap-2">
          <TrendingUp size={14} className="text-natural-gold" />
          {t.strategicAdvice}
        </h3>
        {profile?.region && (
          <span className="text-[10px] font-bold text-natural-primary bg-white/70 px-2 py-0.5 rounded-full border border-natural-accent/10">
            {profile.region}
          </span>
        )}
      </div>
      
      <div className="grid gap-3">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-natural-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Sprout size={14} className="text-natural-primary" />
            <p className="text-[10px] font-bold text-natural-primary uppercase">{t.whenToPlant}</p>
          </div>
          <p className="text-xs text-natural-text/80 leading-relaxed font-medium">"{advice.planting}"</p>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-natural-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Coins size={14} className="text-natural-gold" />
            <p className="text-[10px] font-bold text-natural-primary uppercase">{t.whenToSell}</p>
          </div>
          <p className="text-xs text-natural-text/80 leading-relaxed font-medium">"{advice.selling}"</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ 
  language, 
  profile, 
  onNavigate, 
  onOpenLocationModal 
}: { 
  language: Language; 
  profile: FarmerProfile | null; 
  onNavigate: (tab: string) => void;
  onOpenLocationModal?: () => void;
}) {
  const t = TRANSLATIONS[language];
  const [weather, setWeather] = useState<any>(null);
  const [showSMS, setShowSMS] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ScheduledAlert[]>([]);

  useEffect(() => {
    const loc = profile?.region || profile?.country || 'Harare';
    const gpsQuery = profile?.gpsLocation ? `?lat=${profile.gpsLocation.lat}&lng=${profile.gpsLocation.lng}` : '';
    fetch(`/api/weather/${encodeURIComponent(loc)}${gpsQuery}`)
      .then(res => res.ok ? res.json() : Promise.reject('Weather data unavailable'))
      .then(data => setWeather(data))
      .catch(err => console.warn('Weather fetch error:', err));

    // Fetch top active scheduled alerts
    db.alerts.toArray().then(alerts => {
      const active = alerts.filter(a => !a.isActioned);
      setActiveAlerts(active.slice(0, 4));
    }).catch(() => {});
  }, [profile?.region, profile?.country, profile?.gpsLocation]);

  const fallbackAlerts = [
    { title: "Fall Armyworm Alert", body: `Scouting alert active for ${profile?.region || 'your district'}. Check crops weekly.`, type: "warning" },
    { title: "Market Spike", body: "Grain & vegetable demand trending high this week.", type: "info" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6"
    >
      {/* Strategic Advice */}
      <StrategicAdvice language={language} profile={profile} />

      {/* Proactive Local Planting Window & Rainfall Warning Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-natural-primary">
              <BellRing size={16} className="text-amber-600 animate-bounce" />
              <h3 className="font-serif font-bold text-sm">Active Regional Warnings</h3>
            </div>
            <button 
              onClick={() => onNavigate('scheduler')}
              className="text-xs text-natural-accent hover:text-natural-primary font-bold flex items-center gap-1"
            >
              <span>{t.openNow || "Open All"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid gap-3">
            {activeAlerts.slice(0, 2).map((alert) => (
              <div 
                key={alert.id || alert.title}
                className={cn(
                  "p-4 rounded-3xl card-shadow border transition-all flex items-start justify-between gap-3",
                  alert.severity === 'critical'
                    ? "bg-red-50/90 border-red-200 text-red-950"
                    : alert.severity === 'warning'
                    ? "bg-amber-50/90 border-amber-200 text-amber-950"
                    : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "p-2.5 rounded-2xl shrink-0 mt-0.5 shadow-sm",
                    alert.severity === 'critical' ? "bg-red-600 text-white" :
                    alert.severity === 'warning' ? "bg-amber-600 text-white" :
                    "bg-emerald-600 text-white"
                  )}>
                    {alert.type === 'planting_window' ? <CalendarDays size={18} /> :
                     alert.type === 'heavy_rainfall' ? <CloudRain size={18} /> :
                     <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-sm">{alert.title}</h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/70 shadow-xs">
                        {alert.metadata?.daysRemaining ? `${alert.metadata.daysRemaining}d Notice` : "Now"}
                      </span>
                    </div>
                    <p className="text-xs opacity-85 leading-relaxed mt-1">{alert.message}</p>
                    {alert.metadata?.actionSteps && alert.metadata.actionSteps[0] && (
                      <p className="text-[11px] font-medium mt-1.5 opacity-90 italic">
                        💡 Tip: {alert.metadata.actionSteps[0]}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('scheduler')}
                  className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold shadow-xs hover:bg-natural-tan/40 transition-colors shrink-0 text-natural-primary"
                >
                  {t.openNow || "View"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Widget */}
      <section className="rounded-[32px] bg-natural-primary p-6 text-white card-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-16 -translate-y-16" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t.weather}</h3>
              {onOpenLocationModal && (
                <button 
                  onClick={onOpenLocationModal}
                  className="flex items-center gap-1 text-[10px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full text-natural-gold transition-colors"
                >
                  <MapPin size={10} />
                  <span>{t.changeLocation || "Change"}</span>
                </button>
              )}
            </div>
            <p className="text-2xl font-serif font-bold">{weather?.location || profile?.region || profile?.country || "Harare"}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black">{weather?.temp || 24}°C</span>
            <span className="text-xs font-medium text-white/80">{weather?.condition}</span>
          </div>
        </div>
        
        {weather && (
          <div className="rounded-2xl bg-white/10 p-4 relative z-10 border border-white/10">
            <div className="flex items-start gap-3">
              <CloudSun className="mt-1 shrink-0 text-natural-accent" size={20} />
              <p className="text-sm leading-relaxed text-white/90 italic">{weather.advice}</p>
            </div>
          </div>
        )}
      </section>

      {/* Main Action Grid */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('scanner')} className="flex flex-col items-start p-5 bg-white rounded-[28px] card-shadow border border-natural-accent/10 hover:bg-natural-tan/30 transition-colors">
          <div className="bg-natural-tan p-3 rounded-2xl mb-3 text-natural-primary">
            <Camera size={24} />
          </div>
          <span className="font-serif font-bold text-lg text-natural-primary">{t.scan}</span>
          <span className="text-[10px] text-natural-text/60 font-medium">Detect issues</span>
        </button>

        <button onClick={() => onNavigate('records')} className="flex flex-col items-start p-5 bg-white rounded-[28px] card-shadow border border-natural-accent/10 hover:bg-natural-tan/30 transition-colors">
          <div className="bg-natural-accent/20 p-3 rounded-2xl mb-3 text-natural-brown">
            <History size={24} />
          </div>
          <span className="font-serif font-bold text-lg text-natural-primary">{t.records}</span>
          <span className="text-[10px] text-natural-text/60 font-medium">Farm logs</span>
        </button>
      </div>

      {/* Notification Scheduler Feature Card */}
      <button 
        onClick={() => onNavigate('scheduler')}
        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-amber-900 to-natural-primary text-white rounded-[28px] card-shadow relative overflow-hidden text-left group"
      >
        <div className="flex items-center gap-4 z-10">
          <div className="bg-natural-gold text-natural-primary p-3.5 rounded-2xl shadow-sm group-hover:scale-105 transition-transform">
            <BellRing size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-serif font-bold text-white text-base">{t.notificationScheduler || "Warning Scheduler"}</p>
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[8px] font-black uppercase rounded-full tracking-wider border border-amber-400/30">
                Local Alerts
              </span>
            </div>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              Planting dates, soil prep & heavy rain early warnings
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-white/60 group-hover:translate-x-1 transition-transform z-10" />
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8" />
      </button>

      {/* AI Crop Rotation Strategy Card */}
      <button 
        onClick={() => onNavigate('records')}
        className="w-full flex items-center justify-between p-5 bg-white rounded-[28px] card-shadow border border-natural-accent/10 hover:bg-natural-tan/20 transition-all text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-2xl shadow-sm border border-emerald-100 group-hover:scale-105 transition-transform">
            <RotateCw size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-serif font-bold text-natural-primary text-base">{t.cropRotation}</p>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded-full tracking-wider">
                AI Planner
              </span>
            </div>
            <p className="text-xs text-natural-text/60 font-medium mt-0.5">
              Improve soil health & naturally break pest cycles
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-natural-accent group-hover:translate-x-1 transition-transform" />
      </button>

      {/* SMS Fallback Mode */}
      <button 
        onClick={() => setShowSMS(true)}
        className="w-full flex items-center justify-between p-5 bg-natural-tan rounded-[28px] border border-natural-accent/20"
      >
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm text-natural-primary">
            <Send size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold text-natural-primary text-sm">{t.smsMode}</p>
            <p className="text-[10px] text-natural-text/60 font-medium italic">Use AgriSmart via SMS (Offline)</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-natural-accent" />
      </button>

      {/* Alerts */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-natural-accent">{t.alerts}</h3>
        <div className="space-y-3">
          {fallbackAlerts.map((alert, i) => (
            <div key={i} className={cn(
              "rounded-2xl p-4 card-shadow border-l-4",
              alert.type === 'warning' ? "bg-red-50 border-red-500" : "bg-blue-50 border-blue-500"
            )}>
              <div className="flex gap-4">
                <AlertTriangle className={cn("shrink-0", alert.type === 'warning' ? "text-red-600" : "text-blue-600")} size={20} />
                <div>
                  <p className="font-bold text-sm text-natural-primary uppercase tracking-tight">{alert.title}</p>
                  <p className="text-xs text-natural-text/70 mt-1">{alert.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showSMS && <SMSModal onClose={() => setShowSMS(false)} language={language} />}
    </motion.div>
  );
}

function SMSModal({ onClose, language }: { onClose: () => void, language: Language }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[95vh] overflow-y-auto"
      >
        <FeaturePhoneSimulatorView language={language} onClose={onClose} />
      </motion.div>
    </div>
  );
}

function Scanner({ language }: { language: Language }) {
  const t = TRANSLATIONS[language];
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setAnalyzing(true);
      
      try {
        if (!navigator.onLine) {
          alert("AgriSmart AI requires an active internet connection for plant analysis. Please try again when you are back online.");
          setAnalyzing(false);
          return;
        }
        const prompt = `
          You are an agricultural AI expert specializing in African farming.
          Analyze this image and provide a report in ${language}.
          
          DETECTION TYPE: Detect either plant diseases OR pests (insects).
          Identify common African agricultural pests (e.g., Fall Armyworm, Locusts, Aphids, Maize Stalk Borer, etc.).
          
          The response MUST be in JSON format:
          - plantName: { common: string, scientific: string }
          - detectionType: "Disease" | "Pest" | "Healthy"
          - healthStatus: "Healthy" | "Diseased" | "Infested" | "Deficient"
          - cropType: string
          - growthStage: string
          - diagnosis: {
              name: string (Disease or Pest name),
              description: string (brief detail about the identification),
              confidence: string (percentage),
              causes: string[],
              severity: "Low" | "Medium" | "High",
              isBeneficial: boolean,
              symptoms: string[] (list of visible symptoms),
              lifeCycle: string (brief description of the life cycle),
              regionalImpact: string (brief note on how this affects African regions)
            }
          - advisory: {
              organicOptions: string[] (specific organic control measures for African context),
              chemicalOptions: string[] (specific effective chemical control measures),
              prevention: string[],
              scamAlert: string
            }
          - soilAdvice: string
          - translations: {
              shona: string,
              ndebele: string,
              english: string,
              swahili: string
            }
        `;

        const result = await getAI().models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { 
              parts: [
                { text: prompt },
                { inlineData: { data: base64.split(",")[1], mimeType: "image/jpeg" } }
              ] 
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        if (!result.text) throw new Error("Empty AI response");
        
        const data = JSON.parse(result.text);
        const diagnosis: Diagnosis = {
          timestamp: Date.now(),
          imageUrl: base64,
          synced: false,
          data
        };
        
        await db.diagnoses.add(diagnosis);
        setResult(diagnosis);
      } catch (error) {
        console.error("Analysis Error:", error);
        alert("Sorry, analysis failed. Please check your connection and try again.");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  });

  if (result) {
    return <AnalysisView result={result} language={language} onBack={() => setResult(null)} />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 h-full flex flex-col"
    >
      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-natural-accent/30 rounded-[32px] bg-white p-8 group hover:border-natural-accent transition-colors cursor-pointer card-shadow" {...getRootProps()}>
        <input {...getInputProps()} />
        {analyzing ? (
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-natural-primary mx-auto mb-4" />
            <p className="font-serif text-2xl font-bold text-natural-primary">{t.analyzing}</p>
          </div>
        ) : preview ? (
          <div className="text-center">
             <img src={preview} className="max-h-60 rounded-2xl mb-4 shadow-lg mx-auto" />
             <p className="text-natural-accent font-medium">Processing image...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-natural-tan text-natural-primary p-6 rounded-3xl inline-block mb-6 group-hover:scale-110 transition-transform">
              <Camera size={48} />
            </div>
            <h2 className="text-3xl font-serif font-bold text-natural-primary mb-2">{t.scan}</h2>
            <p className="text-natural-text/60 max-w-xs">{t.takePhoto} or drag and drop to analyze your crop health instantly.</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-4">
        <div className="flex items-center gap-4 p-5 bg-natural-tan rounded-2xl border border-natural-accent/10">
          <div className="bg-natural-primary text-white p-2.5 rounded-xl">
            <Volume2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-natural-primary">Voice Assistant Ready</p>
            <p className="text-xs text-natural-text/70 mt-0.5">You can also speak your questions in the Chat tab.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnalysisView({ result, language, onBack }: { result: Diagnosis, language: Language, onBack: () => void }) {
  const t = TRANSLATIONS[language];
  const [isSolved, setIsSolved] = useState(result.resolved || false);
  const [treatment, setTreatment] = useState(result.treatmentApplied || '');
  const [showSolveForm, setShowSolveForm] = useState(false);
  const d = result.data;
  const isHealthy = d.healthStatus === "Healthy";

  const handleSolve = async () => {
    if (result.id) {
       await db.diagnoses.update(result.id, {
         resolved: true,
         resolvedAt: Date.now(),
         treatmentApplied: treatment
       });

       // Attempt to update farm records if a matching crop is found
       const records = await db.records.toArray();
       const matchedRecord = records.find(r => 
         r.cropName.toLowerCase().includes(d.plantName.common.toLowerCase()) ||
         d.plantName.common.toLowerCase().includes(r.cropName.toLowerCase())
       );

       if (matchedRecord && matchedRecord.id) {
         const newTreatments = [...(matchedRecord.treatments || []), {
           date: new Date().toLocaleDateString(),
           description: `Issue Resolved (${d.diagnosis.name}): ${treatment}`
         }];
         await db.records.update(matchedRecord.id, { treatments: newTreatments });
       }

       setIsSolved(true);
       setShowSolveForm(false);
       // Trigger sync if online
       if (navigator.onLine) (window as any).performSync?.();
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-4 bg-natural-bg min-h-full pb-32">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-natural-primary font-bold hover:opacity-80">
          <ArrowLeft size={18} /> {t.dashboard}
        </button>
        {isSolved && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-200">
            <CheckCircle2 size={12} /> {t.solved}
          </div>
        )}
      </div>

      <div className="rounded-[40px] bg-white shadow-xl overflow-hidden mb-8 border border-natural-accent/10">
        <div className="relative h-56">
          <img src={result.imageUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className={cn(
            "absolute bottom-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2",
            isHealthy ? "bg-natural-primary text-white" : isSolved ? "bg-emerald-600 text-white" : d.healthStatus === "Infested" ? "bg-amber-600 text-white" : "bg-red-600 text-white"
          )}>
            {isSolved && <CheckCircle2 size={12} />}
            {isHealthy ? t.healthy : isSolved ? t.solved : d.healthStatus === "Infested" ? "Pest Detected" : t.diseased}
          </div>
        </div>
        
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-serif font-bold text-natural-primary leading-tight">{d?.plantName?.common || "Unknown Plant"}</h2>
                <p className="text-sm text-natural-accent font-medium italic mt-1">{d?.plantName?.scientific || "Scientific name unknown"}</p>
              </div>
            </div>

            {/* Resolved Info Section */}
            {isSolved && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
              >
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-2">
                  <CheckCircle2 size={16} /> Issue Resolved
                </div>
                {result.treatmentApplied && (
                  <p className="text-sm text-emerald-700 italic">"Completed: {result.treatmentApplied}"</p>
                )}
                <p className="text-[10px] text-emerald-600/60 mt-2">Closed on {new Date(result.resolvedAt || Date.now()).toLocaleDateString()}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-natural-cream p-4 rounded-2xl border border-natural-accent/5">
                <p className="text-[10px] uppercase font-bold text-natural-accent tracking-widest mb-1">Crop Type</p>
                <p className="text-sm font-bold text-natural-primary">{d?.cropType || "N/A"}</p>
              </div>
              <div className="bg-natural-cream p-4 rounded-2xl border border-natural-accent/5">
                <p className="text-[10px] uppercase font-bold text-natural-accent tracking-widest mb-1">Growth Stage</p>
                <p className="text-sm font-bold text-natural-primary">{d?.growthStage || "N/A"}</p>
              </div>
            </div>

            {!isHealthy && d?.diagnosis && (
              <div className="space-y-6">
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                  <div className="flex justify-between items-baseline mb-2">
                     <p className="font-serif text-xl font-bold text-red-900">{d.diagnosis.name || "Issue Detected"}</p>
                     <p className="text-xs font-bold text-red-600 px-2 py-0.5 bg-white rounded-full shadow-sm">{d.diagnosis.confidence || "N/A"} Match</p>
                  </div>
                  {d.diagnosis.isBeneficial && (
                     <div className="mb-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest inline-block">
                       Beneficial Insect (Don't kill)
                     </div>
                  )}
                  {d.diagnosis.description && (
                    <p className="text-sm font-medium text-red-900/70 mb-3 italic">"{d.diagnosis.description}"</p>
                  )}
                  {d.diagnosis.causes && d.diagnosis.causes.length > 0 && (
                    <p className="text-sm text-red-800/80 leading-relaxed"><b>Possible Causes:</b> {d.diagnosis.causes.join(", ")}</p>
                  )}
                </div>

                {/* Detailed Insights Section */}
                {!isHealthy && d?.diagnosis && (
                  <div className="space-y-6 pt-4">
                    {d.diagnosis.symptoms && d.diagnosis.symptoms.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-natural-accent mb-3 flex items-center gap-2">
                          <Activity size={14} /> Common Symptoms
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {d.diagnosis.symptoms.map((s, i) => (
                            <div key={i} className="text-sm bg-white p-3 rounded-xl border border-natural-accent/10 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.diagnosis.lifeCycle && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-natural-accent mb-2 flex items-center gap-2">
                          <RefreshCw size={14} /> Life Cycle
                        </h3>
                        <p className="text-sm text-natural-text/80 leading-relaxed bg-natural-tan/10 p-4 rounded-2xl border border-natural-accent/5 italic shadow-inner">
                          {d.diagnosis.lifeCycle}
                        </p>
                      </div>
                    )}

                    {d.diagnosis.regionalImpact && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-natural-accent mb-2 flex items-center gap-2">
                          <MapPin size={14} /> Regional Impact
                        </h3>
                        <p className="text-sm text-natural-text/80 leading-relaxed bg-natural-tan/10 p-4 rounded-2xl border border-natural-accent/5 shadow-inner">
                          {d.diagnosis.regionalImpact}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mark as Solved Action */}
                {!isSolved && (
                  <div className="space-y-3">
                    {!showSolveForm ? (
                      <button 
                        onClick={() => setShowSolveForm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <CheckCircle2 size={20} />
                        {t.markAsSolved}
                      </button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-xl"
                      >
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-2">{t.treatmentDetails}</label>
                        <textarea 
                          value={treatment}
                          onChange={(e) => setTreatment(e.target.value)}
                          placeholder="e.g. Applied Neem Oil spray..."
                          className="w-full p-3 bg-emerald-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-emerald-500 mb-4"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSolve}
                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md"
                          >
                            {t.solveAction}
                          </button>
                          <button 
                            onClick={() => setShowSolveForm(false)}
                            className="px-4 py-3 text-natural-text/60 font-bold"
                          >
                            {t.cancel || "Cancel"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

              {/* Scam Guard */}
              {d.advisory?.scamAlert && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="flex gap-3">
                     <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                     <div>
                        <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">Trust Guard Alert</p>
                        <p className="text-sm text-amber-800">{d.advisory.scamAlert}</p>
                     </div>
                  </div>
                </div>
              )}

              {d.advisory?.organicOptions && d.advisory.organicOptions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-natural-accent/20 pb-2">
                      <h3 className="font-serif text-xl font-bold text-natural-primary flex items-center gap-2">
                        <Leaf className="text-emerald-600" size={20} />
                        {t.organicSolutions}
                      </h3>
                      <button onClick={() => speak(d.advisory.organicOptions.join(". "))} className="p-2 bg-natural-tan text-natural-primary rounded-xl hover:bg-natural-accent/20 transition-colors">
                        <Volume2 size={18} />
                      </button>
                  </div>
                  <div className="space-y-3">
                    {d.advisory.organicOptions.map((opt: string, i: number) => (
                      <div key={i} className="flex gap-4 text-sm text-natural-text/80 bg-white p-4 rounded-2xl border border-natural-accent/10 hover:border-natural-accent transition-colors">
                        <div className="h-5 w-5 rounded-full bg-natural-accent/20 text-natural-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.advisory?.chemicalOptions && d.advisory.chemicalOptions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-natural-accent/20 pb-2 pt-4">
                      <h3 className="font-serif text-xl font-bold text-natural-primary flex items-center gap-2">
                        <FlaskConical className="text-amber-600" size={20} />
                        Chemical Control
                      </h3>
                      <button onClick={() => speak(d.advisory.chemicalOptions.join(". "))} className="p-2 bg-natural-tan text-natural-primary rounded-xl hover:bg-natural-accent/20 transition-colors">
                        <Volume2 size={18} />
                      </button>
                  </div>
                  <div className="space-y-3">
                    {d.advisory.chemicalOptions.map((opt: string, i: number) => (
                      <div key={i} className="flex gap-4 text-sm text-natural-text/80 bg-white p-4 rounded-2xl border border-natural-accent/10 hover:border-natural-accent transition-colors">
                        <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 space-y-4 pt-6 border-t border-natural-accent/10">
             <div className="p-4 bg-natural-primary text-white rounded-2xl shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-widest text-natural-accent mb-2">{t.soilIntelligence}</p>
                <p className="text-sm italic">{d.soilAdvice}</p>
             </div>

             <h3 className="font-bold text-natural-accent text-[10px] uppercase tracking-[0.2em] mb-4">Regional Advice</h3>
             {d.translations && (
               <div className="grid gap-3">
                {d.translations.shona && (
                  <div className="p-4 bg-natural-cream rounded-2xl border border-natural-accent/5">
                     <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-[10px] text-natural-accent tracking-widest">SHONA</p>
                        <button onClick={() => speak(d.translations.shona)} className="text-natural-accent"><Volume2 size={14} /></button>
                     </div>
                     <p className="text-sm italic text-natural-primary/80">{d.translations.shona}</p>
                  </div>
                )}
                {d.translations.ndebele && (
                  <div className="p-4 bg-natural-cream rounded-2xl border border-natural-accent/5">
                     <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-[10px] text-natural-accent tracking-widest">NDEBELE</p>
                        <button onClick={() => speak(d.translations.ndebele)} className="text-natural-accent"><Volume2 size={14} /></button>
                     </div>
                     <p className="text-sm italic text-natural-primary/80">{d.translations.ndebele}</p>
                  </div>
                )}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePhoneSimulator({ language }: { language: Language }) {
  const t = TRANSLATIONS[language];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'network' | 'sms', content: string }[]>([]);
  const [ussdActive, setUssdActive] = useState(false);
  const [ussdDisplay, setUssdDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(Math.random().toString(36).substring(7));

  const handleAction = async () => {
    if (!input.trim()) return;
    setLoading(true);

    if (input.startsWith('*') && input.endsWith('#')) {
      try {
        const res = await fetch('/api/ussd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current, text: input })
        });
        const text = await res.text();
        setUssdDisplay(text.replace('CON ', '').replace('END ', ''));
        setUssdActive(text.startsWith('CON'));
        if (text.startsWith('END')) setInput('');
      } catch (err) {
        setUssdDisplay("Connection error");
      }
    } else if (ussdActive) {
      try {
        const res = await fetch('/api/ussd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current, text: input })
        });
        const text = await res.text();
        setUssdDisplay(text.replace('CON ', '').replace('END ', ''));
        setUssdActive(text.startsWith('CON'));
        setInput('');
      } catch (err) {
        setUssdDisplay("Connection error");
      }
    } else {
      const userMsg = input;
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setInput('');
      try {
        const res = await fetch('/api/sms-simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userMsg })
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'sms', content: data.reply }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'sms', content: "Network error. Try again." }]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="p-4 flex flex-col items-center pb-24 h-full overflow-y-auto">
      <h2 className="text-2xl font-serif font-bold text-natural-primary mb-6 self-start">{t.smsSim}</h2>
      
      <div className="w-full max-w-[320px] bg-zinc-800 rounded-[3rem] p-4 border-4 border-zinc-700 shadow-2xl relative overflow-hidden flex flex-col" style={{ height: '600px' }}>
        <div className="w-1/3 h-6 bg-zinc-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-10" />
        
        <div className="flex-1 bg-zinc-900 rounded-[2rem] overflow-hidden flex flex-col relative mt-2">
          {ussdActive ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-zinc-100">
              <div className="w-full bg-white border border-zinc-300 p-4 rounded-lg shadow-sm">
                <p className="text-sm font-mono text-zinc-800 whitespace-pre-line text-left">
                  {ussdDisplay}
                </p>
                <div className="mt-4 flex gap-2">
                  <input 
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAction()}
                    className="flex-1 border-b-2 border-zinc-400 focus:border-zinc-800 outline-none text-sm p-1 font-mono"
                    placeholder="Reply..."
                  />
                  <button onClick={handleAction} className="bg-zinc-800 text-white px-3 py-1 rounded text-xs font-bold">SEND</button>
                </div>
              </div>
            </div>
          ) : ussdDisplay && !ussdActive ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-zinc-100">
               <div className="w-full bg-white border border-zinc-300 p-4 rounded-lg shadow-sm">
                <p className="text-sm font-mono text-zinc-800 text-left">
                  {ussdDisplay}
                </p>
                <button onClick={() => setUssdDisplay('')} className="mt-4 w-full py-2 bg-zinc-800 text-white rounded font-bold text-xs">DISMISS</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-zinc-100">
              <div className="h-8 flex justify-between items-center px-4 pt-1 opacity-60">
                 <span className="text-[10px] font-bold">AgriSmart 4G</span>
                 <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                 {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-30">
                      <MessageSquare size={32} />
                      <p className="text-[10px] font-bold uppercase mt-2">No Messages</p>
                      <p className="text-[10px] mt-1">Try: WEATHER MREWA or *143#</p>
                   </div>
                 )}
                 {messages.map((m, i) => (
                   <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-[11px] font-medium leading-normal shadow-sm",
                        m.role === 'user' ? "bg-zinc-800 text-white rounded-br-none" : "bg-white text-zinc-800 rounded-bl-none border border-zinc-200"
                      )}>
                        {m.content}
                      </div>
                   </div>
                 ))}
                 {loading && <div className="text-[10px] italic opacity-50 pl-2">Sending...</div>}
              </div>

              <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
                 <input 
                   disabled={loading}
                   value={ussdActive ? '' : input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleAction()}
                   className="flex-1 bg-zinc-100 rounded-full py-2 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                   placeholder={t.phoneInput}
                 />
                 <button 
                  onClick={handleAction}
                  disabled={loading}
                  className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-transform"
                 >
                   <Send size={16} />
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4 w-full px-4">
         <div className="bg-natural-tan/20 p-4 rounded-2xl border border-natural-accent/10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-natural-accent mb-2">Simulated Instructions</h4>
            <ul className="text-xs space-y-2 text-natural-text/80">
               <li>• Dial <span className="font-mono bg-zinc-100 px-1 font-bold">*143#</span> to open the interactive USSD menu.</li>
               <li>• Text <span className="font-mono bg-zinc-100 px-1 font-bold">PRICE [CROP]</span> (e.g. PRICE MAIZE) for market data.</li>
               <li>• Text <span className="font-mono bg-zinc-100 px-1 font-bold">WEATHER [LOC]</span> (e.g. WEATHER MUTARE) for local updates.</li>
            </ul>
         </div>
      </div>
    </div>
  );
}

function WeatherForecast({ 
  language, 
  profile, 
  onOpenLocationModal,
  onNavigateToScheduler
}: { 
  language: Language; 
  profile: FarmerProfile | null;
  onOpenLocationModal?: () => void;
  onNavigateToScheduler?: () => void;
}) {
  const t = TRANSLATIONS[language];
  const [data, setData] = useState<any>(null);
  const [scheduledWarnings, setScheduledWarnings] = useState<ScheduledAlert[]>([]);

  useEffect(() => {
    const location = profile?.region || profile?.country || 'Harare';
    const gps = profile?.gpsLocation ? `?lat=${profile.gpsLocation.lat}&lng=${profile.gpsLocation.lng}` : '';
    
    fetch(`/api/weather/${encodeURIComponent(location)}${gps}`)
      .then(res => res.ok ? res.json() : Promise.reject('Service unavailable'))
      .then(setData)
      .catch(err => console.error('Weather forecast fetch error:', err));

    db.alerts.toArray().then(all => {
      setScheduledWarnings(all.slice(0, 3));
    }).catch(() => {});
  }, [profile]);

  if (!data) return <div className="p-8 text-center text-natural-accent font-bold uppercase tracking-widest flex flex-col items-center gap-4">
    <Loader2 className="animate-spin" /> {t.analyzing}
  </div>;

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.weatherForecast}</h2>
        <div className="flex items-center gap-2">
          {onNavigateToScheduler && (
            <button
              onClick={onNavigateToScheduler}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-natural-primary text-white text-xs font-bold shadow-sm hover:bg-natural-text transition-all"
              title={t.notificationScheduler}
            >
              <Bell size={13} className="text-natural-gold" />
              <span>{t.notificationScheduler ? t.notificationScheduler.split(' ')[0] : "Alerts"}</span>
            </button>
          )}
          {onOpenLocationModal && (
            <button 
              id="weather-change-location-btn"
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-natural-tan text-natural-primary text-xs font-bold border border-natural-accent/20 hover:bg-natural-tan/70 transition-all shadow-sm"
            >
              <MapPin size={13} className="text-natural-gold" />
              <span>{profile?.region || profile?.country || t.chooseLocation}</span>
              <ChevronDown size={12} className="opacity-60" />
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-natural-primary to-natural-text rounded-[40px] p-8 text-white card-shadow overflow-hidden relative">
         <div className="absolute top-0 right-0 p-8">
            <CloudSun size={64} className="opacity-20 translate-x-4 -translate-y-4" />
         </div>
         
         <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-60">{data.location}</p>
            <div className="flex items-center gap-4 mb-4">
               <span className="text-6xl font-black">{data.temp}°C</span>
               <span className="text-lg font-serif italic text-natural-gold">{data.condition}</span>
            </div>
            
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md mb-8">
               <div className="flex items-center gap-2 mb-2 text-natural-gold">
                  <CheckCircle2 size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t.plantingWindow}</p>
               </div>
               <p className="text-sm italic leading-relaxed text-white/90">
                 "{data.advice}"
               </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-white/40 mb-1">{t.humidity}</p>
                  <p className="font-bold text-lg">65%</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-white/40 mb-1">{t.windSpeed}</p>
                  <p className="font-bold text-lg">12km/h</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-white/40 mb-1">{t.chanceOfRain}</p>
                  <p className="font-bold text-lg">40%</p>
               </div>
            </div>
         </div>
      </div>

      {/* Regional Agro-Ecological Alerts from Notification Scheduler */}
      {scheduledWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-natural-accent flex items-center gap-1.5">
              <BellRing size={14} className="text-natural-gold" />
              Regional Calendar & Hazard Forecast
            </h3>
            {onNavigateToScheduler && (
              <button 
                onClick={onNavigateToScheduler}
                className="text-xs text-natural-primary font-bold hover:underline"
              >
                Configure Settings →
              </button>
            )}
          </div>

          <div className="space-y-2">
            {scheduledWarnings.slice(0, 3).map((w, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-3xl border card-shadow flex items-start gap-3",
                  w.severity === 'critical' ? "bg-red-50 border-red-200 text-red-950" :
                  w.severity === 'warning' ? "bg-amber-50 border-amber-200 text-amber-950" :
                  "bg-emerald-50 border-emerald-200 text-emerald-950"
                )}
              >
                <div className={cn(
                  "p-2 rounded-2xl shrink-0 mt-0.5",
                  w.severity === 'critical' ? "bg-red-600 text-white" :
                  w.severity === 'warning' ? "bg-amber-600 text-white" :
                  "bg-emerald-600 text-white"
                )}>
                  {w.type === 'heavy_rainfall' ? <CloudRain size={16} /> : <CalendarDays size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-serif font-bold text-sm">{w.title}</p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/80">
                      {w.type === 'heavy_rainfall' ? 'Rain Risk' : 'Planting Window'}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">{w.message}</p>
                  {w.metadata?.actionSteps && w.metadata.actionSteps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/5 text-[11px] font-medium space-y-1">
                      {w.metadata.actionSteps.slice(0, 2).map((tip, i) => (
                        <p key={i} className="flex items-center gap-1.5 opacity-85">
                          <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                          <span>{tip}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-natural-accent pl-2">Next 3 Days</h3>
        {data.forecast.map((f: any, i: number) => (
          <div key={i} className="bg-white p-5 rounded-[32px] card-shadow border border-natural-accent/10 flex items-center justify-between">
             <span className="font-bold text-natural-primary w-12">{f.day}</span>
             <div className="flex items-center gap-4 flex-1 justify-center">
                <span className="text-xs font-medium text-natural-accent uppercase tracking-widest">{f.cond}</span>
                <span className="h-1 w-12 bg-natural-tan rounded-full relative">
                   <div className="absolute left-0 top-0 h-full bg-natural-gold rounded-full" style={{ width: '60%' }} />
                </span>
             </div>
             <span className="font-black text-natural-text text-right w-12">{f.temp}°C</span>
          </div>
        ))}
      </div>

      <div className="p-6 bg-red-50 rounded-[32px] border border-red-100 flex items-start gap-4">
         <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertTriangle size={18} />
         </div>
         <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">{t.severeWeatherAlert}</p>
            <p className="text-xs text-red-800 leading-relaxed font-medium">Night frost expected in high-altitude zones. Cover sensitive nursery seedlings.</p>
         </div>
      </div>
    </div>
  );
}

function Community({ language }: { language: Language }) {
  const t = TRANSLATIONS[language];
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = () => fetch('/api/community').then(res => res.json()).then(setPosts);
    fetchPosts();
    const interval = setInterval(fetchPosts, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.community}</h2>
        <button className="bg-natural-primary text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Post +</button>
      </div>

      <div className="space-y-4">
        {posts.map((post, i) => (
          <div key={i} className="bg-white p-5 rounded-[32px] card-shadow border border-natural-accent/10">
            <div className="flex items-center gap-3 mb-3">
               <div className="h-10 w-10 bg-natural-tan rounded-full flex items-center justify-center font-bold text-natural-primary">{post.author[0]}</div>
               <div>
                  <p className="text-sm font-bold text-natural-primary">{post.author}</p>
                  <p className="text-[10px] text-natural-accent font-medium uppercase tracking-widest">{post.region}</p>
               </div>
            </div>
            <p className="text-sm text-natural-text/80 leading-relaxed mb-4 italic">"{post.content}"</p>
            <div className="flex gap-4 border-t border-natural-accent/5 pt-3">
               <span className="text-[10px] font-bold text-natural-accent uppercase tracking-widest">👍 {post.likes}</span>
               <span className="text-[10px] font-bold text-natural-accent uppercase tracking-widest">💬 {post.replies} Replies</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-natural-tan/40 rounded-[40px] border border-dashed border-natural-accent/30 text-center">
         <p className="text-xs text-natural-text/60 italic font-medium">Join 500+ local farmers sharing knowledge daily.</p>
      </div>
    </div>
  );
}

function DiagnosisHistory({ language, profile }: { language: Language; profile?: FarmerProfile | null }) {
  const t = TRANSLATIONS[language];
  const [history, setHistory] = useState<Diagnosis[]>([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = () => db.diagnoses.orderBy('timestamp').reverse().toArray().then(setHistory);
    load();
    window.addEventListener('db-synced', load);
    return () => window.removeEventListener('db-synced', load);
  }, []);

  const handleExportAll = () => {
    if (history.length === 0) return;
    exportDiagnosesToCSV(history, profile);
    setExportFeedback(`Exported ${history.length} diagnosis records to CSV!`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const handleExportSingle = (item: Diagnosis) => {
    exportDiagnosesToCSV([item], profile);
    setExportFeedback(`Exported ${item.data.plantName.common} diagnosis report!`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  if (history.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-natural-text/40">
        <div className="bg-natural-tan p-8 rounded-full mb-6">
          <History size={48} className="text-natural-primary" />
        </div>
        <p className="font-serif text-2xl font-bold text-natural-primary mb-2">{t.noHistory}</p>
        <p className="text-sm">Diagnoses saved offline for easy access.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header with Export & Sync Actions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.history}</h2>
          <p className="text-xs text-natural-text/60 font-medium">{history.length} Offline Plant Scans</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="p-2.5 px-3 rounded-2xl bg-natural-gold/15 text-natural-primary border border-natural-gold/30 hover:bg-natural-gold/25 transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title={t.exportCSV || "Export Diagnoses to CSV"}
          >
            <FileSpreadsheet size={16} className="text-amber-700" />
            <span className="hidden sm:inline">{t.exportCSV || "Export CSV"}</span>
          </button>

          <button 
            onClick={() => (window as any).performSync?.()}
            className="p-2.5 rounded-2xl bg-natural-tan text-natural-primary hover:bg-natural-tan/70 transition-colors shadow-xs"
            title="Sync Records"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Export Notification Banner */}
      {exportFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button onClick={() => setExportFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Diagnosis Cards */}
      <div className="grid gap-4">
        {history.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-[32px] shadow-sm border border-natural-accent/10 card-shadow">
            <img src={item.imageUrl} className="h-24 sm:h-20 w-full sm:w-20 rounded-[20px] object-cover shrink-0" alt="Scanned Plant" />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold truncate text-natural-primary font-serif text-lg">{item.data.plantName.common}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.synced ? (
                      <Cloud size={14} className="text-emerald-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                      item.data.healthStatus === "Healthy" ? "bg-natural-primary/10 text-natural-primary" : item.resolved ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {item.resolved && <CheckCircle2 size={10} />}
                      {item.data.healthStatus === "Healthy" ? (t.healthy) : item.resolved ? t.solved : dShortName(item.data.diagnosis.name)}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-natural-text/50 font-medium mt-0.5 uppercase tracking-widest">
                  {new Date(item.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>

                {item.data.diagnosis.name && item.data.healthStatus !== "Healthy" && (
                  <p className="text-xs text-natural-text/80 mt-1.5 font-medium line-clamp-1">
                    <span className="font-bold text-natural-primary">Issue:</span> {item.data.diagnosis.name}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-natural-accent/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedDiagnosis(item)}
                    className="text-xs font-bold text-natural-primary bg-natural-tan/70 hover:bg-natural-tan px-4 py-1.5 rounded-xl transition-colors"
                  >
                    View Full Report
                  </button>

                  <button
                    onClick={() => handleExportSingle(item)}
                    className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    title="Export single diagnosis to CSV"
                  >
                    <FileSpreadsheet size={13} />
                    <span>CSV</span>
                  </button>
                </div>

                <button
                  onClick={async () => {
                    if (item.id) {
                      await db.diagnoses.update(item.id, { resolved: !item.resolved, synced: false });
                      const updated = await db.diagnoses.orderBy('timestamp').reverse().toArray();
                      setHistory(updated);
                    }
                  }}
                  className={cn(
                    "text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors",
                    item.resolved 
                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                      : "text-natural-accent hover:text-natural-primary bg-natural-tan/30 hover:bg-natural-tan/60"
                  )}
                >
                  {item.resolved ? "✓ Resolved" : "Mark Resolved"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Diagnosis Detail Modal */}
      {selectedDiagnosis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-white rounded-[36px] card-shadow border border-natural-accent/10 overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
          >
            {/* Modal Header */}
            <div className="p-5 bg-natural-primary text-white flex items-center justify-between border-b border-natural-accent/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-natural-gold">
                  <Leaf size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg leading-tight">
                    {selectedDiagnosis.data.plantName.common}
                  </h3>
                  <p className="text-[10px] text-white/70 font-medium">
                    {new Date(selectedDiagnosis.timestamp).toLocaleDateString()} • {selectedDiagnosis.data.plantName.scientific || "Plant Scan"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDiagnosis(null)}
                className="h-9 w-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex gap-4 items-center bg-natural-tan/20 p-4 rounded-3xl border border-natural-accent/10">
                <img src={selectedDiagnosis.imageUrl} className="h-20 w-20 rounded-2xl object-cover shrink-0" alt="Plant" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      selectedDiagnosis.data.healthStatus === "Healthy" ? "bg-natural-primary/15 text-natural-primary" : "bg-red-100 text-red-700"
                    )}>
                      {selectedDiagnosis.data.healthStatus}
                    </span>
                    {selectedDiagnosis.data.diagnosis.confidence && (
                      <span className="text-[10px] text-natural-text/60 font-bold">
                        {selectedDiagnosis.data.diagnosis.confidence} Confidence
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif font-bold text-base text-natural-primary mt-1">
                    {selectedDiagnosis.data.diagnosis.name || "Healthy Plant"}
                  </h4>
                </div>
              </div>

              {/* Causes / Description */}
              {selectedDiagnosis.data.diagnosis.causes && selectedDiagnosis.data.diagnosis.causes.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-natural-accent">Identified Causes & Field Factors</h5>
                  <ul className="text-xs text-natural-text/80 space-y-1 bg-natural-tan/10 p-3 rounded-2xl">
                    {selectedDiagnosis.data.diagnosis.causes.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 font-medium">
                        <span className="text-natural-accent font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Organic Treatment */}
              {selectedDiagnosis.data.advisory?.organicOptions && selectedDiagnosis.data.advisory.organicOptions.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Sprout size={14} className="text-emerald-600" />
                    <span>Organic & Cultural Remedies</span>
                  </h5>
                  <ul className="text-xs text-natural-text/90 space-y-1 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                    {selectedDiagnosis.data.advisory.organicOptions.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-700 font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chemical Control */}
              {selectedDiagnosis.data.advisory?.chemicalOptions && selectedDiagnosis.data.advisory.chemicalOptions.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FlaskConical size={14} className="text-amber-700" />
                    <span>Chemical Treatment (Extension Guidance)</span>
                  </h5>
                  <ul className="text-xs text-natural-text/90 space-y-1 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100">
                    {selectedDiagnosis.data.advisory.chemicalOptions.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-700 font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prevention Steps */}
              {selectedDiagnosis.data.advisory?.prevention && selectedDiagnosis.data.advisory.prevention.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-natural-primary flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-natural-gold" />
                    <span>Preventative Measures</span>
                  </h5>
                  <ul className="text-xs text-natural-text/90 space-y-1 bg-natural-tan/20 p-3.5 rounded-2xl border border-natural-accent/10">
                    {selectedDiagnosis.data.advisory.prevention.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-natural-primary font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-natural-tan/20 border-t border-natural-accent/10 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleExportSingle(selectedDiagnosis);
                }}
                className="px-4 py-2.5 bg-white hover:bg-natural-gold/15 text-natural-primary border border-natural-accent/20 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
              >
                <FileSpreadsheet size={15} className="text-amber-700" />
                <span>Export Report (.CSV)</span>
              </button>

              <button
                onClick={() => setSelectedDiagnosis(null)}
                className="px-5 py-2.5 bg-natural-primary text-white rounded-2xl text-xs font-bold hover:bg-natural-primary/90 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function dShortName(name?: string) {
  if (!name) return "";
  if (name.length > 15) return name.substring(0, 15) + "...";
  return name;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  images?: AgriImage[];
  timestamp?: number;
  isGeneratingImage?: boolean;
}

function AgriChat({ language, profile }: { language: Language; profile: FarmerProfile | null }) {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [requestVisuals, setRequestVisuals] = useState(false);
  const [inspectingImage, setInspectingImage] = useState<AgriImage | null>(null);
  const [generatingForMsgId, setGeneratingForMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const farmLocation = `${profile?.region || 'Harare'}, ${profile?.country || 'Zimbabwe'}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const QUICK_PROMPTS = [
    { label: "🐛 Fall Armyworm", query: "Show me what Fall Armyworm caterpillar looks like on maize and how to control it" },
    { label: "🍂 Tomato Early Blight", query: "Show me tomato early blight symptoms and photo reference" },
    { label: "💧 Drip Irrigation Setup", query: "Show me a drip irrigation layout diagram and water saving tips" },
    { label: "🌱 Nitrogen Deficiency", query: "Show me how nitrogen deficiency looks on maize leaves" },
    { label: "🪱 Compost Layering", query: "Show me how to layer a thermal compost pile with pictures" },
    { label: "🚜 Pfumvudza Basins", query: "Show me Pfumvudza conservation agriculture planting basins" },
    { label: "🌽 Mature Maize Cob", query: "Show me healthy mature maize cobs and harvest maturity signs" }
  ];

  const handleSend = async (text: string = input, forceImage: boolean = requestVisuals) => {
    if (!text.trim()) return;
    const queryText = text.trim();
    const userMsgId = 'user-' + Date.now();
    const userMsg: ChatMessage = { 
      id: userMsgId, 
      role: 'user', 
      content: queryText,
      timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const checkNeedImage = forceImage || isImageRequest(queryText);

    try {
      // Primary: Server-side API with Gemini & visual routing
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          language,
          location: farmLocation,
          requestedImage: checkNeedImage
        })
      });

      if (res.ok) {
        const data = await res.json();
        let deliveredImages: AgriImage[] = data.images || [];

        // If user asked for an image and server returned none, check client database
        if (checkNeedImage && deliveredImages.length === 0) {
          deliveredImages = findMatchingAgriImages(queryText, 2);
        }

        const modelMsg: ChatMessage = {
          id: 'model-' + Date.now(),
          role: 'model',
          content: data.reply || "Here is the agricultural advisory for your query.",
          images: deliveredImages.length > 0 ? deliveredImages : undefined,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, modelMsg]);
      } else {
        throw new Error("Server chat endpoint returned non-200 status");
      }
    } catch (error) {
      console.warn("Server chat call failed or offline mode triggered, using local AI fallback:", error);
      
      // Offline / Direct Client Fallback with full image support
      let localImages: AgriImage[] = [];
      if (checkNeedImage) {
        localImages = findMatchingAgriImages(queryText, 2);
      }

      try {
        const chatPrompt = `Respond as an expert Southern African agricultural advisor for a farmer in ${farmLocation}.
        Language: ${language}. Keep advice practical, actionable, and low-cost.
        ${checkNeedImage ? 'The user is requesting visual/photo guidance. Describe what the plant/pest looks like in detail and refer to the attached visual card.' : ''}
        User message: ${queryText}`;

         const response = await getAI().models.generateContent({
          model: "gemini-3.7-flash",
          contents: [
            ...messages.slice(-4).map(m => ({ 
              role: m.role as 'user' | 'model', 
              parts: [{ text: m.content }] 
            })),
            { role: 'user', parts: [{ text: chatPrompt }] }
          ]
        });

        setMessages(prev => [...prev, {
          id: 'model-' + Date.now(),
          role: 'model',
          content: response.text || "I have prepared the requested agricultural advice.",
          images: localImages.length > 0 ? localImages : undefined,
          timestamp: Date.now()
        }]);
      } catch (clientErr) {
        console.error("Local Gemini fallback also failed:", clientErr);
        
        let offlineReply = `**AgriSmart Advisory (${language})**\n\nFor your question regarding **${queryText}**, please monitor crop conditions closely in **${farmLocation}**.\n\n`;
        if (localImages.length > 0) {
          offlineReply += `Visual reference card for **${localImages[0].title}** is attached below.\n\n**Visual Symptoms & Tips:**\n${localImages[0].symptomsOrTips?.map(s => `- ${s}`).join('\n') || '- Inspect leaves regularly.'}`;
        } else {
          offlineReply += `Ensure adequate soil moisture, crop scouting every 3 days, and consult your local Agritex extension officer.`;
        }

        setMessages(prev => [...prev, {
          id: 'model-' + Date.now(),
          role: 'model',
          content: offlineReply,
          images: localImages.length > 0 ? localImages : undefined,
          timestamp: Date.now()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomImage = async (msgId: string, promptText: string) => {
    setGeneratingForMsgId(msgId);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          const newImg: AgriImage = {
            id: 'custom-' + Date.now(),
            title: data.title || `Visual Guide: ${promptText.slice(0, 35)}`,
            category: 'technique',
            description: data.description || `Generated high-resolution agricultural visual reference for "${promptText}".`,
            url: data.imageUrl,
            tags: ['ai-generated', 'custom'],
            credit: data.isAiGenerated ? 'AgriSmart AI Visual Generator' : 'Agricultural Visual Reference'
          };

          setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
              return {
                ...m,
                images: [...(m.images || []), newImg]
              };
            }
            return m;
          }));
        }
      }
    } catch (e) {
      console.error("Failed to generate custom visual:", e);
    } finally {
      setGeneratingForMsgId(null);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'English' ? 'en-US' : language === 'Swahili' ? 'sw-TZ' : 'sn-ZW';
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
    }
  };

  const getCategoryColor = (category: AgriImage['category']) => {
    switch (category) {
      case 'pest': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'disease': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'deficiency': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'technique': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'crop': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'soil': return 'bg-amber-900/10 text-amber-900 border-amber-300';
      case 'livestock': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      default: return 'bg-natural-primary/10 text-natural-primary border-natural-primary/20';
    }
  };

  return (
    <div className="flex h-full flex-col p-3 sm:p-4 bg-natural-bg">
      {/* Quick Visual Chips Header */}
      <div className="mb-3 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] font-black uppercase tracking-wider text-natural-accent flex items-center gap-1 pl-1">
            <ImageIcon size={12} className="text-natural-gold" /> {t.visualGuide}:
          </span>
          {QUICK_PROMPTS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.query, true)}
              disabled={loading}
              className="bg-white hover:bg-natural-primary hover:text-white text-natural-primary px-3 py-1.5 rounded-full text-xs font-semibold border border-natural-accent/15 shadow-sm transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
        {/* Welcome Greeting */}
        <div className="bg-white p-5 rounded-[28px] card-shadow border border-natural-accent/15">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="h-9 w-9 bg-natural-primary rounded-2xl flex items-center justify-center text-natural-gold shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-natural-primary text-sm">AgriSmart AI Advisor</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Visual AI Active
                </span>
              </div>
              <p className="text-[11px] text-natural-accent font-medium">
                📍 {farmLocation} • {language}
              </p>
            </div>
          </div>
          <p className="text-sm text-natural-text/80 leading-relaxed">
            Hello! I am your AI Agricultural Assistant. Ask me anything about crop diseases, pest identification, fertilizers, or farming techniques. <strong className="text-natural-primary font-semibold">I can now provide visual photo guides and diagrams</strong> whenever you ask for images or identify pests/diseases!
          </p>
        </div>

        {/* Message Bubble List */}
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex flex-col",
              m.role === 'user' ? "items-end" : "items-start"
            )}
          >
            <div className={cn(
              "max-w-[92%] sm:max-w-[85%] rounded-[28px] p-5 text-sm shadow-sm",
              m.role === 'user' 
                ? "bg-natural-primary text-white rounded-br-none" 
                : "bg-white text-natural-text rounded-bl-none border border-natural-accent/15 font-medium card-shadow"
            )}>
              {/* Text content with Markdown */}
              <div className="markdown-body text-sm leading-relaxed">
                <Markdown>{m.content}</Markdown>
              </div>

              {/* Model Message Attached Images */}
              {m.images && m.images.length > 0 && (
                <div className="mt-4 pt-3 border-t border-natural-accent/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-natural-accent flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-natural-gold" />
                      {t.visualReference} ({m.images.length})
                    </span>
                    <span className="text-[10px] text-natural-text/50 font-medium italic">
                      Tap photo to zoom & inspect
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {m.images.map((img, imgIdx) => (
                      <div 
                        key={imgIdx} 
                        className="bg-natural-bg/70 rounded-2xl overflow-hidden border border-natural-accent/20 group hover:border-natural-gold transition-all"
                      >
                        {/* Image Preview Container */}
                        <div 
                          onClick={() => setInspectingImage(img)}
                          className="relative aspect-video w-full overflow-hidden bg-stone-100 cursor-pointer"
                        >
                          <img 
                            src={img.url} 
                            alt={img.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                            <span className="text-white text-xs font-bold flex items-center gap-1">
                              <Maximize2 size={14} /> {t.inspectImage}
                            </span>
                            <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              HD Photo
                            </span>
                          </div>

                          <div className="absolute top-2 left-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-md",
                              getCategoryColor(img.category)
                            )}>
                              {img.category}
                            </span>
                          </div>
                        </div>

                        {/* Image Details Card */}
                        <div className="p-3.5 space-y-2">
                          <h4 className="font-bold text-natural-primary text-xs leading-snug line-clamp-1">
                            {img.title}
                          </h4>
                          <p className="text-[11px] text-natural-text/75 leading-relaxed line-clamp-2">
                            {img.description}
                          </p>

                          {/* Quick Symptoms / Field Checklist */}
                          {img.symptomsOrTips && img.symptomsOrTips.length > 0 && (
                            <div className="bg-white/80 p-2 rounded-xl border border-natural-accent/10 space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-wider text-natural-accent">
                                {t.symptomsToCheck}:
                              </p>
                              <ul className="text-[10px] text-natural-text/80 space-y-0.5">
                                {img.symptomsOrTips.slice(0, 2).map((tip, tipIdx) => (
                                  <li key={tipIdx} className="flex items-start gap-1">
                                    <Check size={10} className="text-emerald-600 mt-0.5 shrink-0" />
                                    <span className="line-clamp-1">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setInspectingImage(img)}
                              className="flex-1 bg-natural-primary text-white py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-natural-primary/90 transition-colors"
                            >
                              <Eye size={12} />
                              <span>{t.inspectImage}</span>
                            </button>
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              download={`${img.title.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                              className="p-1.5 bg-natural-tan text-natural-primary rounded-xl hover:bg-natural-accent/20 transition-colors"
                              title={t.downloadImage}
                            >
                              <Download size={13} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Message Utility Bar */}
              {m.role === 'model' && (
                <div className="mt-3 pt-2 border-t border-natural-accent/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const u = new SpeechSynthesisUtterance(m.content);
                        window.speechSynthesis.speak(u);
                      }}
                      className="text-natural-accent hover:text-natural-primary flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Volume2 size={12} /> Play Audio
                    </button>
                  </div>

                  {/* Generate / Request Visual Button */}
                  <button
                    onClick={() => handleGenerateCustomImage(m.id, m.content.slice(0, 60))}
                    disabled={generatingForMsgId === m.id}
                    className="bg-natural-tan hover:bg-natural-accent/20 text-natural-primary px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    {generatingForMsgId === m.id ? (
                      <>
                        <Loader2 size={11} className="animate-spin text-natural-gold" />
                        <span>Generating Visual...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={11} className="text-natural-gold" />
                        <span>{t.generateImage}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-[24px] border border-natural-accent/15 max-w-fit card-shadow">
            <Loader2 className="animate-spin h-4 w-4 text-natural-gold" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-natural-primary">AgriSmart AI Thinking...</p>
              <p className="text-[10px] text-natural-accent font-medium">Formulating advice & fetching visual references</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="mt-auto space-y-2">
        {/* Toggle Visual Request Bar */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => setRequestVisuals(!requestVisuals)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border",
              requestVisuals 
                ? "bg-natural-primary text-white border-natural-primary shadow-sm" 
                : "bg-white text-natural-accent border-natural-accent/20 hover:text-natural-primary"
            )}
          >
            <ImageIcon size={13} className={requestVisuals ? "text-natural-gold" : ""} />
            <span>{t.requestImagePrompt}</span>
            {requestVisuals && <Check size={12} className="text-natural-gold ml-0.5" />}
          </button>

          <span className="text-[10px] text-natural-text/50 font-medium">
            💡 Tip: Ask "Show me..." for photos
          </span>
        </div>

        {/* Text Input Container */}
        <div className="flex gap-2 p-2 bg-white rounded-[32px] card-shadow border border-natural-accent/15">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={requestVisuals ? "Ask for any crop photo, pest, or visual guide..." : "Ask an agricultural question or request images..."}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="w-full bg-transparent py-3.5 pl-4 pr-12 text-sm focus:outline-none text-natural-primary placeholder:text-natural-text/40 font-medium"
            />
            <button 
              onClick={toggleMic}
              title="Voice Input"
              className={cn(
                "absolute right-2 top-2 p-2 rounded-2xl transition-all",
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-natural-tan text-natural-accent hover:bg-natural-accent/15"
              )}
            >
              <Mic size={18} />
            </button>
          </div>

          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-natural-primary text-white px-5 rounded-[24px] hover:bg-natural-text active:scale-95 transition-all shadow-md disabled:opacity-40 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Inspector Modal */}
      {inspectingImage && (
        <AgriImageInspectorModal 
          image={inspectingImage}
          language={language}
          onClose={() => setInspectingImage(null)}
        />
      )}
    </div>
  );
}

/**
 * Interactive Lightbox Inspector for Fullscreen Agricultural Image Analysis
 */
function AgriImageInspectorModal({ 
  image, 
  language, 
  onClose 
}: { 
  image: AgriImage; 
  language: Language; 
  onClose: () => void; 
}) {
  const t = TRANSLATIONS[language];
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="w-full max-w-3xl bg-white rounded-[36px] overflow-hidden shadow-2xl border border-natural-accent/20 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 bg-natural-primary text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-natural-gold">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg leading-tight line-clamp-1">{image.title}</h3>
                <span className="bg-natural-gold text-natural-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {image.category}
                </span>
              </div>
              <p className="text-[11px] text-white/70 font-medium">AgriSmart High-Resolution Visual Inspector</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image Stage with Zoom Controls */}
          <div className="relative rounded-[28px] overflow-hidden bg-stone-900 border border-stone-800 flex items-center justify-center min-h-[260px] max-h-[380px]">
            <div className="overflow-auto w-full h-full flex items-center justify-center p-2">
              <img 
                src={image.url} 
                alt={image.title}
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
                className="max-h-[360px] object-contain rounded-xl select-none"
              />
            </div>

            {/* Floating Zoom Controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 text-white">
              <button 
                onClick={handleZoomOut}
                disabled={zoom <= 0.75}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-30"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button 
                onClick={handleResetZoom}
                className="px-2 py-1 text-[11px] font-bold hover:bg-white/20 rounded-xl transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button 
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-30"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          {/* Detailed Visual Description */}
          <div className="bg-natural-tan/30 p-4 rounded-[24px] border border-natural-accent/15 space-y-2">
            <h4 className="font-bold text-natural-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-natural-gold" />
              Detailed Visual Characteristics
            </h4>
            <p className="text-sm text-natural-text/90 leading-relaxed font-medium">
              {image.description}
            </p>
          </div>

          {/* Key Symptoms / Checklist */}
          {image.symptomsOrTips && image.symptomsOrTips.length > 0 && (
            <div className="bg-white p-4 rounded-[24px] border border-natural-accent/15 card-shadow space-y-2.5">
              <h4 className="font-bold text-natural-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                {t.symptomsToCheck}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {image.symptomsOrTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-xs text-emerald-950 font-medium leading-tight">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                const u = new SpeechSynthesisUtterance(`${image.title}. ${image.description}. Key symptoms: ${image.symptomsOrTips?.join('. ') || ''}`);
                window.speechSynthesis.speak(u);
              }}
              className="bg-natural-tan hover:bg-natural-accent/20 text-natural-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Volume2 size={14} />
              <span>Read Aloud</span>
            </button>

            <div className="flex items-center gap-2">
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                download={`${image.title.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                className="bg-natural-primary hover:bg-natural-text text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Download size={14} />
                <span>{t.downloadImage}</span>
              </a>
              <button
                onClick={onClose}
                className="bg-stone-200 hover:bg-stone-300 text-natural-text px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SoilIntelligence({ language }: { language: Language }) {
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [targetCrop, setTargetCrop] = useState('');
  const [details, setDetails] = useState({
    color: '',
    texture: '',
    smell: '',
    additional: ''
  });

  const crops = [
    'Maize', 'Wheat', 'Soybeans', 'Tobacco', 'Cotton', 'Sugarcane', 
    'Sunflower', 'Potatoes', 'Tomatoes', 'Cabbage', 'Sorghum', 'Millets',
    'Groundnuts', 'Beans', 'Rice', 'Paprika', 'Onions'
  ];

  const analyzeSoil = async () => {
    if (!details.color && !details.texture) return;
    setLoading(true);
    try {
      const prompt = `
        You are an agricultural soil expert specializing in African soil types.
        Analyze the following soil sample details and provide a report in ${language}.
        ${targetCrop ? `The farmer is specifically interested in growing: ${targetCrop}. Tailor the advice for this crop.` : ''}
        
        SOIL DETAILS:
        - Color: ${details.color}
        - Texture: ${details.texture}
        - Smell: ${details.smell}
        - Additional Notes: ${details.additional}
        
        The response MUST be in JSON format:
        {
          "soilType": "string (estimated type)",
          "analysis": "string (brief scientific analysis based on description)",
          "suitability": ["list of crops that grow well in this soil"],
          "improvement": ["list of organic and practical ways to improve this soil"],
          "caution": "string (any potential issues like drainage or acidity)",
          "cropSpecificAdvice": "string (only if a specific crop was mentioned, provide tailored advice for it)"
        }
      `;

       const res = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      if (res.text) {
        const parsed = JSON.parse(res.text);
        setResult(parsed);
        try {
          await db.soilTests.add({
            timestamp: Date.now(),
            color: details.color,
            texture: details.texture,
            smell: details.smell,
            additional: details.additional,
            targetCrop: targetCrop || undefined,
            soilType: parsed.soilType || 'Analyzed Soil',
            analysis: parsed.analysis || '',
            suitability: parsed.suitability || [],
            improvement: parsed.improvement || [],
            caution: parsed.caution,
            cropSpecificAdvice: parsed.cropSpecificAdvice
          });
        } catch (dbErr) {
          console.warn("Failed to persist soil test to local db:", dbErr);
        }
      }
    } catch (err) {
      console.error("Soil Analysis Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.soil}</h2>
      
      {!result ? (
        <div className="bg-white p-6 rounded-[32px] card-shadow border border-natural-accent/10 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent block mb-2">{t.soilTargetCrop}</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-natural-tan/10 rounded-xl border border-natural-accent/5">
                {crops.map(c => (
                  <button 
                    key={c}
                    onClick={() => setTargetCrop(targetCrop === c ? '' : c)}
                    className={cn(
                      "py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      targetCrop === c ? "bg-natural-primary text-white border-natural-primary shadow-sm" : "bg-white border-natural-accent/10 text-natural-primary hover:bg-natural-tan/20"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent block mb-2">Soil Color</label>
              <div className="grid grid-cols-3 gap-2">
                {['Dark/Black', 'Red', 'Light Brown', 'Grey', 'Yellow', 'White'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setDetails(prev => ({ ...prev, color: c }))}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                      details.color === c ? "bg-natural-primary text-white border-natural-primary shadow-md" : "bg-natural-tan/30 border-natural-accent/10 text-natural-primary"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent block mb-2">Texture</label>
              <div className="grid grid-cols-2 gap-2">
                {['Sandy (Gritty)', 'Clay (Sticky)', 'Loamy (Smooth)', 'Stony/Gravelly'].map(tx => (
                  <button 
                    key={tx}
                    onClick={() => setDetails(prev => ({ ...prev, texture: tx }))}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                      details.texture === tx ? "bg-natural-primary text-white border-natural-primary shadow-md" : "bg-natural-tan/30 border-natural-accent/10 text-natural-primary"
                    )}
                  >
                    {tx}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent block mb-2">Smell</label>
              <div className="grid grid-cols-2 gap-2">
                {['Earthy/Fresh', 'Sour/Rotten', 'Metallic', 'No Smell'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setDetails(prev => ({ ...prev, smell: s }))}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                      details.smell === s ? "bg-natural-primary text-white border-natural-primary shadow-md" : "bg-natural-tan/30 border-natural-accent/10 text-natural-primary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent block mb-2">Other Details</label>
              <textarea 
                value={details.additional}
                onChange={e => setDetails(prev => ({ ...prev, additional: e.target.value }))}
                placeholder="e.g. many worms, very dry, hard to dig..."
                className="w-full bg-natural-tan/30 rounded-2xl p-4 text-sm focus:outline-none border border-natural-accent/10 min-h-[100px]"
              />
            </div>
          </div>

          <button 
            onClick={analyzeSoil}
            disabled={loading || (!details.color && !details.texture)}
            className="w-full bg-natural-primary text-white py-4 rounded-[24px] font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sprout size={20} />}
            {t.soilAnalyzeAction}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-natural-brown rounded-[40px] p-8 text-white card-shadow overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12" />
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t.soilIntelligence}</h3>
               <button onClick={() => setResult(null)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
               <div className="h-16 w-16 bg-natural-gold rounded-3xl flex items-center justify-center text-4xl shadow-lg">🏺</div>
               <div>
                  <p className="text-2xl font-serif font-bold mb-1">{result.soilType}</p>
                  <p className="text-xs text-natural-accent font-medium italic">Estimated from characteristics</p>
               </div>
            </div>

            <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md mb-8">
               <p className="text-sm italic leading-relaxed text-white/90">
                 "{result.analysis}"
               </p>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <CheckCircle2 size={16} className="text-natural-gold" />
                     <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t.cropSuitability}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {result.suitability.map((crop: string, i: number) => (
                       <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium border border-white/10">{crop}</span>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          {/* Direct CTA: Plan Crop Rotation based on this Soil */}
          <div className="bg-gradient-to-r from-emerald-800 to-natural-primary text-white p-5 rounded-[32px] card-shadow flex items-center justify-between">
            <div className="space-y-1 max-w-[70%]">
              <div className="flex items-center gap-1.5 text-natural-gold text-[10px] font-black uppercase tracking-widest">
                <RotateCw size={13} />
                <span>Next Best Action</span>
              </div>
              <h4 className="font-serif font-bold text-base">Plan Strategic Crop Rotation</h4>
              <p className="text-xs text-white/80 font-medium">
                Design a multi-season sequence tailored for {result.soilType}.
              </p>
            </div>
            <button
              onClick={() => setShowRotationModal(true)}
              className="px-4 py-3 bg-natural-gold text-white rounded-2xl text-xs font-bold shadow-lg hover:bg-natural-gold/90 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>{t.cropRotation}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white p-6 rounded-[32px] card-shadow border border-natural-accent/10 space-y-4">
             <div className="flex items-center gap-2 border-b border-natural-accent/10 pb-2">
                <LayoutDashboard size={20} className="text-natural-primary" />
                <h3 className="font-serif font-bold text-lg text-natural-primary">{t.soilImprovement}</h3>
             </div>
             <div className="space-y-4">
                {result.improvement.map((tip: string, i: number) => (
                  <div key={i} className="flex gap-4 p-4 bg-natural-tan/20 rounded-2xl border border-natural-accent/5">
                     <div className="h-6 w-6 rounded-full bg-natural-primary text-white flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                     <p className="text-sm text-natural-text/80 font-medium leading-relaxed">{tip}</p>
                  </div>
                ))}
             </div>
             {result.cropSpecificAdvice && (
               <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                     <Target size={20} className="text-emerald-700" />
                     <h4 className="font-serif font-bold text-emerald-900">Tailored {targetCrop} Advice</h4>
                  </div>
                  <p className="text-sm text-emerald-800 leading-relaxed font-medium italic">
                    {result.cropSpecificAdvice}
                  </p>
               </div>
             )}
             {result.caution && (
               <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 mt-4">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <p className="text-xs text-red-800 font-medium italic">{result.caution}</p>
               </div>
             )}
          </div>
        </motion.div>
      )}

      {/* Rotation Planner Modal from Soil view */}
      {showRotationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
          <div className="bg-[#FAF7F2] w-full max-w-xl rounded-[36px] p-6 shadow-2xl relative border border-natural-accent/20 my-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-natural-primary text-white rounded-xl">
                  <RotateCw size={18} />
                </div>
                <h3 className="font-serif font-bold text-lg text-natural-primary">{t.cropRotation}</h3>
              </div>
              <button 
                onClick={() => setShowRotationModal(false)}
                className="p-2 text-natural-accent hover:text-natural-primary hover:bg-natural-tan/40 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <CropRotationPlanner 
              language={language} 
              initialSoilContext={result?.soilType} 
              onNavigateToRecords={() => setShowRotationModal(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
