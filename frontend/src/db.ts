import Dexie, { type Table } from 'dexie';

export interface Diagnosis {
  id?: number;
  timestamp: number;
  imageUrl: string;
  synced?: boolean;
  resolved?: boolean;
  resolvedAt?: number;
  treatmentApplied?: string;
  data: {
    subjectType?: 'Plant' | 'Animal' | 'Unknown';
    plantName: { common: string; scientific: string };
    animalName?: { common: string; scientific: string };
    animalSpecies?: string;
    animalAgeOrClass?: string;
    cropType: string;
    growthStage: string;
    healthStatus: string;
    diagnosis: {
      name: string;
      description?: string;
      confidence: string;
      causes: string[];
      severity: string;
      isBeneficial?: boolean;
      symptoms?: string[];
      lifeCycle?: string;
      regionalImpact?: string;
      zoonoticRisk?: 'None' | 'Low' | 'Medium' | 'High';
    };
    advisory: {
      organicOptions: string[];
      chemicalOptions: string[];
      prevention: string[];
      scamAlert?: string;
      immediateAction?: string[];
      veterinaryAdvice?: string;
    };
    soilAdvice?: string;
    localization: string;
    translations: {
      shona: string;
      ndebele: string;
      english: string;
      swahili?: string;
      zulu?: string;
    };
  };
}

export interface FarmerProfile {
  id?: number;
  accountEmail?: string;
  name: string;
  language: 'English' | 'Shona' | 'Ndebele' | 'Swahili' | 'Zulu';
  country?: string;
  region: string;
  gpsLocation?: { lat: number; lng: number };
  mainCrops: string[];
  synced?: boolean;
}

export interface FarmRecord {
  id?: number;
  cropName: string;
  variety?: string;
  fieldOrPlotName?: string;
  fieldSize?: number;
  fieldSizeUnit?: 'Hectares' | 'Acres' | 'Basins' | 'Plots' | 'Sq Meters';
  plantingDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  plantingMethod?: 'Pfumvudza/Basins' | 'Direct Seeding' | 'Nursery Transplant' | 'Ridge & Furrow' | 'Drip Irrigation';
  status: 'Nursery' | 'Germinated' | 'Growing' | 'Flowering' | 'Harvesting' | 'Harvested' | 'Failed';
  treatments: { date: string; description: string; type?: string; cost?: number }[];
  yield?: number;
  yieldUnit?: 'Tons/Ha' | 'Tons' | 'Bags (50kg)' | 'Bags (90kg)' | 'Crates' | 'Kg' | 'Buckets (20L)';
  inputCosts?: number;
  revenue?: number;
  notes?: string;
  synced?: boolean;
  createdAt?: number;
}

export interface CropRotationSequenceItem {
  seasonNumber: number;
  seasonName: string;
  cropName: string;
  cropFamily: string;
  durationMonths: string;
  purpose: string;
  soilHealthImpact: string;
  pestDiseaseControl: string;
  waterRequirements: 'Low' | 'Medium' | 'High';
  fieldTips: string;
}

export interface CropRotationPlan {
  id?: number;
  timestamp: number;
  title: string;
  fieldOrPlotName?: string;
  soilTypeContext: string;
  previousCropsAnalyzed: string[];
  pestRisksAddressed: string[];
  summary: string;
  soilHealthScore: number;
  pestBreakScore: number;
  sequence: CropRotationSequenceItem[];
  longTermBenefits: string[];
  synced?: boolean;
}

export interface SoilTestRecord {
  id?: number;
  timestamp: number;
  color: string;
  texture: string;
  smell: string;
  additional?: string;
  targetCrop?: string;
  soilType: string;
  analysis: string;
  suitability: string[];
  improvement: string[];
  caution?: string;
  cropSpecificAdvice?: string;
}

export interface ScheduledAlert {
  id?: number;
  alertId: string;
  type: 'planting_window' | 'heavy_rainfall' | 'frost' | 'pest_outbreak' | 'fertilizer_timing' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  region: string;
  country: string;
  targetCrop?: string;
  triggerDate: string; // YYYY-MM-DD
  validUntil: string;
  createdAt: number;
  isRead: boolean;
  isActioned: boolean;
  snoozedUntil?: number;
  metadata?: {
    expectedRainfallMm?: number;
    daysRemaining?: number;
    windowStart?: string;
    windowEnd?: string;
    actionSteps?: string[];
    recommendedVarieties?: string[];
    drainageAdvice?: string;
  };
}

export interface NotificationSettings {
  id?: number;
  enabled: boolean;
  soundEnabled: boolean;
  browserPushEnabled: boolean;
  notifyPlantingWindows: boolean;
  notifyHeavyRainfall: boolean;
  notifyPestAlerts: boolean;
  leadTimeDays: number; // e.g. 7 days before planting window
  rainfallThresholdMm: number; // e.g. 40mm
  lastCheckTimestamp: number;
}

export class AgriSmartDatabase extends Dexie {
  diagnoses!: Table<Diagnosis>;
  profiles!: Table<FarmerProfile>;
  records!: Table<FarmRecord>;
  rotations!: Table<CropRotationPlan>;
  soilTests!: Table<SoilTestRecord>;
  alerts!: Table<ScheduledAlert>;
  notificationSettings!: Table<NotificationSettings>;

  constructor() {
    super('AgriSmartDB');
    this.version(7).stores({
      diagnoses: '++id, timestamp, healthStatus, synced',
      profiles: '++id, language, synced, country',
      records: '++id, cropName, status, synced, createdAt',
      rotations: '++id, timestamp, synced',
      soilTests: '++id, timestamp',
      alerts: '++id, alertId, type, severity, triggerDate, isRead, isActioned, region, createdAt',
      notificationSettings: '++id'
    });
    this.version(8).stores({
      diagnoses: '++id, timestamp, healthStatus, synced',
      profiles: '++id, language, synced, country',
      records: '++id, cropName, status, synced, createdAt',
      rotations: '++id, timestamp, synced',
      soilTests: '++id, timestamp',
      alerts: '++id, alertId, type, severity, triggerDate, isRead, isActioned, region, createdAt',
      notificationSettings: '++id'
    });
    this.version(9).stores({
      diagnoses: '++id, timestamp, healthStatus, synced',
      profiles: '++id, accountEmail, language, synced, country',
      records: '++id, cropName, status, synced, createdAt',
      rotations: '++id, timestamp, synced',
      soilTests: '++id, timestamp',
      alerts: '++id, alertId, type, severity, triggerDate, isRead, isActioned, region, createdAt',
      notificationSettings: '++id'
    });
  }
}

export const db = new AgriSmartDatabase();
