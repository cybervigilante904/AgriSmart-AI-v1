import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  DollarSign, 
  Target, 
  Coins, 
  Calendar, 
  ChevronRight, 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Building2, 
  CheckCircle2, 
  Sparkles,
  Calculator,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area, 
  Bar, 
  Line, 
  Legend 
} from 'recharts';
import { type FarmerProfile } from '../db';
import { TRANSLATIONS, type Language } from '../translations';
import { 
  type MarketCommodity, 
  type RegionalMarketHub, 
  getMarketHubForLocation, 
  getAllMarketHubs 
} from '../../../shared/marketData';

interface MarketPricesViewProps {
  language: Language;
  profile: FarmerProfile | null;
  onOpenLocationModal?: () => void;
}

export function MarketPricesView({ language, profile, onOpenLocationModal }: MarketPricesViewProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;
  const [hub, setHub] = useState<RegionalMarketHub | null>(null);
  const [commodities, setCommodities] = useState<MarketCommodity[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<MarketCommodity | null>(null);
  const [loading, setLoading] = useState(true);
  const [customHubId, setCustomHubId] = useState<string | null>(null);
  const [allHubs, setAllHubs] = useState<RegionalMarketHub[]>([]);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorQuantity, setCalculatorQuantity] = useState<string>('10');

  // Load available market hubs
  useEffect(() => {
    setAllHubs(getAllMarketHubs());
  }, []);

  // Fetch or resolve market data whenever profile location or chosen hub changes
  const loadMarketData = () => {
    setLoading(true);
    const targetLocation = profile?.region || profile?.country || 'Harare';
    const targetCountry = profile?.country || 'Zimbabwe';

    // If user explicitly picked a market hub from dropdown
    if (customHubId) {
      const matched = allHubs.find(h => h.id === customHubId) || getMarketHubForLocation(targetLocation, targetCountry);
      setHub(matched);
      setCommodities(matched.commodities);
      if (!selectedCommodity || !matched.commodities.some(c => c.crop === selectedCommodity.crop)) {
        setSelectedCommodity(matched.commodities[0]);
      }
      setLoading(false);
      return;
    }

    // Otherwise fetch from server API with local fallback
    fetch(`/api/market/${encodeURIComponent(targetLocation)}?country=${encodeURIComponent(targetCountry)}`)
      .then(res => res.json())
      .then(data => {
        if (data.hub && data.commodities) {
          setHub(data.hub);
          setCommodities(data.commodities);
          if (!selectedCommodity || !data.commodities.some((c: MarketCommodity) => c.crop === selectedCommodity.crop)) {
            setSelectedCommodity(data.commodities[0]);
          }
        } else if (Array.isArray(data)) {
          // Fallback structure
          const fallbackHub = getMarketHubForLocation(targetLocation, targetCountry);
          setHub(fallbackHub);
          setCommodities(fallbackHub.commodities);
          setSelectedCommodity(fallbackHub.commodities[0]);
        }
      })
      .catch(err => {
        console.warn('Using client-side market data fallback:', err);
        const fallbackHub = getMarketHubForLocation(targetLocation, targetCountry);
        setHub(fallbackHub);
        setCommodities(fallbackHub.commodities);
        setSelectedCommodity(fallbackHub.commodities[0]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMarketData();
  }, [profile?.region, profile?.country, customHubId]);

  const userLocationLabel = profile?.region 
    ? `${profile.region}${profile.country ? `, ${profile.country}` : ''}`
    : profile?.country || 'Harare, Zimbabwe';

  // Calculator Gross Calculation
  const calcGross = selectedCommodity && calculatorQuantity 
    ? (parseFloat(calculatorQuantity) || 0) * selectedCommodity.rawPrice 
    : 0;

  return (
    <div className="p-4 space-y-6 pb-28 h-full overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.market}</h2>
            <span className="px-2.5 py-0.5 bg-natural-gold/15 text-natural-primary font-black text-[10px] uppercase tracking-wider rounded-full border border-natural-gold/30">
              Live Wholesale
            </span>
          </div>
          <p className="text-xs text-natural-text/60 font-medium mt-0.5">
            Real-time agro-commodity prices, historical trends & trade forecasts
          </p>
        </div>

        {/* Location & Market Hub Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-2.5 rounded-2xl border border-natural-accent/15 shadow-sm text-xs">
            <MapPin size={14} className="text-natural-accent shrink-0" />
            <select
              value={customHubId || (hub ? hub.id : '')}
              onChange={(e) => setCustomHubId(e.target.value)}
              className="bg-transparent text-natural-primary font-bold text-xs focus:outline-none cursor-pointer"
            >
              {allHubs.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.district})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadMarketData()}
            className="p-2.5 bg-natural-tan/40 hover:bg-natural-tan text-natural-primary rounded-2xl border border-natural-accent/10 transition-colors shadow-sm"
            title="Refresh prices"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Active Market Hub Banner */}
      {hub && (
        <div className="bg-gradient-to-r from-natural-primary to-natural-primary/90 p-5 rounded-[32px] text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-natural-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  Connected Wholesale Terminal
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-bold">
                  ● Trading Active
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                {hub.name}
              </h3>
              <p className="text-xs text-white/80 font-medium max-w-xl">
                {hub.description} • <span className="text-natural-gold">{hub.tradingDays}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md self-start md:self-auto">
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase text-white/60">Your Farm Region</p>
                <p className="text-xs font-bold text-white line-clamp-1">{userLocationLabel}</p>
              </div>
              {onOpenLocationModal && (
                <button
                  onClick={onOpenLocationModal}
                  className="px-3 py-1.5 bg-white text-natural-primary rounded-xl text-[11px] font-bold shadow-sm hover:bg-natural-bg transition-colors"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Commodity Quick Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {commodities.map(c => {
          const isSelected = selectedCommodity?.crop === c.crop;
          return (
            <button
              key={c.crop}
              onClick={() => setSelectedCommodity(c)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? "bg-natural-primary text-white shadow-lg scale-[1.02]"
                  : "bg-white text-natural-primary border border-natural-accent/15 hover:bg-natural-tan/30 shadow-sm"
              }`}
            >
              <span>{c.crop}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                isSelected 
                  ? "bg-white/20 text-white" 
                  : c.trend === 'up' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {c.price}
              </span>
            </button>
          );
        })}
      </div>

      {selectedCommodity && (
        <motion.div
          key={selectedCommodity.crop}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Price & Advanced Volatility Chart */}
          <div className="bg-white p-6 rounded-[36px] card-shadow border border-natural-accent/15 space-y-6">
            {/* Header with Price Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-natural-accent/10 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-natural-accent bg-natural-tan/40 px-2.5 py-0.5 rounded-full">
                    {selectedCommodity.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    selectedCommodity.supplyStatus.includes('Shortage') 
                      ? 'bg-amber-50 text-amber-800 border-amber-200' 
                      : selectedCommodity.supplyStatus.includes('Surplus')
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {selectedCommodity.supplyStatus}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-2xl text-natural-primary mt-1">
                  {selectedCommodity.crop}
                </h3>
                <p className="text-xs text-natural-text/60 font-medium">
                  Traded at {selectedCommodity.wholesaleMarket}
                </p>
              </div>

              <div className="flex items-center gap-4 sm:text-right">
                <div>
                  <div className="flex items-center sm:justify-end gap-1 mb-1">
                    <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedCommodity.trend === 'up' 
                        ? "bg-emerald-100 text-emerald-800" 
                        : selectedCommodity.trend === 'down' 
                        ? "bg-red-100 text-red-800" 
                        : "bg-stone-100 text-stone-800"
                    }`}>
                      {selectedCommodity.trend === 'up' ? <ArrowUpRight size={13} /> : selectedCommodity.trend === 'down' ? <ArrowDownRight size={13} /> : <Minus size={13} />}
                      {selectedCommodity.changePercent}
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-serif font-black text-natural-primary">
                    {selectedCommodity.price}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedCommodity.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2efe9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B735B', fontSize: 11, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B735B', fontSize: 10 }}
                    width={35}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-natural-accent/15 space-y-1.5">
                            <p className="text-[10px] font-black text-natural-accent uppercase">
                              {data.month} Trading Summary
                            </p>
                            <div className="flex justify-between gap-4 text-xs">
                              <span className="text-natural-text/60">Mid Price:</span>
                              <span className="font-bold text-natural-primary">
                                {hub?.currencySymbol}{data.price}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-xs">
                              <span className="text-natural-text/60">Range (Low-High):</span>
                              <span className="font-bold text-natural-accent">
                                {hub?.currencySymbol}{data.low} - {hub?.currencySymbol}{data.high}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-xs">
                              <span className="text-natural-text/60">Volume:</span>
                              <span className="font-bold text-natural-gold">
                                {data.volume.toLocaleString()} units
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Volatility Range Band */}
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    stroke="none" 
                    fill="#7C9082" 
                    fillOpacity={0.15} 
                    name="High-Low Range"
                  />
                  {/* Monthly Volume */}
                  <Bar dataKey="volume" fill="#D2B48C" opacity={0.25} radius={[4, 4, 0, 0]} name="Trade Volume" />
                  {/* Price Line */}
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2D5A27" 
                    strokeWidth={3.5} 
                    dot={{ r: 5, fill: "#2D5A27", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                    name="Spot Price"
                  />
                  {/* Regional Benchmark Line */}
                  <Line 
                    type="monotone" 
                    dataKey="regional" 
                    stroke="#A67B5B" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={false}
                    name="Regional Average"
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics Footer */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-natural-tan/25 rounded-2xl border border-natural-accent/10 text-center">
              <div>
                <p className="text-[9px] font-black uppercase text-natural-accent">Price Volatility</p>
                <p className={`text-xs font-bold mt-0.5 ${
                  selectedCommodity.volatility === 'High' ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  {selectedCommodity.volatility}
                </p>
              </div>
              <div className="border-x border-natural-accent/15 px-2">
                <p className="text-[9px] font-black uppercase text-natural-accent">Market Volume</p>
                <p className="text-xs font-bold text-natural-primary mt-0.5">
                  {selectedCommodity.volume}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-natural-accent">Regional Benchmark</p>
                <p className="text-xs font-bold text-natural-primary mt-0.5">
                  {selectedCommodity.regionalAvg}
                </p>
              </div>
            </div>
          </div>

          {/* AI Trading Strategy & Best Time to Sell */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategic Advice */}
            <div className="bg-natural-primary p-6 rounded-[36px] text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-natural-gold" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-natural-gold">
                  Farmer Selling Strategy
                </h4>
              </div>
              <p className="text-sm italic font-serif leading-relaxed text-white/90">
                "{selectedCommodity.advice}"
              </p>
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-natural-gold">
                  Recommended Selling Timing:
                </p>
                <p className="text-xs font-bold text-white">
                  {selectedCommodity.bestTimeToSell}
                </p>
              </div>
            </div>

            {/* 2-Month Forecast Projections */}
            <div className="bg-white p-6 rounded-[36px] card-shadow border border-natural-accent/15 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-natural-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-natural-primary">
                    AI Price Forecast
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-natural-accent bg-natural-tan/40 px-2 py-0.5 rounded-md">
                  Next 60 Days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selectedCommodity.forecast.map((fc, i) => (
                  <div key={i} className="p-4 bg-natural-tan/20 rounded-2xl border border-natural-accent/10 space-y-1">
                    <p className="text-[10px] font-black uppercase text-natural-accent">{fc.month} Estimate</p>
                    <p className="text-xl font-serif font-black text-natural-primary">
                      {hub?.currencySymbol}{fc.price}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} />
                      <span>{(fc.confidence * 100).toFixed(0)}% Confidence</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Harvest Profit Calculator Toggle */}
              <button
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className="w-full py-2.5 bg-natural-tan/40 hover:bg-natural-tan text-natural-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calculator size={14} />
                <span>{isCalculatorOpen ? "Hide Revenue Calculator" : "Calculate My Harvest Revenue"}</span>
              </button>
            </div>
          </div>

          {/* Revenue Calculator Expansion */}
          {isCalculatorOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-emerald-900 text-white p-6 rounded-[32px] shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-natural-gold" />
                  <h4 className="font-serif font-bold text-base text-white">
                    Harvest Revenue Estimator ({selectedCommodity.crop})
                  </h4>
                </div>
                <span className="text-xs text-white/70 font-medium">
                  Unit: {selectedCommodity.unit}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">
                    How many units will you harvest / sell?
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={calculatorQuantity}
                      onChange={e => setCalculatorQuantity(e.target.value)}
                      className="w-full p-3 bg-white/10 rounded-2xl border border-white/20 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-natural-gold"
                      placeholder="10"
                    />
                    <span className="text-xs font-bold text-natural-gold whitespace-nowrap">
                      {selectedCommodity.unit}
                    </span>
                  </div>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/15 text-center sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-natural-gold">
                    Estimated Gross Payout
                  </p>
                  <p className="text-2xl sm:text-3xl font-serif font-black text-white mt-0.5">
                    {hub?.currencySymbol}{calcGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-white/60">
                    Based on spot rate of {selectedCommodity.price}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Other Regional Commodities in Hub */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Coins size={16} className="text-natural-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-natural-accent">
                Other Commodities at {hub?.name}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {commodities.filter(c => c.crop !== selectedCommodity.crop).map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCommodity(c)}
                  className="bg-white p-4 rounded-2xl border border-natural-accent/15 flex items-center justify-between text-left hover:border-natural-accent/40 transition-all card-shadow group"
                >
                  <div>
                    <h5 className="font-bold text-natural-primary text-sm group-hover:text-emerald-700 transition-colors">
                      {c.crop}
                    </h5>
                    <p className={`text-[10px] font-bold flex items-center gap-0.5 ${
                      c.trend === 'up' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {c.trend === 'up' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {c.changePercent}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif font-bold text-natural-primary text-sm">
                      {c.price}
                    </p>
                    <p className="text-[9px] text-natural-text/50">View Details →</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
