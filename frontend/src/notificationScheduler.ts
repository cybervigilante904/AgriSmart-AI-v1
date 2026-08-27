import { db, type ScheduledAlert, type NotificationSettings, type FarmerProfile } from './db';

export interface RegionalPlantingSchedule {
  crop: string;
  category: 'cereal' | 'legume' | 'oilseed' | 'cash_crop' | 'vegetable' | 'winter_crop';
  pfumvudzaPrepWindow: { startMonth: number; startDay: number; endMonth: number; endDay: number }; // 1-indexed
  optimalPlantingWindow: { startMonth: number; startDay: number; endMonth: number; endDay: number };
  latePlantingWindow: { startMonth: number; startDay: number; endMonth: number; endDay: number };
  minRainfallMm: number; // Effective rainfall trigger (e.g. 25-35mm)
  recommendedVarieties: string[];
  fieldPreparationTips: string[];
  riskWarnings: string[];
}

export interface RegionalRainfallPattern {
  regionKey: string;
  naturalRegion?: string;
  annualAverageMm: number;
  rainySeasonStartMonth: number; // e.g. 10 (October)
  rainySeasonEndMonth: number;   // e.g. 4 (April)
  peakRainMonths: number[];      // e.g. [12, 1, 2] (Dec, Jan, Feb)
  heavyRainfallHazardWindows: {
    name: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    typicalRisk: 'flash_floods' | 'cyclonic_deluge' | 'waterlogging' | 'hail_windstorm';
    expectedMmPerDay: number;
    mitigationActions: string[];
  }[];
}

export interface LiveWeatherWarningData {
  location: string;
  temp: number;
  condition: string;
  rainChance: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  isSevere?: boolean;
  isLive?: boolean;
  forecast?: Array<{
    date?: string;
    tempMin?: number;
    rainChance: number;
    precipitation?: number;
    cond: string;
  }>;
}

export interface LiveWeatherWarning {
  type: 'heavy_rainfall' | 'frost' | 'pest_outbreak';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  expectedRainfallMm?: number;
  validUntil: string;
  actionSteps: string[];
}

// Comprehensive Southern and Eastern African Agro-Ecological Data
export const REGIONAL_SCHEDULES: Record<string, RegionalPlantingSchedule[]> = {
  // High rainfall / Highveld (Harare, Mashonaland, Lusaka, Central Malawi)
  'highveld': [
    {
      crop: 'Maize (Long & Medium Season)',
      category: 'cereal',
      pfumvudzaPrepWindow: { startMonth: 8, startDay: 15, endMonth: 10, endDay: 30 },
      optimalPlantingWindow: { startMonth: 10, startDay: 25, endMonth: 12, endDay: 10 },
      latePlantingWindow: { startMonth: 12, startDay: 11, endMonth: 1, endDay: 5 },
      minRainfallMm: 30,
      recommendedVarieties: ['SC 719', 'SC 627', 'SC 608', 'PAN 53', 'Pioneer 30G19', 'ZAP 61'],
      fieldPreparationTips: [
        'Complete Pfumvudza/basins digging and apply 1 matchbox compound D or compost per basin before rains.',
        'Wait for at least 30mm of continuous rain over 2-3 days before planting to ensure subsoil moisture.',
        'Plant 2 seeds per hole at 5cm depth, thin to 1 plant per station after emergence.'
      ],
      riskWarnings: [
        'Do not dry-plant if erratic early showers are forecast without following rains.',
        'Scout for Fall Armyworm in the funnel 10 days after crop emergence.'
      ]
    },
    {
      crop: 'Soybeans',
      category: 'legume',
      pfumvudzaPrepWindow: { startMonth: 9, startDay: 1, endMonth: 11, endDay: 15 },
      optimalPlantingWindow: { startMonth: 11, startDay: 15, endMonth: 12, endDay: 20 },
      latePlantingWindow: { startMonth: 12, startDay: 21, endMonth: 1, endDay: 10 },
      minRainfallMm: 35,
      recommendedVarieties: ['SC Spike', 'SC Safari', 'Bimha', 'Panorama 357', 'Solitaire'],
      fieldPreparationTips: [
        'Inoculate seeds with Rhizobium inoculant in the shade immediately before planting.',
        'Plant at 2-3cm depth in well-drained loamy soils; avoid planting too deep.'
      ],
      riskWarnings: ['Soybeans are sensitive to crusting; avoid soil compaction immediately after heavy downpours.']
    },
    {
      crop: 'Groundnuts (Nzungu/Amazambane)',
      category: 'legume',
      pfumvudzaPrepWindow: { startMonth: 9, startDay: 15, endMonth: 11, endDay: 10 },
      optimalPlantingWindow: { startMonth: 11, startDay: 1, endMonth: 12, endDay: 15 },
      latePlantingWindow: { startMonth: 12, startDay: 16, endMonth: 1, endDay: 5 },
      minRainfallMm: 25,
      recommendedVarieties: ['Nyanda', 'Ilanda', 'Natal Common', 'Valencia', 'Nsinjiro'],
      fieldPreparationTips: [
        'Form ridges or raised beds to facilitate pegging and pod harvesting.',
        'Apply Gypsum at flowering stage (6-8 weeks) to prevent "pops" (empty pods).'
      ],
      riskWarnings: ['Avoid waterlogged fields; susceptible to rosette virus and early leaf spot during heavy rain.']
    },
    {
      crop: 'Sorghum & Pearl Millet',
      category: 'cereal',
      pfumvudzaPrepWindow: { startMonth: 9, startDay: 1, endMonth: 11, endDay: 15 },
      optimalPlantingWindow: { startMonth: 11, startDay: 10, endMonth: 12, endDay: 25 },
      latePlantingWindow: { startMonth: 12, startDay: 26, endMonth: 1, endDay: 20 },
      minRainfallMm: 20,
      recommendedVarieties: ['Macia', 'SV-2', 'SV-4', 'Kavale', 'PMV-3'],
      fieldPreparationTips: [
        'Excellent drought buffer crop; requires fine seedbed for small seeds.',
        'Plant at shallow 2cm depth with moisture conservation mulch.'
      ],
      riskWarnings: ['Protect seedlings from birds during grain filling stage.']
    },
    {
      crop: 'Sugar Beans & Cowpeas (Nyemba)',
      category: 'legume',
      pfumvudzaPrepWindow: { startMonth: 11, startDay: 1, endMonth: 12, endDay: 15 },
      optimalPlantingWindow: { startMonth: 12, startDay: 20, endMonth: 1, endDay: 31 },
      latePlantingWindow: { startMonth: 2, startDay: 1, endMonth: 2, endDay: 20 },
      minRainfallMm: 20,
      recommendedVarieties: ['Gloria', 'NUA 45 (Biofortified Iron)', 'Sweet Valentine', 'CBC 1', 'CBC 2'],
      fieldPreparationTips: [
        'Ideal as second planting rotation after early maize or in Pfumvudza plots.',
        'Plant when mid-season heat moderates and soil maintains residual moisture.'
      ],
      riskWarnings: ['Heavy rainfall during pod maturity causes pod rot and seed discoloration.']
    },
    {
      crop: 'Winter Wheat (Irrigated)',
      category: 'winter_crop',
      pfumvudzaPrepWindow: { startMonth: 3, startDay: 15, endMonth: 4, endDay: 25 },
      optimalPlantingWindow: { startMonth: 4, startDay: 25, endMonth: 5, endDay: 30 },
      latePlantingWindow: { startMonth: 6, startDay: 1, endMonth: 6, endDay: 15 },
      minRainfallMm: 0, // Irrigated
      recommendedVarieties: ['SC Nduna', 'SCBN 01', 'Kana', 'Insiza', 'Kambwa'],
      fieldPreparationTips: [
        'Complete sowing before May 31 to avoid high temperature stress during flowering and grain fill in August/September.',
        'Ensure full irrigation profile capacity at planting.'
      ],
      riskWarnings: ['Planting after June 15 drastically reduces yields due to early spring heat.']
    }
  ],

  // Medium / Semi-Arid / Lowveld (Masvingo, Midlands, Matabeleland, Beitbridge, Chiredzi, Shire Valley)
  'lowveld': [
    {
      crop: 'Early Maize (Ultra-Short Season)',
      category: 'cereal',
      pfumvudzaPrepWindow: { startMonth: 8, startDay: 1, endMonth: 10, endDay: 20 },
      optimalPlantingWindow: { startMonth: 11, startDay: 1, endMonth: 12, endDay: 15 },
      latePlantingWindow: { startMonth: 12, startDay: 16, endMonth: 1, endDay: 5 },
      minRainfallMm: 25,
      recommendedVarieties: ['SC 303', 'SC 403', 'SC 419', 'PAN 413', 'Tsoko'],
      fieldPreparationTips: [
        'Strict Pfumvudza basin water harvesting is mandatory for yield security.',
        'Cover soil with grass/crop stover mulch to prevent intense evaporation.'
      ],
      riskWarnings: ['Avoid long season (SC 600/700) varieties due to high risk of mid-season dry spells.']
    },
    {
      crop: 'Sorghum & Pearl Millet (Mahangu)',
      category: 'cereal',
      pfumvudzaPrepWindow: { startMonth: 8, startDay: 15, endMonth: 10, endDay: 30 },
      optimalPlantingWindow: { startMonth: 11, startDay: 1, endMonth: 12, endDay: 20 },
      latePlantingWindow: { startMonth: 12, startDay: 21, endMonth: 1, endDay: 15 },
      minRainfallMm: 20,
      recommendedVarieties: ['Macia', 'SV-2', 'SV-4', 'PMV-3 (Nyankhombo)', 'Okashana 1'],
      fieldPreparationTips: [
        'Primary recommended cereal for Natural Regions IV and V.',
        'Dig deep tie-ridges to capture and hold every drop of rainfall.'
      ],
      riskWarnings: ['Plant immediately upon first effective rain event.']
    },
    {
      crop: 'Cowpeas & Groundnuts (Drought Hardy)',
      category: 'legume',
      pfumvudzaPrepWindow: { startMonth: 9, startDay: 1, endMonth: 11, endDay: 1 },
      optimalPlantingWindow: { startMonth: 11, startDay: 10, endMonth: 12, endDay: 30 },
      latePlantingWindow: { startMonth: 1, startDay: 1, endMonth: 1, endDay: 20 },
      minRainfallMm: 20,
      recommendedVarieties: ['CBC 1', 'CBC 2', 'Nyanda', 'Ilanda', 'Bube'],
      fieldPreparationTips: [
        'Intercrop with sorghum or pearl millet for climate resilience.',
        'Fixes valuable nitrogen into sandy, depleted soils.'
      ],
      riskWarnings: ['Aphid scouting required during hot dry spells.']
    },
    {
      crop: 'Sunflower & Sesame (Simsim)',
      category: 'oilseed',
      pfumvudzaPrepWindow: { startMonth: 10, startDay: 1, endMonth: 12, endDay: 1 },
      optimalPlantingWindow: { startMonth: 12, startDay: 1, endMonth: 1, endDay: 20 },
      latePlantingWindow: { startMonth: 1, startDay: 21, endMonth: 2, endDay: 10 },
      minRainfallMm: 20,
      recommendedVarieties: ['PAN 7057', 'PAN 7033', 'Super 500', 'Kilima'],
      fieldPreparationTips: [
        'Taproot penetrates deep into subsoil moisture layers.',
        'Excellent option for late planting when early season rains were delayed.'
      ],
      riskWarnings: ['Ensure good pollination by keeping bee-friendly habitats near the field.']
    }
  ]
};

export const REGIONAL_RAINFALL_PATTERNS: Record<string, RegionalRainfallPattern> = {
  'highveld': {
    regionKey: 'highveld',
    naturalRegion: 'Natural Region II / III',
    annualAverageMm: 850,
    rainySeasonStartMonth: 11,
    rainySeasonEndMonth: 4,
    peakRainMonths: [12, 1, 2],
    heavyRainfallHazardWindows: [
      {
        name: 'Early Season Torrential Thunderstorms',
        startMonth: 11,
        startDay: 10,
        endMonth: 12,
        endDay: 15,
        typicalRisk: 'flash_floods',
        expectedMmPerDay: 45,
        mitigationActions: [
          'Dig contour diversion drains along upper slopes to prevent gully erosion.',
          'Ensure drainage channels around seedling nurseries are clear of debris.',
          'Delay top-dressing fertilizer (AN/Urea) until heavy downpour passes to avoid leaching.'
        ]
      },
      {
        name: 'Peak ITCZ Convergence & Heavy Deluges',
        startMonth: 12,
        startDay: 20,
        endMonth: 2,
        endDay: 20,
        typicalRisk: 'cyclonic_deluge',
        expectedMmPerDay: 65,
        mitigationActions: [
          'High waterlogging risk in clay/vlei soils; open furrows between maize rows.',
          'Inspect crops for fungal leaf diseases (Blight/Rust) caused by prolonged dampness.',
          'Move farm livestock to elevated dry kraals to prevent foot rot.'
        ]
      }
    ]
  },
  'lowveld': {
    regionKey: 'lowveld',
    naturalRegion: 'Natural Region IV / V',
    annualAverageMm: 450,
    rainySeasonStartMonth: 11,
    rainySeasonEndMonth: 3,
    peakRainMonths: [12, 1],
    heavyRainfallHazardWindows: [
      {
        name: 'Flash Riverine & Basin Flooding',
        startMonth: 12,
        startDay: 15,
        endMonth: 2,
        endDay: 15,
        typicalRisk: 'flash_floods',
        expectedMmPerDay: 55,
        mitigationActions: [
          'Reinforce dead-level contour ridges and Pfumvudza basin overflows.',
          'Never leave farm equipment or cattle near seasonal riverbeds or dambos.',
          'Harvest storm water into farm ponds or swales for subsequent dry spells.'
        ]
      },
      {
        name: 'Tropical Low / Cyclone Influx (Limpopo & Save Basins)',
        startMonth: 1,
        startDay: 15,
        endMonth: 2,
        endDay: 28,
        typicalRisk: 'cyclonic_deluge',
        expectedMmPerDay: 75,
        mitigationActions: [
          'High risk of intense downpours and strong destructive winds.',
          'Tie down greenhouse/nursery plastic sheets and secure crop storage barns.',
          'Ensure emergency drainage furrows are open in low-lying river basin fields.'
        ]
      }
    ]
  }
};

/**
 * Determine regional category ('highveld' or 'lowveld') based on profile location string
 */
export function getRegionCategory(region: string = '', country: string = ''): 'highveld' | 'lowveld' {
  const text = `${region} ${country}`.toLowerCase();
  const lowveldKeywords = [
    'chiredzi', 'mwenezi', 'beitbridge', 'gwanda', 'matabeleland south', 'chipinga', 'save', 
    'binga', 'kariba', 'hwange', 'gokwe south', 'shurugwi', 'gutwa', 'lowveld', 'region 4', 'region 5', 
    'region iv', 'region v', 'limpopo', 'gaza', 'tete', 'shire valley', 'chikwawa', 'nsanje', 'upington'
  ];

  for (const kw of lowveldKeywords) {
    if (text.includes(kw)) return 'lowveld';
  }
  return 'highveld';
}

/** Fetch the current and short-range forecast used by real notifications. */
export async function fetchLiveWeatherForNotifications(
  profile: FarmerProfile | null
): Promise<LiveWeatherWarningData | null> {
  const location = `${profile?.region || 'Harare'}, ${profile?.country || 'Zimbabwe'}`;

  try {
    const response = await fetch(`/api/weather/${encodeURIComponent(location)}`);
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const weather = await response.json() as LiveWeatherWarningData;
    return weather.isLive ? weather : null;
  } catch (error) {
    console.warn('Live weather warnings unavailable:', error);
    return null;
  }
}

/** Convert live forecast conditions into actionable agricultural warnings. */
export function evaluateLiveWeatherWarnings(
  weather: LiveWeatherWarningData | null,
  rainfallThresholdMm: number = 45
): LiveWeatherWarning[] {
  if (!weather?.isLive) return [];

  const today = new Date();
  const forecast = weather.forecast || [];
  const forecastRainfall = forecast.map(item => Number(item.precipitation || 0));
  const peakRainfall = Math.max(weather.precipitation || 0, ...forecastRainfall);
  const peakRainChance = Math.max(weather.rainChance || 0, ...forecast.map(item => item.rainChance || 0));
  const forecastEnd = forecast.find(item => item.date)?.date || new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0];
  const warnings: LiveWeatherWarning[] = [];

  if (
    peakRainfall >= rainfallThresholdMm ||
    (peakRainChance >= 70 && peakRainfall >= Math.max(15, rainfallThresholdMm * 0.5)) ||
    weather.isSevere && (weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('storm'))
  ) {
    warnings.push({
      type: 'heavy_rainfall',
      severity: peakRainfall >= rainfallThresholdMm * 1.5 || weather.isSevere ? 'critical' : 'warning',
      title: `Live Heavy Rain Warning for ${weather.location}`,
      message: `Open-Meteo forecasts up to ${Math.round(peakRainfall)}mm of rain with a ${peakRainChance}% peak rain probability. Flooding, erosion, nutrient leaching, and crop disease risk are elevated.`,
      expectedRainfallMm: Math.round(peakRainfall),
      validUntil: forecastEnd,
      actionSteps: [
        'Clear drainage channels and inspect contour ridges before the rain arrives.',
        'Delay fertilizer and pesticide application until foliage and soil surfaces dry.',
        'Move livestock, equipment, and harvested produce to elevated dry storage.'
      ]
    });
  }

  if (weather.windSpeed >= 35) {
    warnings.push({
      type: 'heavy_rainfall',
      severity: 'critical',
      title: `Severe Wind Warning for ${weather.location}`,
      message: `Live wind speeds are ${weather.windSpeed} km/h. Crop lodging, branch breakage, and damage to nursery covers are possible.`,
      validUntil: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      actionSteps: [
        'Secure shade nets, greenhouse plastic, irrigation pipes, and loose roofing.',
        'Avoid spraying chemicals while wind speeds remain high.',
        'Check young plants and stake vulnerable crops after the event.'
      ]
    });
  }

  const forecastMinimum = Math.min(weather.temp, ...forecast.map(item => item.tempMin ?? weather.temp));
  if (forecastMinimum <= 3) {
    warnings.push({
      type: 'frost',
      severity: 'critical',
      title: `Frost Risk for ${weather.location}`,
      message: `Live forecasts show temperatures as low as ${Math.round(forecastMinimum)}°C. Protect sensitive seedlings, vegetables, and frost-sensitive fruit.`,
      validUntil: forecastEnd,
      actionSteps: [
        'Cover sensitive seedlings before sunset with row cover, cloth, or dry grass.',
        'Water the soil lightly before the coldest night if irrigation is available.',
        'Do not prune frost-damaged tissue until new growth appears.'
      ]
    });
  }

  if (weather.humidity >= 85 && peakRainChance >= 60) {
    warnings.push({
      type: 'pest_outbreak',
      severity: 'warning',
      title: `High Fungal Disease Pressure for ${weather.location}`,
      message: `Live humidity is ${weather.humidity}% with a ${peakRainChance}% rain probability. Blight, rust, and leaf-spot pressure is elevated.`,
      validUntil: forecastEnd,
      actionSteps: [
        'Scout lower leaves and remove diseased tissue from the field.',
        'Improve airflow by maintaining crop spacing and avoiding overhead irrigation.',
        'Use only locally registered fungicides when disease symptoms are confirmed.'
      ]
    });
  }

  return warnings;
}

/**
 * Helper to calculate days between two dates in the current agricultural year
 */
function getDaysDifference(targetDate: Date, fromDate: Date): number {
  const diffTime = targetDate.getTime() - fromDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Evaluate Upcoming Planting Windows based on the current date
 */
export function evaluatePlantingWindows(
  currentDate: Date,
  profile: FarmerProfile | null,
  leadTimeDays: number = 21
): {
  activePlantingCrops: RegionalPlantingSchedule[];
  upcomingPlantingCrops: { schedule: RegionalPlantingSchedule; daysUntilStart: number; startDate: Date }[];
  currentSeasonPhase: string;
} {
  const regionType = getRegionCategory(profile?.region, profile?.country);
  const schedules = REGIONAL_SCHEDULES[regionType] || REGIONAL_SCHEDULES['highveld'];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();

  const activePlantingCrops: RegionalPlantingSchedule[] = [];
  const upcomingPlantingCrops: { schedule: RegionalPlantingSchedule; daysUntilStart: number; startDate: Date }[] = [];

  for (const item of schedules) {
    const win = item.optimalPlantingWindow;

    // Construct start and end dates relative to the agricultural year
    let startYear = currentYear;
    let endYear = currentYear;

    if (win.startMonth < 6 && currentMonth >= 6) {
      // e.g. Winter crop in next calendar year
      startYear = currentYear + 1;
      endYear = currentYear + 1;
    } else if (win.endMonth < win.startMonth) {
      // Window crosses New Year (e.g. Nov to Jan)
      if (currentMonth >= win.startMonth) {
        endYear = currentYear + 1;
      } else {
        startYear = currentYear - 1;
      }
    }

    const startDate = new Date(startYear, win.startMonth - 1, win.startDay);
    const endDate = new Date(endYear, win.endMonth - 1, win.endDay, 23, 59, 59);

    if (currentDate >= startDate && currentDate <= endDate) {
      activePlantingCrops.push(item);
    } else if (currentDate < startDate) {
      const daysUntil = getDaysDifference(startDate, currentDate);
      if (daysUntil <= leadTimeDays && daysUntil > 0) {
        upcomingPlantingCrops.push({
          schedule: item,
          daysUntilStart: daysUntil,
          startDate
        });
      }
    }
  }

  // Determine current agro-climatic seasonal phase
  let currentSeasonPhase = 'Main Summer Cropping Season';
  if (currentMonth >= 8 && currentMonth <= 10) {
    currentSeasonPhase = 'Pfumvudza / Land Preparation & Dry Planting Phase';
  } else if (currentMonth === 11 || currentMonth === 12) {
    currentSeasonPhase = 'Main Summer Planting & Germination Peak';
  } else if (currentMonth === 1 || currentMonth === 2) {
    currentSeasonPhase = 'Vegetative Growth, Top Dressing & Late Planting Phase';
  } else if (currentMonth === 3 || currentMonth === 4) {
    currentSeasonPhase = 'Crop Maturity & Harvesting / Winter Wheat Prep';
  } else if (currentMonth >= 5 && currentMonth <= 7) {
    currentSeasonPhase = 'Winter Irrigated Crops & Post-Harvest Storage Phase';
  }

  return { activePlantingCrops, upcomingPlantingCrops, currentSeasonPhase };
}

/**
 * Evaluate Heavy Rainfall & Flash Flood Warnings based on current date & regional hazard patterns
 */
export function evaluateHeavyRainfallWarnings(
  currentDate: Date,
  profile: FarmerProfile | null
): {
  activeHazards: {
    hazard: RegionalRainfallPattern['heavyRainfallHazardWindows'][0];
    pattern: RegionalRainfallPattern;
    daysRemainingInHazard: number;
  }[];
  peakRainSeason: boolean;
} {
  const regionType = getRegionCategory(profile?.region, profile?.country);
  const pattern = REGIONAL_RAINFALL_PATTERNS[regionType] || REGIONAL_RAINFALL_PATTERNS['highveld'];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();

  const activeHazards: {
    hazard: RegionalRainfallPattern['heavyRainfallHazardWindows'][0];
    pattern: RegionalRainfallPattern;
    daysRemainingInHazard: number;
  }[] = [];

  for (const hazard of pattern.heavyRainfallHazardWindows) {
    let startYear = currentYear;
    let endYear = currentYear;

    if (hazard.endMonth < hazard.startMonth) {
      if (currentMonth >= hazard.startMonth) {
        endYear = currentYear + 1;
      } else {
        startYear = currentYear - 1;
      }
    }

    const startDate = new Date(startYear, hazard.startMonth - 1, hazard.startDay);
    const endDate = new Date(endYear, hazard.endMonth - 1, hazard.endDay, 23, 59, 59);

    if (currentDate >= startDate && currentDate <= endDate) {
      const daysRemaining = getDaysDifference(endDate, currentDate);
      activeHazards.push({
        hazard,
        pattern,
        daysRemainingInHazard: Math.max(1, daysRemaining)
      });
    }
  }

  const peakRainSeason = pattern.peakRainMonths.includes(currentMonth);

  return { activeHazards, peakRainSeason };
}

/**
 * Synthesize a clean, gentle agricultural alert chime using Web Audio API
 */
export function playNotificationTone(type: 'planting' | 'rainfall' | 'critical' = 'planting') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'rainfall' || type === 'critical') {
      // 2-tone urgent warm chime
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Gentle 3-tone chime for planting
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.start(now);
      osc.stop(now + 0.7);
    }
  } catch (err) {
    console.warn("Audio chime context failed or blocked by autoplay policy:", err);
  }
}

/**
 * Trigger Native Browser Push Notification
 */
export async function sendBrowserNotification(title: string, body: string, iconUrl?: string) {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: iconUrl || '/icon.png',
        badge: '/icon.png',
        tag: 'agrismart-alert-' + Date.now()
      });
      return true;
    } catch (e) {
      console.warn("Browser notification creation failed:", e);
      return false;
    }
  }
  return false;
}

/**
 * Local Notification Scheduler Engine:
 * Generates and synchronizes smart scheduled alerts in Dexie based on current date, regional profile, and settings
 */
export async function runLocalNotificationScheduler(profile: FarmerProfile | null): Promise<ScheduledAlert[]> {
  try {
    // 1. Get or create notification settings
    let settings = await db.notificationSettings.toCollection().first();
    if (!settings) {
      settings = {
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
      await db.notificationSettings.add(settings);
    }

    // Remove alerts created by the old test controls so they cannot be mistaken for live warnings.
    await db.alerts.toCollection().filter(alert => alert.alertId.startsWith('test-') || /test|simulated/i.test(alert.title)).delete();

    if (!settings.enabled) {
      return await db.alerts.toArray();
    }

    // Always evaluate against the real current date.
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split('T')[0];
    const regionName = profile?.region || 'National';
    const countryName = profile?.country || 'Zimbabwe';

    // 2. Evaluate Planting Windows
    const { activePlantingCrops, upcomingPlantingCrops } = evaluatePlantingWindows(
      currentDate,
      profile,
      settings.leadTimeDays
    );

    // 3. Evaluate live weather warnings from the backend's Open-Meteo feed.
    const liveWeather = await fetchLiveWeatherForNotifications(profile);
    const liveWarnings = evaluateLiveWeatherWarnings(liveWeather, settings.rainfallThresholdMm);

    const generatedAlerts: ScheduledAlert[] = [];

    // Process Active Planting Windows
    if (settings.notifyPlantingWindows) {
      for (const crop of activePlantingCrops) {
        const alertId = `active-planting-${crop.crop.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${todayStr.slice(0, 7)}`;
        
        const existing = await db.alerts.where('alertId').equals(alertId).first();
        if (!existing) {
          const alert: ScheduledAlert = {
            alertId,
            type: 'planting_window',
            severity: 'info',
            title: `Optimal Planting Window Open: ${crop.crop}`,
            message: `Current soil moisture and seasonal weather in ${regionName} are ideal for sowing ${crop.crop}. Recommended varieties: ${crop.recommendedVarieties.slice(0, 3).join(', ')}.`,
            region: regionName,
            country: countryName,
            targetCrop: crop.crop,
            triggerDate: todayStr,
            validUntil: `${currentDate.getFullYear()}-${String(crop.optimalPlantingWindow.endMonth).padStart(2, '0')}-${String(crop.optimalPlantingWindow.endDay).padStart(2, '0')}`,
            createdAt: Date.now(),
            isRead: false,
            isActioned: false,
            metadata: {
              recommendedVarieties: crop.recommendedVarieties,
              actionSteps: crop.fieldPreparationTips,
              windowStart: `${crop.optimalPlantingWindow.startMonth}/${crop.optimalPlantingWindow.startDay}`,
              windowEnd: `${crop.optimalPlantingWindow.endMonth}/${crop.optimalPlantingWindow.endDay}`
            }
          };

          await db.alerts.add(alert);
          generatedAlerts.push(alert);

          if (settings.browserPushEnabled) {
            sendBrowserNotification(alert.title, alert.message);
          }
          if (settings.soundEnabled) {
            playNotificationTone('planting');
          }
        }
      }

      // Process Upcoming Planting Windows (Countdown Warning)
      for (const upcoming of upcomingPlantingCrops) {
        const alertId = `upcoming-planting-${upcoming.schedule.crop.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${todayStr.slice(0, 7)}`;
        
        const existing = await db.alerts.where('alertId').equals(alertId).first();
        if (!existing) {
          const alert: ScheduledAlert = {
            alertId,
            type: 'planting_window',
            severity: upcoming.daysUntilStart <= 7 ? 'warning' : 'info',
            title: `Upcoming Sowing in ${upcoming.daysUntilStart} Days: ${upcoming.schedule.crop}`,
            message: `Prepare your field basins and procure certified seed for ${upcoming.schedule.crop}. Expected planting window begins on ${upcoming.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} in ${regionName}.`,
            region: regionName,
            country: countryName,
            targetCrop: upcoming.schedule.crop,
            triggerDate: todayStr,
            validUntil: upcoming.startDate.toISOString().split('T')[0],
            createdAt: Date.now(),
            isRead: false,
            isActioned: false,
            metadata: {
              daysRemaining: upcoming.daysUntilStart,
              recommendedVarieties: upcoming.schedule.recommendedVarieties,
              actionSteps: upcoming.schedule.fieldPreparationTips
            }
          };

          await db.alerts.add(alert);
          generatedAlerts.push(alert);
        }
      }
    }

    // Process warnings from current conditions and the short-range forecast.
    for (const warning of liveWarnings) {
      const enabled = warning.type === 'pest_outbreak' ? settings.notifyPestAlerts : settings.notifyHeavyRainfall;
      if (!enabled) continue;

      const alertId = `live-weather-${warning.type}-${warning.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 60)}-${todayStr}`;
        
      const existing = await db.alerts.where('alertId').equals(alertId).first();
      if (!existing) {
        const alert: ScheduledAlert = {
            alertId,
            type: warning.type,
            severity: warning.severity,
            title: warning.title,
            message: warning.message,
            region: regionName,
            country: countryName,
            triggerDate: todayStr,
            validUntil: warning.validUntil,
            createdAt: Date.now(),
            isRead: false,
            isActioned: false,
            metadata: {
              expectedRainfallMm: warning.expectedRainfallMm,
              actionSteps: warning.actionSteps,
              drainageAdvice: warning.actionSteps[0]
            }
        };

        await db.alerts.add(alert);
        generatedAlerts.push(alert);

        if (settings.browserPushEnabled) {
          sendBrowserNotification(alert.title, alert.message);
        }
        if (settings.soundEnabled) {
          playNotificationTone('rainfall');
        }
      }
    }

    // Update last check timestamp
    await db.notificationSettings.where('id').equals(settings.id!).modify({ lastCheckTimestamp: Date.now() });

    // Return all alerts (excluding expired snoozes)
    let allAlerts: ScheduledAlert[] = [];
    try {
      allAlerts = await db.alerts.orderBy('createdAt').reverse().toArray();
    } catch {
      allAlerts = (await db.alerts.toArray()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return allAlerts;
  } catch (err) {
    console.error("Local notification scheduler error:", err);
    try {
      return (await db.alerts.toArray()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
      return [];
    }
  }
}
