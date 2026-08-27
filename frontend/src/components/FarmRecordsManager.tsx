import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Calendar, 
  Sprout, 
  Leaf, 
  Cloud, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  RefreshCw, 
  Filter, 
  Search, 
  Layers, 
  Check, 
  ChevronRight, 
  X, 
  Activity, 
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  Download,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, type FarmRecord, type FarmerProfile, type Diagnosis } from '../db';
import { TRANSLATIONS, type Language } from '../translations';
import { CropRotationPlanner } from './CropRotationPlanner';
import { 
  exportFarmRecordsToCSV, 
  exportDiagnosesToCSV, 
  exportExtensionMasterAuditCSV, 
  exportSingleRecordCSV 
} from '../csvExport';
import { cn } from '../lib/utils';

export { cn };

interface FarmRecordsManagerProps {
  language: Language;
  profile: FarmerProfile | null;
  onNavigateToRotation?: () => void;
}

const COMMON_CROPS = [
  { name: 'Maize', defaultDays: 135, yieldUnit: 'Tons/Ha', varieties: ['SC 719 (Seed Co)', 'Pioneer 30G19', 'PAN 53 (Pannar)', 'ZAP 61', 'SC 403 (Early)'] },
  { name: 'Tomatoes', defaultDays: 80, yieldUnit: 'Crates', varieties: ['Rodade', 'Tengeru 97', 'Daisy F1', 'Money Maker'] },
  { name: 'Sugar Beans', defaultDays: 90, yieldUnit: 'Tons/Ha', varieties: ['Gloria', 'NUA 45 (Biofortified)', 'Sweet Valentine', 'PAN 148'] },
  { name: 'Soybeans', defaultDays: 120, yieldUnit: 'Tons/Ha', varieties: ['SC Safari', 'PAN 1867', 'Soprano', 'Lukanga'] },
  { name: 'Tobacco', defaultDays: 120, yieldUnit: 'Kg', varieties: ['Kutsaga 26 R', 'T 66', 'KRK 26', 'KM 10'] },
  { name: 'Groundnuts', defaultDays: 110, yieldUnit: 'Buckets (20L)', varieties: ['Ilanda', 'Nyanda', 'Natal Common', 'Makulu Red'] },
  { name: 'Irish Potatoes', defaultDays: 95, yieldUnit: 'Bags (50kg)', varieties: ['Bp1', 'Montclare', 'Shangi', 'Amethyst'] },
  { name: 'Cabbage', defaultDays: 75, yieldUnit: 'Crates', varieties: ['Marcanta F1', 'Green Star', 'Star 3301', 'Sugarloaf'] },
  { name: 'Sorghum', defaultDays: 115, yieldUnit: 'Tons/Ha', varieties: ['Macia', 'SV 2', 'Kavandame', 'Red Swazi'] },
  { name: 'Onions', defaultDays: 140, yieldUnit: 'Bags (50kg)', varieties: ['Texas Grano', 'Red Creole', 'Hojem F1', 'Sivan'] },
  { name: 'Sweet Potatoes', defaultDays: 120, yieldUnit: 'Bags (50kg)', varieties: ['Chingovhe', 'Orange Flesh (OFSP)', 'German 2', 'Alisha'] }
];

export function FarmRecordsManager({ language, profile }: FarmRecordsManagerProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;
  const [records, setRecords] = useState<FarmRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'records' | 'rotation'>('records');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<FarmRecord | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<FarmRecord | null>(null);
  const [treatmentModalRecord, setTreatmentModalRecord] = useState<FarmRecord | null>(null);
  const [harvestModalRecord, setHarvestModalRecord] = useState<FarmRecord | null>(null);

  // Load records from IndexedDB
  const loadRecords = async () => {
    try {
      const all = await db.records.toArray();
      setRecords(all.reverse());
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  };

  useEffect(() => {
    loadRecords();
    window.addEventListener('db-synced', loadRecords);
    return () => window.removeEventListener('db-synced', loadRecords);
  }, []);

  // Summary statistics
  const totalCrops = records.length;
  const activeCrops = records.filter(r => r.status !== 'Harvested' && r.status !== 'Failed').length;
  const harvestedCrops = records.filter(r => r.status === 'Harvested').length;
  const totalInputs = records.reduce((acc, r) => acc + (r.inputCosts || 0) + (r.treatments?.reduce((tAcc, tr) => tAcc + (tr.cost || 0), 0) || 0), 0);
  const totalRevenue = records.reduce((acc, r) => acc + (r.revenue || 0), 0);

  // Filtered records
  const filteredRecords = records.filter(r => {
    const matchesStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'active' 
      ? r.status !== 'Harvested' && r.status !== 'Failed'
      : r.status.toLowerCase() === filterStatus.toLowerCase();

    const matchesSearch = !searchQuery.trim() || 
      r.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.variety && r.variety.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.fieldOrPlotName && r.fieldOrPlotName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleDeleteRecord = async (id?: number) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this farm record?')) {
      await db.records.delete(id);
      loadRecords();
      if (selectedRecordForDetail?.id === id) {
        setSelectedRecordForDetail(null);
      }
    }
  };

  const handleUpdateStatus = async (record: FarmRecord, newStatus: FarmRecord['status']) => {
    if (!record.id) return;
    await db.records.update(record.id, { status: newStatus, synced: false });
    loadRecords();
    if (selectedRecordForDetail?.id === record.id) {
      setSelectedRecordForDetail({ ...selectedRecordForDetail, status: newStatus });
    }
  };

  return (
    <div className="p-4 space-y-6 pb-28">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-natural-primary">{t.records}</h2>
            <span className="px-2.5 py-0.5 bg-natural-primary/10 text-natural-primary font-bold text-xs rounded-full">
              {totalCrops} Logged
            </span>
          </div>
          <p className="text-xs text-natural-text/60 font-medium mt-0.5">
            Log your plantings, monitor field stages, inputs & harvest yields
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="p-3 bg-natural-gold/15 text-natural-primary border border-natural-gold/30 rounded-2xl shadow-sm hover:bg-natural-gold/25 transition-all flex items-center gap-1.5 text-xs font-bold"
            title={t.exportCSV || "Export Data (CSV)"}
          >
            <FileSpreadsheet size={16} className="text-amber-700" />
            <span className="hidden sm:inline">{t.exportCSV || "Export CSV"}</span>
          </button>

          <button 
            onClick={() => (window as any).performSync?.()}
            className="p-3 bg-natural-tan text-natural-primary rounded-2xl shadow-sm hover:bg-natural-tan/70 transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Sync with Cloud"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-3 bg-natural-primary text-white rounded-2xl shadow-lg hover:bg-natural-primary/90 transition-all flex items-center gap-2 text-xs font-bold active:scale-95"
          >
            <Plus size={16} className="text-natural-gold" />
            <span>+ Add My Crop Record</span>
          </button>
        </div>
      </div>

      {/* Export Notification Toast */}
      {exportFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm"
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

      {/* Subtab Navigation (Farm Records vs Crop Rotation Strategy) */}
      <div className="flex bg-natural-tan/40 p-1 rounded-2xl border border-natural-accent/10">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'records'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          }`}
        >
          <Layers size={16} />
          <span>My Farm Records ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rotation'
              ? "bg-white text-natural-primary shadow-sm"
              : "text-natural-accent hover:text-natural-primary"
          }`}
        >
          <Sparkles size={16} className="text-natural-gold" />
          <span>{t.cropRotation}</span>
        </button>
      </div>

      {activeTab === 'rotation' ? (
        <CropRotationPlanner 
          language={language}
          onNavigateToRecords={() => {
            setActiveTab('records');
            loadRecords();
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-[24px] border border-natural-accent/10 card-shadow space-y-1">
              <div className="flex items-center justify-between text-natural-accent">
                <span className="text-[10px] font-black uppercase tracking-wider">Active Crops</span>
                <Sprout size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-serif font-black text-natural-primary">{activeCrops}</p>
              <p className="text-[10px] text-natural-text/50 font-medium">Currently in ground</p>
            </div>

            <div className="bg-white p-4 rounded-[24px] border border-natural-accent/10 card-shadow space-y-1">
              <div className="flex items-center justify-between text-natural-accent">
                <span className="text-[10px] font-black uppercase tracking-wider">Harvested</span>
                <Award size={16} className="text-natural-gold" />
              </div>
              <p className="text-2xl font-serif font-black text-natural-primary">{harvestedCrops}</p>
              <p className="text-[10px] text-natural-text/50 font-medium">Completed cycles</p>
            </div>

            <div className="bg-white p-4 rounded-[24px] border border-natural-accent/10 card-shadow space-y-1">
              <div className="flex items-center justify-between text-natural-accent">
                <span className="text-[10px] font-black uppercase tracking-wider">Logged Inputs</span>
                <DollarSign size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-serif font-black text-natural-primary">${totalInputs.toFixed(0)}</p>
              <p className="text-[10px] text-natural-text/50 font-medium">Fertilizer & seeds</p>
            </div>

            <div className="bg-white p-4 rounded-[24px] border border-natural-accent/10 card-shadow space-y-1">
              <div className="flex items-center justify-between text-natural-accent">
                <span className="text-[10px] font-black uppercase tracking-wider">Revenue</span>
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-serif font-black text-emerald-700">${totalRevenue.toFixed(0)}</p>
              <p className="text-[10px] text-natural-text/50 font-medium">Harvest sales</p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-accent" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by crop, variety, or plot name..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-natural-accent/15 text-xs text-natural-primary placeholder:text-natural-text/40 focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-text/40 hover:text-natural-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'active', 'Growing', 'Harvesting', 'Harvested'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === status
                      ? "bg-natural-primary text-white shadow-sm"
                      : "bg-white text-natural-accent border border-natural-accent/15 hover:bg-natural-tan/30"
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'active' ? '🌱 Active Only' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((record) => {
              const daysPlanted = Math.max(0, Math.floor((Date.now() - new Date(record.plantingDate).getTime()) / (1000 * 60 * 60 * 24)));
              const statusColor = 
                record.status === 'Growing' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                record.status === 'Harvesting' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                record.status === 'Harvested' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                record.status === 'Nursery' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                'bg-stone-100 text-stone-700 border-stone-200';

              return (
                <div 
                  key={record.id}
                  className="bg-white p-5 rounded-[32px] border border-natural-accent/15 card-shadow hover:border-natural-accent/40 transition-all flex flex-col justify-between space-y-4 group"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-bold text-lg text-natural-primary">
                          {record.cropName}
                        </h3>
                        {record.variety && (
                          <span className="text-[11px] font-semibold text-natural-accent bg-natural-tan/40 px-2 py-0.5 rounded-md">
                            {record.variety}
                          </span>
                        )}
                        {record.synced ? (
                          <div className="flex items-center gap-0.5 text-emerald-600 text-[9px] font-bold" title="Synced with cloud">
                            <Cloud size={11} />
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Local record (Pending sync)" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-natural-text/60 mt-1">
                        {record.fieldOrPlotName && (
                          <span className="font-medium flex items-center gap-1">
                            📍 {record.fieldOrPlotName}
                          </span>
                        )}
                        {record.fieldSize && (
                          <span>
                            • {record.fieldSize} {record.fieldSizeUnit || 'Ha'}
                          </span>
                        )}
                        {record.plantingMethod && (
                          <span className="bg-natural-bg px-2 py-0.5 rounded text-[10px] font-semibold text-natural-accent">
                            {record.plantingMethod}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${statusColor}`}>
                      {record.status}
                    </span>
                  </div>

                  {/* Date & Yield Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-natural-tan/20 p-3 rounded-2xl border border-natural-accent/10 text-center">
                    <div>
                      <p className="text-[9px] font-black uppercase text-natural-accent">Planted</p>
                      <p className="text-xs font-bold text-natural-primary mt-0.5">
                        {new Date(record.plantingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-[9px] text-natural-text/50">{daysPlanted}d ago</p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase text-natural-accent">Harvest Window</p>
                      <p className="text-xs font-bold text-natural-primary mt-0.5">
                        {record.expectedHarvestDate 
                          ? new Date(record.expectedHarvestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : 'TBD'}
                      </p>
                      <p className="text-[9px] text-emerald-700 font-semibold">
                        {record.actualHarvestDate ? '✓ Harvested' : 'Target'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase text-natural-accent">Yield</p>
                      <p className="text-xs font-black text-natural-primary mt-0.5">
                        {record.yield ? `${record.yield} ${record.yieldUnit?.split(' ')[0] || 't'}` : '—'}
                      </p>
                      <p className="text-[9px] text-natural-text/50 font-medium">
                        {record.revenue ? `$${record.revenue} rev` : 'Est'}
                      </p>
                    </div>
                  </div>

                  {/* Treatments & Notes Preview */}
                  {record.treatments && record.treatments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-natural-accent uppercase tracking-wider">
                        <span>Treatments & Activities ({record.treatments.length})</span>
                      </div>
                      <div className="space-y-1">
                        {record.treatments.slice(-2).map((tr, idx) => (
                          <div key={idx} className="text-xs bg-white p-2 rounded-xl border border-natural-accent/10 flex items-center justify-between">
                            <span className="text-natural-text/80 line-clamp-1">
                              • <span className="font-semibold text-natural-primary">{tr.date}:</span> {tr.description}
                            </span>
                            {tr.cost ? (
                              <span className="text-[10px] font-bold text-amber-700 shrink-0 ml-2">
                                -${tr.cost}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {record.notes && (
                    <p className="text-xs text-natural-text/70 italic line-clamp-2 bg-natural-tan/10 p-2.5 rounded-xl">
                      "{record.notes}"
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-natural-accent/10">
                    <button
                      onClick={() => setTreatmentModalRecord(record)}
                      className="px-3 py-2 bg-natural-tan/60 hover:bg-natural-tan text-natural-primary rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Log fertilizer or pest treatment"
                    >
                      <Plus size={13} />
                      <span>Log Activity</span>
                    </button>

                    {record.status !== 'Harvested' && (
                      <button
                        onClick={() => setHarvestModalRecord(record)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Record harvest yield & sales"
                      >
                        <Award size={13} />
                        <span>Record Harvest</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => {
                          exportSingleRecordCSV(record, profile);
                          setExportFeedback(`Exported ${record.cropName} crop record to CSV!`);
                          setTimeout(() => setExportFeedback(null), 3500);
                        }}
                        className="p-2 text-natural-accent hover:text-amber-800 rounded-xl hover:bg-natural-gold/15 transition-colors"
                        title={t.exportSingleRecord || "Download Record Slip (CSV)"}
                      >
                        <FileSpreadsheet size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setEditingRecord(record);
                          setIsAddModalOpen(true);
                        }}
                        className="p-2 text-natural-accent hover:text-natural-primary rounded-xl hover:bg-natural-tan/40 transition-colors"
                        title="Edit Record"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 text-red-500 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredRecords.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-[40px] border-2 border-dashed border-natural-accent/20 space-y-4">
              <div className="h-16 w-16 bg-natural-tan/50 rounded-full flex items-center justify-center mx-auto text-natural-accent">
                <Sprout size={32} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-serif font-bold text-lg text-natural-primary">
                  {searchQuery ? "No matching farm records found" : "No Custom Crop Records Logged Yet"}
                </h4>
                <p className="text-xs text-natural-text/60 leading-relaxed">
                  {searchQuery 
                    ? "Try clearing your search query or switching filters."
                    : "Track your fields, maize plantings, tomato beds, fertilizers, and expected harvest dates to optimize your seasonal yields."}
                </p>
              </div>

              {!searchQuery && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-5 py-3 bg-natural-primary text-white rounded-2xl text-xs font-bold shadow-md hover:bg-natural-primary/90 transition-all flex items-center gap-2"
                  >
                    <Plus size={16} className="text-natural-gold" />
                    <span>Create Your First Farm Record</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Record Modal */}
      {isAddModalOpen && (
        <AddEditRecordModal
          record={editingRecord}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={async (recordData) => {
            if (editingRecord?.id) {
              await db.records.update(editingRecord.id, { ...recordData, synced: false });
            } else {
              await db.records.add({
                cropName: recordData.cropName || 'Maize',
                plantingDate: recordData.plantingDate || new Date().toISOString().split('T')[0],
                status: recordData.status || 'Growing',
                synced: false,
                createdAt: Date.now(),
                ...recordData
              } as FarmRecord);
            }
            setIsAddModalOpen(false);
            setEditingRecord(null);
            loadRecords();
          }}
        />
      )}

      {/* Log Activity / Treatment Modal */}
      {treatmentModalRecord && (
        <LogActivityModal
          record={treatmentModalRecord}
          onClose={() => setTreatmentModalRecord(null)}
          onSave={async (treatment) => {
            if (!treatmentModalRecord.id) return;
            const updatedTreatments = [...(treatmentModalRecord.treatments || []), treatment];
            await db.records.update(treatmentModalRecord.id, {
              treatments: updatedTreatments,
              synced: false
            });
            setTreatmentModalRecord(null);
            loadRecords();
          }}
        />
      )}

      {/* Record Harvest Modal */}
      {harvestModalRecord && (
        <RecordHarvestModal
          record={harvestModalRecord}
          onClose={() => setHarvestModalRecord(null)}
          onSave={async (harvestData) => {
            if (!harvestModalRecord.id) return;
            await db.records.update(harvestModalRecord.id, {
              ...harvestData,
              status: 'Harvested',
              synced: false
            });
            setHarvestModalRecord(null);
            loadRecords();
          }}
        />
      )}

      {/* CSV Export Modal */}
      {isExportModalOpen && (
        <ExportDataModal
          language={language}
          profile={profile}
          records={records}
          onClose={() => setIsExportModalOpen(false)}
          onExportSuccess={(message) => {
            setIsExportModalOpen(false);
            setExportFeedback(message);
            setTimeout(() => setExportFeedback(null), 3500);
          }}
        />
      )}
    </div>
  );
}

/**
 * CSV Export Modal Component for Farm Records & Diagnosis Reports
 */
function ExportDataModal({
  language,
  profile,
  records,
  onClose,
  onExportSuccess
}: {
  language: Language;
  profile: FarmerProfile | null;
  records: FarmRecord[];
  onClose: () => void;
  onExportSuccess: (msg: string) => void;
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.diagnoses.toArray().then(items => setDiagnoses(items.reverse()));
  }, []);

  const handleExportRecords = () => {
    exportFarmRecordsToCSV(records, profile);
    onExportSuccess(`Downloaded ${records.length} farm records as CSV!`);
  };

  const handleExportDiagnoses = () => {
    exportDiagnosesToCSV(diagnoses, profile);
    onExportSuccess(`Downloaded ${diagnoses.length} diagnosis reports as CSV!`);
  };

  const handleExportMasterAudit = () => {
    exportExtensionMasterAuditCSV(records, diagnoses, profile);
    onExportSuccess("Downloaded Comprehensive Extension Officer Master Dossier (.CSV)!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[36px] card-shadow border border-natural-accent/10 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-natural-accent/10 flex items-center justify-between bg-natural-primary text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-natural-gold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">{t.exportDataTitle || "Export Farm Data (CSV)"}</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/60">Offline Agritex & Spreadsheet Ready</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-natural-text/70 leading-relaxed font-medium">
            {t.exportDescription || "Download structured CSV files to view offline, open in Microsoft Excel / Google Sheets, or submit to local agricultural extension officers (Agritex) for season audits and input support."}
          </p>

          <div className="space-y-3 pt-1">
            {/* Option 1: Farm Records CSV */}
            <div className="p-4 rounded-3xl bg-natural-tan/20 border border-natural-accent/15 hover:border-natural-gold/50 transition-all space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-natural-primary text-white rounded-xl">
                    <Sprout size={18} className="text-natural-gold" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-natural-primary">
                      {t.exportRecordsCSV || "Farm Planting & Harvest Ledger"}
                    </h4>
                    <p className="text-[11px] text-natural-text/60 font-medium">
                      {records.length} crop records • Fields, varieties, input costs & yield revenues
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportRecords}
                className="w-full py-2.5 px-4 bg-white hover:bg-natural-tan/50 text-natural-primary border border-natural-accent/20 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Download size={14} className="text-natural-gold" />
                <span>{t.downloadFarmRecordsCSV || "Download Farm Records (.CSV)"}</span>
              </button>
            </div>

            {/* Option 2: Diagnosis Reports CSV */}
            <div className="p-4 rounded-3xl bg-natural-tan/20 border border-natural-accent/15 hover:border-natural-gold/50 transition-all space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-700 text-white rounded-xl">
                    <Leaf size={18} className="text-emerald-200" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-natural-primary">
                      {t.exportDiagnosesCSV || "Crop Disease & Pest Diagnosis Log"}
                    </h4>
                    <p className="text-[11px] text-natural-text/60 font-medium">
                      {diagnoses.length} disease scans • Health status, symptoms, organic & chemical treatments
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportDiagnoses}
                className="w-full py-2.5 px-4 bg-white hover:bg-natural-tan/50 text-natural-primary border border-natural-accent/20 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Download size={14} className="text-emerald-700" />
                <span>{t.downloadDiagnosesCSV || "Download Diagnosis Log (.CSV)"}</span>
              </button>
            </div>

            {/* Option 3: Master Extension Officer Dossier */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-700 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet size={18} className="text-amber-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif font-bold text-sm text-amber-950">
                        {t.exportMasterAuditCSV || "Extension Officer Master Dossier"}
                      </h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/70 font-medium">
                      Combined comprehensive dossier with farmer profile, seasonal KPIs, all crops, and full pest history
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportMasterAudit}
                className="w-full py-3 px-4 bg-natural-primary hover:bg-natural-primary/90 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <FileSpreadsheet size={15} className="text-natural-gold" />
                <span>{t.downloadMasterAuditCSV || "Export Extension Master Dossier (.CSV)"}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-natural-tan/30 rounded-2xl text-[11px] text-natural-text/60 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>Files are encoded in UTF-8 with standard Excel delimiters and work completely offline.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-natural-tan/20 border-t border-natural-accent/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white text-natural-primary border border-natural-accent/20 rounded-2xl text-xs font-bold hover:bg-natural-tan/40 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Add / Edit Modal Form Component
 */
function AddEditRecordModal({
  record,
  onClose,
  onSave
}: {
  record: FarmRecord | null;
  onClose: () => void;
  onSave: (data: Partial<FarmRecord>) => void;
}) {
  const [cropName, setCropName] = useState(record?.cropName || 'Maize');
  const [variety, setVariety] = useState(record?.variety || '');
  const [fieldOrPlotName, setFieldOrPlotName] = useState(record?.fieldOrPlotName || 'Main Field');
  const [fieldSize, setFieldSize] = useState<string>(record?.fieldSize ? String(record.fieldSize) : '1.0');
  const [fieldSizeUnit, setFieldSizeUnit] = useState<FarmRecord['fieldSizeUnit']>(record?.fieldSizeUnit || 'Hectares');
  const [plantingDate, setPlantingDate] = useState(record?.plantingDate || new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState(record?.expectedHarvestDate || '');
  const [plantingMethod, setPlantingMethod] = useState<FarmRecord['plantingMethod']>(record?.plantingMethod || 'Pfumvudza/Basins');
  const [status, setStatus] = useState<FarmRecord['status']>(record?.status || 'Growing');
  const [yieldEst, setYieldEst] = useState<string>(record?.yield ? String(record.yield) : '5.0');
  const [yieldUnit, setYieldUnit] = useState<FarmRecord['yieldUnit']>(record?.yieldUnit || 'Tons/Ha');
  const [inputCosts, setInputCosts] = useState<string>(record?.inputCosts ? String(record.inputCosts) : '');
  const [notes, setNotes] = useState(record?.notes || '');

  // Automatically calculate expected harvest date when crop or planting date changes
  const handleCropChange = (selectedName: string) => {
    setCropName(selectedName);
    const matched = COMMON_CROPS.find(c => c.name.toLowerCase() === selectedName.toLowerCase());
    if (matched) {
      if (!variety && matched.varieties[0]) {
        setVariety(matched.varieties[0]);
      }
      setYieldUnit(matched.yieldUnit as any);

      // Auto-compute harvest date
      const pDate = new Date(plantingDate || Date.now());
      pDate.setDate(pDate.getDate() + matched.defaultDays);
      setExpectedHarvestDate(pDate.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (!expectedHarvestDate && plantingDate) {
      const matched = COMMON_CROPS.find(c => c.name.toLowerCase() === cropName.toLowerCase());
      const days = matched?.defaultDays || 120;
      const pDate = new Date(plantingDate);
      pDate.setDate(pDate.getDate() + days);
      setExpectedHarvestDate(pDate.toISOString().split('T')[0]);
    }
  }, [plantingDate, cropName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim()) return;

    onSave({
      cropName: cropName.trim(),
      variety: variety.trim() || undefined,
      fieldOrPlotName: fieldOrPlotName.trim() || undefined,
      fieldSize: fieldSize ? parseFloat(fieldSize) : undefined,
      fieldSizeUnit,
      plantingDate,
      expectedHarvestDate: expectedHarvestDate || undefined,
      plantingMethod,
      status,
      yield: yieldEst ? parseFloat(yieldEst) : undefined,
      yieldUnit,
      inputCosts: inputCosts ? parseFloat(inputCosts) : undefined,
      notes: notes.trim() || undefined,
      treatments: record?.treatments || []
    });
  };

  const selectedCropObj = COMMON_CROPS.find(c => c.name.toLowerCase() === cropName.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[36px] overflow-hidden shadow-2xl border border-natural-accent/20 max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 bg-natural-primary text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-natural-gold">
              <Sprout size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg">
                {record ? 'Edit Farm Record' : 'Add New Farm Record'}
              </h3>
              <p className="text-[11px] text-white/70 font-medium">Log field plots, varieties, planting dates & targets</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Common Crop Quick Selector Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-natural-primary uppercase tracking-wider block">
              Select Crop
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {COMMON_CROPS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleCropChange(c.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    cropName.toLowerCase() === c.name.toLowerCase()
                      ? "bg-natural-primary text-white shadow-sm"
                      : "bg-natural-tan/30 text-natural-text/75 hover:bg-natural-tan"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Crop Name & Variety */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Crop Name *</label>
              <input
                type="text"
                required
                value={cropName}
                onChange={e => setCropName(e.target.value)}
                placeholder="e.g. Maize, Sugar Beans..."
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Seed Variety / Hybrid</label>
              <input
                type="text"
                value={variety}
                onChange={e => setVariety(e.target.value)}
                placeholder="e.g. SC 719, Rodade, Gloria..."
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
              {selectedCropObj && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCropObj.varieties.slice(0, 3).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVariety(v)}
                      className="text-[10px] bg-natural-bg px-2 py-0.5 rounded text-natural-accent hover:text-natural-primary font-medium"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plot Name & Field Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Field / Plot Name</label>
              <input
                type="text"
                value={fieldOrPlotName}
                onChange={e => setFieldOrPlotName(e.target.value)}
                placeholder="e.g. Plot 1, East Field"
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Field Size</label>
              <input
                type="number"
                step="0.1"
                value={fieldSize}
                onChange={e => setFieldSize(e.target.value)}
                placeholder="1.0"
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Unit</label>
              <select
                value={fieldSizeUnit}
                onChange={e => setFieldSizeUnit(e.target.value as any)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              >
                <option value="Hectares">Hectares (Ha)</option>
                <option value="Acres">Acres</option>
                <option value="Basins">Pfumvudza Basins</option>
                <option value="Plots">Beds / Plots</option>
                <option value="Sq Meters">Sq Meters</option>
              </select>
            </div>
          </div>

          {/* Dates & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Planting Date *</label>
              <input
                type="date"
                required
                value={plantingDate}
                onChange={e => setPlantingDate(e.target.value)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Expected Harvest Window</label>
              <input
                type="date"
                value={expectedHarvestDate}
                onChange={e => setExpectedHarvestDate(e.target.value)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>
          </div>

          {/* Planting Method & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Planting Technique</label>
              <select
                value={plantingMethod}
                onChange={e => setPlantingMethod(e.target.value as any)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              >
                <option value="Pfumvudza/Basins">Pfumvudza / Planting Basins</option>
                <option value="Direct Seeding">Direct Seeding (Standard Furrow)</option>
                <option value="Nursery Transplant">Nursery Seedling Transplant</option>
                <option value="Ridge & Furrow">Ridge & Furrow</option>
                <option value="Drip Irrigation">Drip Irrigation Bed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Current Crop Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              >
                <option value="Nursery">Nursery / Seedbed</option>
                <option value="Germinated">Germinated / Emergence</option>
                <option value="Growing">Vegetative / Growing</option>
                <option value="Flowering">Flowering / Tasseling</option>
                <option value="Harvesting">Harvesting in Progress</option>
                <option value="Harvested">Harvest Completed</option>
                <option value="Failed">Failed / Crop Loss</option>
              </select>
            </div>
          </div>

          {/* Yield Target & Input Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Expected Yield</label>
              <input
                type="number"
                step="0.1"
                value={yieldEst}
                onChange={e => setYieldEst(e.target.value)}
                placeholder="5.0"
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Yield Unit</label>
              <select
                value={yieldUnit}
                onChange={e => setYieldUnit(e.target.value as any)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              >
                <option value="Tons/Ha">Tons/Ha</option>
                <option value="Tons">Total Tons</option>
                <option value="Bags (50kg)">Bags (50kg)</option>
                <option value="Bags (90kg)">Bags (90kg)</option>
                <option value="Crates">Crates (20kg)</option>
                <option value="Buckets (20L)">20L Buckets</option>
                <option value="Kg">Kilograms (Kg)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Initial Cost ($)</label>
              <input
                type="number"
                step="1"
                value={inputCosts}
                onChange={e => setInputCosts(e.target.value)}
                placeholder="e.g. 150"
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
              />
            </div>
          </div>

          {/* Notes & Observations */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Notes / Field Soil Observations</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Applied compound D basal fertilizer @ 400kg/ha, mulched with maize stover..."
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary"
            />
          </div>

          {/* Footer Save Button */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-natural-accent/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-natural-text/70 hover:bg-natural-tan/40 rounded-2xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-natural-primary text-white rounded-2xl text-xs font-bold shadow-lg hover:bg-natural-primary/90 transition-all flex items-center gap-2"
            >
              <Check size={16} className="text-natural-gold" />
              <span>{record ? 'Update Record' : 'Save Farm Record'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * Log Activity / Fertilizer / Treatment Modal
 */
function LogActivityModal({
  record,
  onClose,
  onSave
}: {
  record: FarmRecord;
  onClose: () => void;
  onSave: (treatment: { date: string; description: string; type?: string; cost?: number }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('Fertilizer');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');

  const QUICK_ACTIVITIES = [
    { type: 'Fertilizer', text: 'Applied Ammonium Nitrate (AN) Top Dressing @ 100kg/ha' },
    { type: 'Pesticide', text: 'Sprayed for Fall Armyworm / Caterpillars' },
    { type: 'Weeding', text: 'Hand-weeded basins & mulched soil surface' },
    { type: 'Irrigation', text: 'Applied 25mm supplemental drip irrigation' },
    { type: 'Fungicide', text: 'Preventative Copper Oxychloride spray for Early Blight' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onSave({
      date,
      type,
      description: description.trim(),
      cost: cost ? parseFloat(cost) : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl border border-natural-accent/20 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-natural-primary">
              Log Activity: {record.cropName}
            </h3>
            <p className="text-[11px] text-natural-text/60 font-medium">{record.fieldOrPlotName || 'Field log'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-natural-text/40 hover:text-natural-primary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Activity Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Category</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            >
              <option value="Fertilizer">Fertilizer Top-Dressing</option>
              <option value="Pesticide">Pest Control Spray</option>
              <option value="Fungicide">Fungicide Treatment</option>
              <option value="Weeding">Weeding & Mulching</option>
              <option value="Irrigation">Irrigation / Watering</option>
              <option value="Other">Other Field Work</option>
            </select>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-natural-accent uppercase">Quick Suggestions</p>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {QUICK_ACTIVITIES.map((qa, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setType(qa.type);
                    setDescription(qa.text);
                  }}
                  className="w-full text-left p-2 rounded-xl text-[11px] bg-natural-tan/20 hover:bg-natural-tan/50 text-natural-primary transition-colors line-clamp-1"
                >
                  + {qa.text}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Activity Description *</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Applied 50kg Ammonium Nitrate per acre..."
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Input / Labor Cost ($)</label>
            <input
              type="number"
              step="0.5"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="e.g. 45"
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-natural-text/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-natural-primary text-white rounded-2xl text-xs font-bold shadow-md hover:bg-natural-primary/90"
            >
              Save Activity
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * Record Actual Harvest Modal
 */
function RecordHarvestModal({
  record,
  onClose,
  onSave
}: {
  record: FarmRecord;
  onClose: () => void;
  onSave: (data: { actualHarvestDate: string; yield: number; yieldUnit?: FarmRecord['yieldUnit']; revenue?: number }) => void;
}) {
  const [actualHarvestDate, setActualHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [harvestYield, setHarvestYield] = useState(record.yield ? String(record.yield) : '6.0');
  const [yieldUnit, setYieldUnit] = useState<FarmRecord['yieldUnit']>(record.yieldUnit || 'Tons');
  const [revenue, setRevenue] = useState(record.revenue ? String(record.revenue) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!harvestYield) return;

    onSave({
      actualHarvestDate,
      yield: parseFloat(harvestYield),
      yieldUnit,
      revenue: revenue ? parseFloat(revenue) : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl border border-natural-accent/20 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-natural-primary">
                Record Final Harvest
              </h3>
              <p className="text-[11px] text-natural-text/60 font-medium">{record.cropName} ({record.variety || 'Standard'})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-natural-text/40 hover:text-natural-primary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Actual Harvest Date</label>
            <input
              type="date"
              required
              value={actualHarvestDate}
              onChange={e => setActualHarvestDate(e.target.value)}
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Total Yield Harvested *</label>
              <input
                type="number"
                step="0.1"
                required
                value={harvestYield}
                onChange={e => setHarvestYield(e.target.value)}
                placeholder="6.5"
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-text/80">Unit</label>
              <select
                value={yieldUnit}
                onChange={e => setYieldUnit(e.target.value as any)}
                className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
              >
                <option value="Tons/Ha">Tons/Ha</option>
                <option value="Tons">Tons Total</option>
                <option value="Bags (50kg)">Bags (50kg)</option>
                <option value="Bags (90kg)">Bags (90kg)</option>
                <option value="Crates">Crates</option>
                <option value="Buckets (20L)">20L Buckets</option>
                <option value="Kg">Kg</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-natural-text/80">Total Revenue / Sales Amount ($)</label>
            <input
              type="number"
              step="1"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              placeholder="e.g. 2100"
              className="w-full p-3 bg-natural-tan/20 rounded-2xl border border-natural-accent/15 text-xs text-natural-primary font-medium"
            />
            <p className="text-[10px] text-natural-text/50">Leave blank if stored for home consumption</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-natural-text/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-emerald-800"
            >
              Mark Harvest Complete
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
