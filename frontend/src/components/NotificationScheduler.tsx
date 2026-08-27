import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  CloudRain, 
  Sprout, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Sparkles, 
  ChevronRight, 
  X, 
  Check, 
  ShieldAlert, 
  Droplets, 
  Layers, 
  MapPin, 
  Plus, 
  Eye, 
  Trash2,
  CalendarDays,
} from 'lucide-react';
import { db, type ScheduledAlert, type NotificationSettings, type FarmerProfile } from '../db';
import { 
  evaluatePlantingWindows, 
  evaluateLiveWeatherWarnings,
  fetchLiveWeatherForNotifications,
  runLocalNotificationScheduler, 
  type LiveWeatherWarningData,
  getRegionCategory
} from '../notificationScheduler';
import { TRANSLATIONS, type Language } from '../translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NotificationSchedulerProps {
  language: Language;
  profile: FarmerProfile | null;
  onOpenLocationModal?: () => void;
  onNavigateToRecords?: () => void;
}

export function NotificationScheduler({
  language,
  profile,
  onOpenLocationModal,
  onNavigateToRecords
}: NotificationSchedulerProps) {
  const t = TRANSLATIONS[language];
  const [alerts, setAlerts] = useState<ScheduledAlert[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'planting' | 'rainfall' | 'settings'>('alerts');
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [liveWeather, setLiveWeather] = useState<LiveWeatherWarningData | null>(null);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<ScheduledAlert | null>(null);

  // Evaluate current windows & hazards
  const currentDate = new Date();
  const { activePlantingCrops, upcomingPlantingCrops, currentSeasonPhase } = evaluatePlantingWindows(
    currentDate,
    profile,
    settings?.leadTimeDays || 14
  );
  const liveWarnings = evaluateLiveWeatherWarnings(liveWeather, settings?.rainfallThresholdMm || 45);
  const liveRainWarnings = liveWarnings.filter(warning => warning.type === 'heavy_rainfall');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      let currentSettings = await db.notificationSettings.toCollection().first();
      if (!currentSettings) {
        currentSettings = {
          enabled: true,
          soundEnabled: true,
          browserPushEnabled: true,
          notifyPlantingWindows: true,
          notifyHeavyRainfall: true,
          notifyPestAlerts: true,
          leadTimeDays: 14,
          rainfallThresholdMm: 45,
          lastCheckTimestamp: Date.now()
        };
        await db.notificationSettings.add(currentSettings);
      }
      setSettings(currentSettings);
      setLiveWeather(await fetchLiveWeatherForNotifications(profile));

      const refreshedAlerts = await runLocalNotificationScheduler(profile);
      setAlerts(refreshedAlerts);
    } catch (err) {
      console.error("Failed loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert("Web Notifications are not supported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    setPermissionStatus(perm);
    if (settings) {
      const updated = { ...settings, browserPushEnabled: perm === 'granted' };
      await db.notificationSettings.where('id').equals(settings.id!).modify(updated);
      setSettings(updated);
    }
  };

  const handleUpdateSetting = async (key: keyof NotificationSettings, val: any) => {
    if (!settings?.id) return;
    const updated = { ...settings, [key]: val };
    await db.notificationSettings.where('id').equals(settings.id).modify({ [key]: val });
    setSettings(updated);

    if (key === 'leadTimeDays' || key === 'rainfallThresholdMm' || key === 'notifyPlantingWindows' || key === 'notifyHeavyRainfall' || key === 'notifyPestAlerts') {
      const refreshed = await runLocalNotificationScheduler(profile);
      setAlerts(refreshed);
    }
  };

  const handleMarkAsRead = async (id?: number) => {
    if (!id) return;
    await db.alerts.where('id').equals(id).modify({ isRead: true });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  };

  const handleMarkAllAsRead = async () => {
    await db.alerts.toCollection().modify({ isRead: true });
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  };

  const handleMarkAsActioned = async (id?: number) => {
    if (!id) return;
    await db.alerts.where('id').equals(id).modify({ isActioned: true, isRead: true });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActioned: true, isRead: true } : a));
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  };

  const handleSnooze = async (id?: number, days: number = 1) => {
    if (!id) return;
    const snoozedUntil = Date.now() + days * 24 * 60 * 60 * 1000;
    await db.alerts.where('id').equals(id).modify({ snoozedUntil, isRead: true });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, snoozedUntil, isRead: true } : a));
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  };

  const handleDeleteAlert = async (id?: number) => {
    if (!id) return;
    await db.alerts.delete(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (selectedAlertForModal?.id === id) {
      setSelectedAlertForModal(null);
    }
    window.dispatchEvent(new CustomEvent('alerts-updated'));
  };


  const unreadCount = alerts.filter(a => !a.isRead && !a.isActioned && (!a.snoozedUntil || a.snoozedUntil < Date.now())).length;

  return (
    <div className="p-3 sm:p-5 space-y-5 pb-24 h-full overflow-y-auto">
      {/* Header & Regional Context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-natural-primary flex items-center gap-2">
              <BellRing className="text-natural-gold" size={24} />
              <span>{t.notificationScheduler || "Notification Scheduler"}</span>
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {unreadCount} {t.new || "New"}
              </span>
            )}
          </div>
          <p className="text-xs text-natural-text/65 font-medium mt-0.5">
            {t.schedulerSubtitle || "Live weather warnings and regional planting guidance"}
          </p>
        </div>

        {/* Location badge & switch */}
        <div className="flex items-center gap-2">
          {onOpenLocationModal && (
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-natural-accent/20 text-xs font-bold text-natural-primary hover:bg-natural-tan transition-all shadow-sm"
            >
              <MapPin size={13} className="text-natural-gold" />
              <span>{profile?.region || profile?.country || "Set Location"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Season Phase Banner */}
      <div className="bg-gradient-to-r from-natural-primary via-emerald-900 to-natural-primary text-white p-4 sm:p-5 rounded-[28px] card-shadow relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-natural-gold text-[10px] font-black uppercase tracking-widest">
            <CalendarDays size={14} />
            <span>Regional Agricultural Season</span>
            {liveWeather && <span className="bg-emerald-500/30 px-2 py-0.5 rounded-full font-black text-[9px]">LIVE WEATHER</span>}
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg leading-snug">
            {currentSeasonPhase}
          </h3>
          <p className="text-xs text-white/80 font-medium leading-relaxed">
            Monitoring current conditions for <strong>{profile?.region || "Highveld"}, {profile?.country || "Zimbabwe"}</strong>. Warnings are generated from live forecast data when available.
          </p>
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div className="grid grid-cols-4 bg-natural-tan/40 p-1.5 rounded-2xl border border-natural-accent/15 gap-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate",
            activeTab === 'alerts'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          )}
        >
          <Bell size={15} />
          <span>{t.alerts || "Alerts"} ({alerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('planting')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate",
            activeTab === 'planting'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          )}
        >
          <Sprout size={15} className="text-emerald-600" />
          <span>{t.plantingWindow || "Planting"}</span>
          {(activePlantingCrops.length > 0 || upcomingPlantingCrops.length > 0) && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('rainfall')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate",
            activeTab === 'rainfall'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          )}
        >
          <CloudRain size={15} className="text-blue-600" />
          <span>{t.rainfallHazards || "Rain Warnings"}</span>
          {liveRainWarnings.length > 0 && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate",
            activeTab === 'settings'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          )}
        >
          <Sliders size={15} />
          <span>{t.schedulerSettings || "Scheduler"}</span>
        </button>
      </div>

      {/* Tab 1: Active & Scheduled Alerts Feed */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Quick Active Highlights */}
          {liveRainWarnings.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-[24px] space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert size={16} className="animate-bounce" />
                <span>Urgent Weather Warning Active</span>
              </div>
              <p className="text-xs text-red-900 font-medium">
                {liveRainWarnings[0].message}
              </p>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-natural-accent/20 p-6 space-y-3">
              <div className="h-16 w-16 bg-natural-tan/60 rounded-full flex items-center justify-center mx-auto text-natural-accent">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h4 className="font-serif font-bold text-lg text-natural-primary">All Clear! No Pending Warnings</h4>
              <p className="text-xs text-natural-text/60 max-w-sm mx-auto leading-relaxed">
                The local scheduler is actively monitoring seasonal rainfall triggers and planting dates for {profile?.region || 'your region'}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-natural-text/60 font-bold uppercase tracking-wider">
                  {unreadCount > 0 ? `${unreadCount} Unread Alert${unreadCount > 1 ? 's' : ''}` : "All Alerts Read"}
                </span>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-bold text-natural-primary hover:text-emerald-700 bg-natural-tan/60 hover:bg-natural-tan px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Mark all as read</span>
                  </button>
                )}
              </div>

              {alerts.map((alert) => (
                <div
                  key={alert.id || alert.alertId}
                  className={cn(
                    "bg-white p-4 sm:p-5 rounded-[28px] border transition-all card-shadow relative overflow-hidden",
                    alert.severity === 'critical' 
                      ? "border-red-300 hover:border-red-400 bg-gradient-to-br from-white to-red-50/30" 
                      : alert.severity === 'warning' 
                      ? "border-amber-300 hover:border-amber-400 bg-gradient-to-br from-white to-amber-50/20" 
                      : "border-natural-accent/15 hover:border-natural-accent/30",
                    !alert.isRead && "ring-2 ring-natural-gold/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        alert.type === 'heavy_rainfall' 
                          ? "bg-red-500 text-white" 
                          : alert.type === 'planting_window' 
                          ? "bg-emerald-600 text-white" 
                          : "bg-natural-primary text-white"
                      )}>
                        {alert.type === 'heavy_rainfall' ? <CloudRain size={20} /> : <Sprout size={20} />}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                            alert.severity === 'critical' ? "bg-red-100 text-red-700" : alert.severity === 'warning' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {alert.type.replace('_', ' ')}
                          </span>

                          <span className="text-[10px] text-natural-text/50 font-medium">
                            {alert.triggerDate} • {alert.region}
                          </span>

                          {alert.isActioned && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                              <Check size={10} /> Actioned
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif font-bold text-base text-natural-primary leading-snug">
                          {alert.title}
                        </h4>

                        <p className="text-xs text-natural-text/80 leading-relaxed font-medium">
                          {alert.message}
                        </p>

                        {/* Metadata highlights */}
                        {alert.metadata?.actionSteps && alert.metadata.actionSteps.length > 0 && (
                          <div className="mt-2.5 p-2.5 bg-natural-tan/30 rounded-xl space-y-1 border border-natural-accent/10">
                            <p className="text-[10px] font-black uppercase tracking-wider text-natural-accent">
                              Recommended Field Actions:
                            </p>
                            <ul className="text-[11px] text-natural-text/85 space-y-0.5">
                              {alert.metadata.actionSteps.slice(0, 2).map((step, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <Check size={11} className="text-emerald-600 mt-0.5 shrink-0" />
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1.5 text-natural-text/40 hover:text-red-500 rounded-lg transition-colors"
                      title="Dismiss Alert"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-natural-accent/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const utterance = new SpeechSynthesisUtterance(`${alert.title}. ${alert.message}`);
                          window.speechSynthesis.speak(utterance);
                        }}
                        className="p-1.5 bg-natural-tan text-natural-primary rounded-xl hover:bg-natural-accent/20 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 size={13} />
                        <span className="text-[10px]">Read Voice</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlertForModal(alert)}
                        className="px-2.5 py-1.5 bg-natural-tan/60 hover:bg-natural-tan text-natural-primary rounded-xl text-[10px] font-bold flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>Details</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.isActioned && (
                        <button
                          onClick={() => handleMarkAsActioned(alert.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Check size={12} />
                          <span>Mark Actioned</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSnooze(alert.id, 2)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-natural-text rounded-xl text-[10px] font-bold transition-colors"
                      >
                        Snooze 48h
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Planting Windows Intelligence */}
      {activeTab === 'planting' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[28px] card-shadow border border-natural-accent/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
                  <Sprout size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-natural-primary">
                    Regional Planting Windows Guide
                  </h3>
                  <p className="text-[11px] text-natural-accent">
                    Zone: {getRegionCategory(profile?.region, profile?.country).toUpperCase()} • {profile?.region || "Highveld"}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-natural-text/80 leading-relaxed">
              Planting dates are calibrated based on effective cumulative rainfall onset (&gt;30mm) and seasonal temperature cycles.
            </p>
          </div>

          {/* Active Windows Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-natural-accent flex items-center gap-1.5 pl-1">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Crops in Optimal Planting Window Today</span>
            </h4>

            {activePlantingCrops.length === 0 ? (
              <div className="p-4 bg-natural-tan/20 rounded-2xl border border-natural-accent/10 text-xs text-natural-text/70 italic">
                No crops currently in their peak planting window for today's calendar date ({currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}). Check upcoming windows below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePlantingCrops.map((crop, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-[24px] border border-emerald-200 card-shadow space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-natural-primary text-sm">{crop.crop}</h5>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        OPEN NOW
                      </span>
                    </div>

                    <div className="text-[11px] text-natural-text/75 space-y-1">
                      <p>
                        📅 <strong>Window:</strong> {crop.optimalPlantingWindow.startMonth}/{crop.optimalPlantingWindow.startDay} - {crop.optimalPlantingWindow.endMonth}/{crop.optimalPlantingWindow.endDay}
                      </p>
                      <p>
                        💧 <strong>Rain Trigger:</strong> {crop.minRainfallMm}mm effective moisture
                      </p>
                      <p>
                        🌱 <strong>Varieties:</strong> {crop.recommendedVarieties.slice(0, 4).join(', ')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-natural-accent/10 flex items-center gap-2">
                      {onNavigateToRecords && (
                        <button
                          onClick={onNavigateToRecords}
                          className="flex-1 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors"
                        >
                          <Plus size={12} />
                          <span>Log in Farm Records</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Windows Cards */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-natural-accent flex items-center gap-1.5 pl-1">
              <Clock size={14} className="text-natural-gold" />
              <span>Upcoming Sowing Windows (Next {settings?.leadTimeDays || 14} Days)</span>
            </h4>

            {upcomingPlantingCrops.length === 0 ? (
              <div className="p-4 bg-natural-tan/20 rounded-2xl border border-natural-accent/10 text-xs text-natural-text/70 italic">
                No immediate planting windows opening in the next {settings?.leadTimeDays || 14} days.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingPlantingCrops.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-[24px] border border-amber-200 card-shadow space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-natural-primary text-sm">{item.schedule.crop}</h5>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        In {item.daysUntilStart} Days
                      </span>
                    </div>

                    <div className="text-[11px] text-natural-text/75 space-y-1">
                      <p>
                        📅 <strong>Opens:</strong> {item.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </p>
                      <p>
                        🌾 <strong>Pfumvudza Basins:</strong> Dig basins & apply compost before planting.
                      </p>
                      <p>
                        🌱 <strong>Recommended:</strong> {item.schedule.recommendedVarieties.slice(0, 3).join(', ')}
                      </p>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Heavy Rainfall & Hazard Warning Engine */}
      {activeTab === 'rainfall' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[28px] card-shadow border border-natural-accent/15 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
                <CloudRain size={22} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-natural-primary">
                  Heavy Rainfall & Flash Flood Hazards
                </h3>
                <p className="text-[11px] text-natural-accent">
                   Risk Level: {liveRainWarnings.length > 0 ? "ELEVATED LIVE RAIN RISK" : liveWeather ? "NORMAL LIVE FORECAST" : "LIVE FORECAST UNAVAILABLE"}
                </p>
              </div>
            </div>
            <p className="text-xs text-natural-text/80 leading-relaxed font-medium">
              Southern African summer storms and ITCZ convergence can deliver 50mm-80mm+ rainfall in under 24 hours, leading to nitrogen leaching and root rot.
            </p>
          </div>

          {/* Active Hazards Cards */}
          <div className="space-y-3">
            {liveWarnings.map((warning, idx) => (
              <div key={`${warning.type}-${idx}`} className="bg-red-50/80 border border-red-200 p-5 rounded-[28px] card-shadow space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                    <AlertTriangle size={18} />
                    <span>{warning.title}</span>
                  </div>
                  <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    {warning.severity}
                  </span>
                </div>

                <p className="text-xs text-red-950 leading-relaxed font-medium">
                  {warning.message}
                </p>

                {/* Mitigation Checklist */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-red-200/60 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-800">
                    Mandatory Field Mitigation Checklist:
                  </p>
                  <ul className="text-xs text-natural-text space-y-1.5">
                     {warning.actionSteps.map((action, actionIdx) => (
                      <li key={actionIdx} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-red-600 mt-0.5 shrink-0" />
                        <span className="font-medium leading-tight">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {liveWarnings.length === 0 && (
              <div className="p-6 bg-white rounded-[28px] border border-natural-accent/15 text-center space-y-2">
                <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                <h4 className="font-bold text-natural-primary text-sm">No Active Live Weather Warnings</h4>
                <p className="text-xs text-natural-text/60">
                  {liveWeather ? 'The live forecast is below configured warning thresholds. Continue routine field scouting.' : 'Live forecast data is currently unavailable, so no real-time warning can be confirmed.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Scheduler Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Main Controls Card */}
          <div className="bg-white p-5 rounded-[28px] card-shadow border border-natural-accent/15 space-y-4">
            <h3 className="font-serif font-bold text-base text-natural-primary">
              Scheduler Preferences & Channels
            </h3>

            <div className="space-y-3">
              {/* Browser Push Toggle */}
              <div className="flex items-center justify-between p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/10">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-natural-gold" />
                  <div>
                    <p className="text-xs font-bold text-natural-primary">Browser Push Notifications</p>
                    <p className="text-[10px] text-natural-text/60">
                      Permission: <strong className="uppercase">{permissionStatus}</strong>
                    </p>
                  </div>
                </div>

                {permissionStatus !== 'granted' ? (
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 bg-natural-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-natural-primary/90"
                  >
                    Allow
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateSetting('browserPushEnabled', !settings?.browserPushEnabled)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      settings?.browserPushEnabled ? "bg-emerald-600" : "bg-stone-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5",
                      settings?.browserPushEnabled ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                )}
              </div>

              {/* Sound / Chime Toggle */}
              <div className="flex items-center justify-between p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/10">
                <div className="flex items-center gap-3">
                  {settings?.soundEnabled ? <Volume2 size={18} className="text-emerald-600" /> : <VolumeX size={18} className="text-stone-400" />}
                  <div>
                    <p className="text-xs font-bold text-natural-primary">Audio Tone Alerts</p>
                    <p className="text-[10px] text-natural-text/60">Gentle synthesizer tone on alert</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateSetting('soundEnabled', !settings?.soundEnabled)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative",
                    settings?.soundEnabled ? "bg-emerald-600" : "bg-stone-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5",
                    settings?.soundEnabled ? "right-0.5" : "left-0.5"
                  )} />
                </button>
                </div>
              </div>

              {/* Lead Time Slider */}
              <div className="p-3.5 bg-natural-tan/20 rounded-2xl border border-natural-accent/10 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-natural-primary">
                    Planting Window Early Warning Lead Time
                  </label>
                  <span className="text-xs font-black text-natural-gold bg-natural-primary text-white px-2 py-0.5 rounded-md">
                    {settings?.leadTimeDays || 14} Days
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={30}
                  step={1}
                  value={settings?.leadTimeDays || 14}
                  onChange={(e) => handleUpdateSetting('leadTimeDays', parseInt(e.target.value))}
                  className="w-full accent-natural-primary"
                />
                <div className="flex justify-between text-[10px] text-natural-text/50 font-bold">
                  <span>3 Days (Immediate)</span>
                  <span>14 Days (Recommended)</span>
                  <span>30 Days (Full Prep)</span>
                </div>
              </div>

              {/* Live Rainfall Threshold */}
              <div className="p-3.5 bg-natural-tan/20 rounded-2xl border border-natural-accent/10 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-natural-primary">
                    Live Rainfall Warning Threshold
                  </label>
                  <span className="text-xs font-black text-natural-gold bg-natural-primary text-white px-2 py-0.5 rounded-md">
                    {settings?.rainfallThresholdMm || 45} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={settings?.rainfallThresholdMm || 45}
                  onChange={(e) => handleUpdateSetting('rainfallThresholdMm', parseInt(e.target.value))}
                  className="w-full accent-natural-primary"
                />
                <p className="text-[10px] text-natural-text/50 font-medium">
                  Alerts are created when the live forecast reaches this daily rainfall level or shows a severe storm risk.
                </p>
              </div>
            </div>
          </div>
      )}

      {/* Alert Detail Lightbox / Action Modal */}
      {selectedAlertForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg bg-white rounded-[36px] overflow-hidden shadow-2xl border border-natural-accent/20 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-natural-accent/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center text-white",
                  selectedAlertForModal.type === 'heavy_rainfall' ? "bg-red-500" : "bg-emerald-600"
                )}>
                  {selectedAlertForModal.type === 'heavy_rainfall' ? <CloudRain size={20} /> : <Sprout size={20} />}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-natural-primary leading-tight">
                    {selectedAlertForModal.title}
                  </h3>
                  <p className="text-[11px] text-natural-accent font-medium">
                    {selectedAlertForModal.region}, {selectedAlertForModal.country}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlertForModal(null)}
                className="h-8 w-8 rounded-full bg-natural-tan/60 flex items-center justify-center text-natural-text hover:bg-natural-tan"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-natural-text/90 leading-relaxed font-medium">
              {selectedAlertForModal.message}
            </p>

            {selectedAlertForModal.metadata?.recommendedVarieties && (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Recommended Seed Varieties:
                </p>
                <p className="text-xs font-bold text-emerald-950">
                  {selectedAlertForModal.metadata.recommendedVarieties.join(', ')}
                </p>
              </div>
            )}

            {selectedAlertForModal.metadata?.actionSteps && (
              <div className="p-3.5 bg-natural-tan/30 rounded-2xl border border-natural-accent/15 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-natural-accent">
                  Field Action Plan:
                </p>
                <ul className="text-xs space-y-1 text-natural-text/90">
                  {selectedAlertForModal.metadata.actionSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-natural-accent/15">
              <button
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(`${selectedAlertForModal.title}. ${selectedAlertForModal.message}`);
                  window.speechSynthesis.speak(utterance);
                }}
                className="px-3 py-2 bg-natural-tan hover:bg-natural-accent/20 rounded-xl text-xs font-bold text-natural-primary flex items-center gap-1.5"
              >
                <Volume2 size={14} />
                <span>Play Voice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleMarkAsActioned(selectedAlertForModal.id);
                    setSelectedAlertForModal(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700"
                >
                  Mark as Done
                </button>
                <button
                  onClick={() => setSelectedAlertForModal(null)}
                  className="px-3 py-2 bg-stone-200 text-natural-text rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
