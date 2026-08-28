import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudFog, 
  CloudSnow, 
  CloudDrizzle,
  Droplets, 
  Wind, 
  Compass,
  AlertTriangle, 
  RefreshCw, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Clock, 
  Eye, 
  ShieldAlert,
  ChevronRight,
  Thermometer
} from 'lucide-react';
import { Language } from '../translations';
import { cn } from '../lib/utils';

export interface WeatherData {
  location: string;
  coordinates?: { lat: number; lng: number };
  temp: number;
  feelsLike?: number;
  condition: string;
  icon?: string;
  wmoCode?: number;
  isSevere?: boolean;
  humidity: number;
  windSpeed: number;
  windDirection?: string;
  rainChance: number;
  precipitation?: number;
  uvIndex?: number;
  isDay?: boolean;
  sunrise?: string;
  sunset?: string;
  advice: string;
  forecast: Array<{
    day: string;
    date?: string;
    temp: number;
    tempMin?: number;
    cond: string;
    icon?: string;
    rainChance: number;
    precipitation?: number;
    uv?: number;
  }>;
  hourly?: Array<{
    time: string;
    temp: number;
    humidity?: number;
    rainChance: number;
    precipitation?: number;
    cond: string;
    icon?: string;
  }>;
  isLive?: boolean;
  dataSource?: string;
  timestamp?: number;
}

interface WeatherForecastProps {
  location: string;
  language: Language;
  onLocationChange?: (newLoc: string) => void;
}

const PRESET_LOCATIONS = [
  { name: "Harare", country: "Zimbabwe", tag: "Mashonaland" },
  { name: "Mutare", country: "Zimbabwe", tag: "Manicaland" },
  { name: "Bulawayo", country: "Zimbabwe", tag: "Matabeleland" },
  { name: "Gweru", country: "Zimbabwe", tag: "Midlands" },
  { name: "Masvingo", country: "Zimbabwe", tag: "Masvingo" },
  { name: "Chinhoyi", country: "Zimbabwe", tag: "Mash West" },
  { name: "Bindura", country: "Zimbabwe", tag: "Mash Central" },
  { name: "Nairobi", country: "Kenya", tag: "Rift Valley Hub" },
  { name: "Nakuru", country: "Kenya", tag: "Maize Belt" },
  { name: "Eldoret", country: "Kenya", tag: "Highlands" },
  { name: "Johannesburg", country: "South Africa", tag: "Gauteng" },
  { name: "Polokwane", country: "South Africa", tag: "Limpopo" },
  { name: "Lusaka", country: "Zambia", tag: "Central" },
  { name: "Lagos", country: "Nigeria", tag: "Coastal" }
];

export function WeatherForecastView({ location, language, onLocationChange }: WeatherForecastProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily'>('daily');

  const fetchWeather = useCallback(async (locName: string, lat?: number, lng?: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let url = `/api/weather/${encodeURIComponent(locName)}`;
      const params = new URLSearchParams();
      if (lat !== undefined && lng !== undefined) {
        params.append('lat', String(lat));
        params.append('lng', String(lng));
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather service error (${res.status})`);
      const result: WeatherData = await res.json();
      setData(result);
    } catch (err: any) {
      console.error("Failed to fetch live weather:", err);
      setError("Unable to load live weather. Showing cached meteorological advisory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(location);
  }, [location, fetchWeather]);

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Attempt reverse geocoding first for friendly name
          const revRes = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          let placeName = `GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.city && revData.country) {
              placeName = `${revData.city}, ${revData.country}`;
            }
          }
          if (onLocationChange) onLocationChange(placeName);
          await fetchWeather(placeName, latitude, longitude);
        } catch {
          await fetchWeather(`GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`, latitude, longitude);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        console.warn("GPS detection error:", err);
        setDetectingGps(false);
        setError("Location access denied or timed out. Please select a city from the list.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onLocationChange) onLocationChange(searchQuery.trim());
    fetchWeather(searchQuery.trim());
    setSearchQuery('');
  };

  const getWeatherIcon = (iconName?: string, condition?: string, className = "w-6 h-6") => {
    const key = (iconName || condition || "").toLowerCase();
    if (key.includes("lightning") || key.includes("thunder")) return <CloudLightning className={cn("text-amber-500", className)} />;
    if (key.includes("rain") || key.includes("showers")) return <CloudRain className={cn("text-blue-500", className)} />;
    if (key.includes("drizzle")) return <CloudDrizzle className={cn("text-cyan-500", className)} />;
    if (key.includes("snow")) return <CloudSnow className={cn("text-blue-300", className)} />;
    if (key.includes("fog")) return <CloudFog className={cn("text-slate-400", className)} />;
    if (key.includes("cloud") && (key.includes("sun") || key.includes("partly"))) return <CloudSun className={cn("text-amber-400", className)} />;
    if (key.includes("cloud") || key.includes("overcast")) return <Cloud className={cn("text-slate-500", className)} />;
    return <Sun className={cn("text-amber-500", className)} />;
  };

  const getSprayWindowAssessment = (windSpeed: number, rainChance: number) => {
    if (rainChance > 45) {
      return { status: "Poor Window", color: "text-rose-700 bg-rose-50 border-rose-200", desc: "High rain risk will wash off chemicals." };
    }
    if (windSpeed > 20) {
      return { status: "Unsafe - High Drift", color: "text-amber-700 bg-amber-50 border-amber-200", desc: "Winds > 20km/h cause severe drift to non-target areas." };
    }
    if (windSpeed >= 12) {
      return { status: "Moderate Window", color: "text-yellow-700 bg-yellow-50 border-yellow-200", desc: "Spray with low-drift nozzles early morning." };
    }
    return { status: "Optimal Window", color: "text-emerald-700 bg-emerald-50 border-emerald-200", desc: "Low wind & zero rain. Ideal for foliar feeds & pest control." };
  };

  const getForecastDayLabel = (date: string | undefined, fallback: string, index: number) => {
    if (!date) return fallback;
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Location Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Meteorological Engine
            </span>
            {data?.dataSource && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                • {data.dataSource}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <MapPin className="text-emerald-600 shrink-0" size={24} />
            <span>{data?.location || location}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time hyper-local agricultural weather forecasts & micro-climate advisory
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGpsDetect}
            disabled={detectingGps}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Use exact GPS coordinates"
          >
            <Navigation size={16} className={detectingGps ? "animate-spin" : ""} />
            <span>{detectingGps ? "Detecting GPS..." : "Auto-Detect GPS"}</span>
          </button>

          <button
            onClick={() => fetchWeather(data?.location || location, undefined, undefined, true)}
            disabled={refreshing || loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            title="Refresh weather"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin text-emerald-600" : ""} />
          </button>
        </div>
      </div>

      {/* Quick Region Selector & Custom Search */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">Farming Hubs:</span>
          {PRESET_LOCATIONS.slice(0, 7).map((hub) => {
            const isSelected = data?.location.toLowerCase().includes(hub.name.toLowerCase());
            return (
              <button
                key={hub.name}
                onClick={() => {
                  if (onLocationChange) onLocationChange(`${hub.name}, ${hub.country}`);
                  fetchWeather(`${hub.name}, ${hub.country}`);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all",
                  isSelected
                    ? "bg-emerald-700 text-white shadow-sm font-semibold"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                )}
              >
                {hub.name}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-64">
          <input
            type="text"
            placeholder="Search city, district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition-all shrink-0"
          >
            Go
          </button>
        </form>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-4">
          <RefreshCw className="animate-spin text-emerald-600" size={32} />
          <div>
            <p className="font-semibold text-slate-800">Fetching live meteorological feeds...</p>
            <p className="text-xs text-slate-500 mt-1">Connecting to Open-Meteo high-resolution atmospheric models</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Main Current Hero Banner */}
          <div className="bg-gradient-to-br from-emerald-900 via-natural-primary to-slate-900 text-white p-6 sm:p-8 rounded-[32px] shadow-lg relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Temp & Condition */}
              <div className="lg:col-span-6 flex items-center gap-6">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 shrink-0">
                  {getWeatherIcon(data.icon, data.condition, "w-16 h-16 sm:w-20 sm:h-20")}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                      {data.temp}°
                    </span>
                    <span className="text-xl font-medium text-emerald-300">C</span>
                    {data.feelsLike !== undefined && (
                      <span className="text-xs sm:text-sm text-slate-300 ml-2">
                        Feels like {data.feelsLike}°C
                      </span>
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-white mt-1">
                    {data.condition}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                    <span>H: {data.forecast?.[0]?.temp ?? data.temp + 2}°</span>
                    <span>•</span>
                    <span>L: {data.forecast?.[0]?.tempMin ?? data.temp - 8}°</span>
                    <span>•</span>
                    <span>Sunrise: {data.sunrise || "06:15"}</span>
                    <span>•</span>
                    <span>Sunset: {data.sunset || "18:10"}</span>
                  </div>
                </div>
              </div>

              {/* Right Agronomic Advisory Box */}
              <div className="lg:col-span-6 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase mb-2">
                  <Sparkles size={16} />
                  <span>Agro-Meteorological Directive</span>
                </div>
                <p className="text-sm text-white/95 leading-relaxed">
                  {data.advice}
                </p>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span>Precipitation probability: <strong className="text-white">{data.rainChance}%</strong></span>
                  <span>Spraying suitability: <strong className="text-emerald-300">{data.windSpeed < 18 && data.rainChance < 40 ? "Favorable" : "Caution"}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Micro-climate Telemetry Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Humidity */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Humidity</span>
                <Droplets size={18} className="text-blue-500" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {data.humidity}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {data.humidity > 75 ? "High fungal/blight pressure" : data.humidity < 40 ? "Rapid soil drying" : "Balanced transpiration"}
                </p>
              </div>
            </div>

            {/* Wind Speed */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Wind Speed</span>
                <Wind size={18} className="text-teal-500" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{data.windSpeed}</span>
                  <span className="text-xs font-normal text-slate-500">km/h</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Compass size={12} />
                  <span>Heading {data.windDirection || "SE"}</span>
                </p>
              </div>
            </div>

            {/* Rain Chance & Volume */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Rain Risk</span>
                <CloudRain size={18} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {data.rainChance}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Expected volume: {data.precipitation !== undefined ? `${data.precipitation.toFixed(1)} mm` : "0.0 mm"}
                </p>
              </div>
            </div>

            {/* UV Index / Radiation */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">UV Index</span>
                <Sun size={18} className="text-amber-500" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {data.uvIndex ?? 6} / 11
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(data.uvIndex ?? 6) >= 8 ? "Shield tender nursery beds" : "Good photosynthetic rate"}
                </p>
              </div>
            </div>
          </div>

          {/* Spraying Window Assessment Banner */}
          {(() => {
            const spray = getSprayWindowAssessment(data.windSpeed, data.rainChance);
            return (
              <div className={cn("p-4 rounded-2xl border flex items-center justify-between gap-4", spray.color)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/60">
                    <Thermometer size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Foliar Spray & Chemical Application Window: {spray.status}</div>
                    <div className="text-xs opacity-90">{spray.desc}</div>
                  </div>
                </div>
                <div className="text-xs font-bold px-3 py-1 rounded-lg bg-white/80 shrink-0">
                  {data.windSpeed} km/h • {data.rainChance}% Rain
                </div>
              </div>
            );
          })()}

          {/* Hourly & 7-Day Forecast Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600" />
                <span>Agricultural Weather Outlook</span>
              </h3>
              
              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    activeTab === 'daily' ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  7-Day Outlook
                </button>
                <button
                  onClick={() => setActiveTab('hourly')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    activeTab === 'hourly' ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  24-Hour Timeline
                </button>
              </div>
            </div>

            {/* 7-Day Daily Tab */}
            {activeTab === 'daily' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {data.forecast?.map((f, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition-all",
                      i === 0 
                        ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20" 
                        : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <div className={cn("text-xs font-bold uppercase tracking-wider", i === 0 ? "text-emerald-800" : "text-slate-600")}>
                        {getForecastDayLabel(f.date, f.day, i)}
                      </div>
                      {f.date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {f.date.slice(5)}
                        </div>
                      )}
                    </div>

                    <div className="my-3">
                      {getWeatherIcon(f.icon, f.cond, "w-8 h-8 mx-auto")}
                    </div>

                    <div className="space-y-1 w-full">
                      <div className="text-base font-bold text-slate-900">
                        {f.temp}°
                        {f.tempMin !== undefined && (
                          <span className="text-xs text-slate-400 font-normal ml-1">/{f.tempMin}°</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate" title={f.cond}>
                        {f.cond}
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600">
                        <Droplets size={11} />
                        <span>{f.rainChance}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 24-Hour Timeline Tab */}
            {activeTab === 'hourly' && (
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="flex gap-3 min-w-max">
                  {(data.hourly && data.hourly.length > 0 ? data.hourly : []).map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex flex-col items-center justify-between w-24 text-center"
                    >
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Clock size={11} />
                        <span>{h.time}</span>
                      </div>
                      <div className="my-2">
                        {getWeatherIcon(h.icon, h.cond, "w-6 h-6 mx-auto")}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {h.temp}°C
                      </div>
                      <div className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5 mt-1">
                        <Droplets size={10} />
                        <span>{h.rainChance}%</span>
                      </div>
                    </div>
                  ))}
                  {(!data.hourly || data.hourly.length === 0) && (
                    <div className="p-8 text-center text-xs text-slate-500 w-full">
                      Hourly telemetry synchronizing with satellite. Switch to 7-Day view.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
