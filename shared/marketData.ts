export interface MarketCropHistory {
  month: string;
  price: number;
  low: number;
  high: number;
  volume: number;
  regional: number;
}

export interface MarketCropForecast {
  month: string;
  price: number;
  confidence: number;
}

export interface MarketCommodity {
  crop: string;
  category: 'Grains & Cereals' | 'Horticulture & Vegetables' | 'Legumes & Oilseeds' | 'Cash Crops' | 'Tubers & Roots';
  price: string;
  rawPrice: number;
  unit: string;
  currency: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: string;
  volatility: 'Low' | 'Medium' | 'High';
  volume: 'Low' | 'Moderate' | 'High' | 'Very High';
  supplyStatus: 'Shortage / High Demand' | 'Balanced Supply' | 'Peak Harvest Surplus';
  regionalAvg: string;
  wholesaleMarket: string;
  district: string;
  country: string;
  advice: string;
  bestTimeToSell: string;
  history: MarketCropHistory[];
  forecast: MarketCropForecast[];
}

export interface RegionalMarketHub {
  id: string;
  name: string;
  district: string;
  country: string;
  currency: string;
  currencySymbol: string;
  description: string;
  tradingDays: string;
  commodities: MarketCommodity[];
}

export const REGIONAL_MARKET_HUBS: Record<string, RegionalMarketHub> = {
  // Harare, Zimbabwe
  "harare": {
    id: "harare_mbare",
    name: "Mbare Musika Wholesale Market",
    district: "Harare",
    country: "Zimbabwe",
    currency: "USD",
    currencySymbol: "$",
    description: "Zimbabwe's largest national agricultural aggregation and wholesale hub",
    tradingDays: "Daily (04:00 AM - 06:00 PM)",
    commodities: [
      {
        crop: "White Maize",
        category: "Grains & Cereals",
        price: "$340/ton",
        rawPrice: 340,
        unit: "ton",
        currency: "USD",
        trend: "up",
        changePercent: "+5.2%",
        volatility: "Medium",
        volume: "High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$325/ton",
        wholesaleMarket: "Mbare Musika & GMB Depots",
        district: "Harare",
        country: "Zimbabwe",
        advice: "Regional grain deficits pushing open market bids above baseline. Hold dry grain in hermetic bags for peak selling window.",
        bestTimeToSell: "August – October (Pre-rain deficit period)",
        history: [
          { month: 'Mar', price: 310, low: 300, high: 320, volume: 2200, regional: 305 },
          { month: 'Apr', price: 320, low: 310, high: 330, volume: 2800, regional: 315 },
          { month: 'May', price: 328, low: 318, high: 338, volume: 3100, regional: 320 },
          { month: 'Jun', price: 335, low: 325, high: 345, volume: 2600, regional: 325 },
          { month: 'Jul', price: 338, low: 330, high: 350, volume: 2100, regional: 328 },
          { month: 'Aug', price: 340, low: 332, high: 355, volume: 1900, regional: 325 }
        ],
        forecast: [
          { month: 'Sep', price: 355, confidence: 0.88 },
          { month: 'Oct', price: 370, confidence: 0.82 }
        ]
      },
      {
        crop: "Tomatoes (Rodade)",
        category: "Horticulture & Vegetables",
        price: "$14/wooden crate",
        rawPrice: 14,
        unit: "wooden crate (20kg)",
        currency: "USD",
        trend: "down",
        changePercent: "-12.5%",
        volatility: "High",
        volume: "Very High",
        supplyStatus: "Peak Harvest Surplus",
        regionalAvg: "$16/crate",
        wholesaleMarket: "Mbare Musika Green Sheds",
        district: "Harare",
        country: "Zimbabwe",
        advice: "Heavy arrivals from Mutoko and Goromonzi irrigation schemes. Price under pressure. Grade carefully and sell early morning (04:00 - 07:00 AM).",
        bestTimeToSell: "Early Morning auction or stagger harvest across 4 weeks",
        history: [
          { month: 'Mar', price: 22, low: 18, high: 26, volume: 4200, regional: 20 },
          { month: 'Apr', price: 19, low: 16, high: 23, volume: 5100, regional: 18 },
          { month: 'May', price: 17, low: 14, high: 20, volume: 5900, regional: 17 },
          { month: 'Jun', price: 16, low: 13, high: 19, volume: 6400, regional: 16 },
          { month: 'Jul', price: 15, low: 12, high: 18, volume: 7200, regional: 16 },
          { month: 'Aug', price: 14, low: 10, high: 17, volume: 8100, regional: 16 }
        ],
        forecast: [
          { month: 'Sep', price: 16, confidence: 0.85 },
          { month: 'Oct', price: 21, confidence: 0.76 }
        ]
      },
      {
        crop: "Sugar Beans (Red Speckled)",
        category: "Legumes & Oilseeds",
        price: "$1,250/ton",
        rawPrice: 1250,
        unit: "ton ($25/20L bucket)",
        currency: "USD",
        trend: "up",
        changePercent: "+8.7%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$1,180/ton",
        wholesaleMarket: "Mbare Musika Produce Floor",
        district: "Harare",
        country: "Zimbabwe",
        advice: "High consumer demand for household protein. Supermarket contractors and boarding schools buying aggressively.",
        bestTimeToSell: "September – November before summer planting rains",
        history: [
          { month: 'Mar', price: 1100, low: 1050, high: 1150, volume: 600, regional: 1080 },
          { month: 'Apr', price: 1140, low: 1100, high: 1180, volume: 650, regional: 1110 },
          { month: 'May', price: 1180, low: 1130, high: 1210, volume: 720, regional: 1140 },
          { month: 'Jun', price: 1210, low: 1170, high: 1250, volume: 680, regional: 1160 },
          { month: 'Jul', price: 1235, low: 1190, high: 1270, volume: 620, regional: 1170 },
          { month: 'Aug', price: 1250, low: 1210, high: 1290, volume: 590, regional: 1180 }
        ],
        forecast: [
          { month: 'Sep', price: 1290, confidence: 0.92 },
          { month: 'Oct', price: 1340, confidence: 0.86 }
        ]
      },
      {
        crop: "Potatoes (Large Pocket)",
        category: "Tubers & Roots",
        price: "$8.50/10kg pocket",
        rawPrice: 8.5,
        unit: "10kg pocket",
        currency: "USD",
        trend: "stable",
        changePercent: "+1.2%",
        volatility: "Medium",
        volume: "High",
        supplyStatus: "Balanced Supply",
        regionalAvg: "$8.20/pocket",
        wholesaleMarket: "Mbare & Local Cold Rooms",
        district: "Harare",
        country: "Zimbabwe",
        advice: "Steady flow from Norton and Beatrice farms. Class 1 clean washed tubers command a $1.00 premium.",
        bestTimeToSell: "Mid-month salary cycles",
        history: [
          { month: 'Mar', price: 7.8, low: 7.0, high: 8.5, volume: 3800, regional: 7.5 },
          { month: 'Apr', price: 8.0, low: 7.2, high: 8.8, volume: 4100, regional: 7.8 },
          { month: 'May', price: 8.2, low: 7.5, high: 9.0, volume: 4300, regional: 8.0 },
          { month: 'Jun', price: 8.4, low: 7.8, high: 9.2, volume: 4200, regional: 8.1 },
          { month: 'Jul', price: 8.5, low: 7.9, high: 9.3, volume: 4000, regional: 8.2 },
          { month: 'Aug', price: 8.5, low: 7.8, high: 9.2, volume: 4100, regional: 8.2 }
        ],
        forecast: [
          { month: 'Sep', price: 9.0, confidence: 0.89 },
          { month: 'Oct', price: 9.5, confidence: 0.81 }
        ]
      },
      {
        crop: "Soybeans (Industrial)",
        category: "Legumes & Oilseeds",
        price: "$510/ton",
        rawPrice: 510,
        unit: "ton",
        currency: "USD",
        trend: "stable",
        changePercent: "+0.5%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Balanced Supply",
        regionalAvg: "$495/ton",
        wholesaleMarket: "Oil Expressers / Feed Mills",
        district: "Harare",
        country: "Zimbabwe",
        advice: "Cooking oil manufacturers actively accepting bulk deliveries. Ensure moisture is strictly under 11.5%.",
        bestTimeToSell: "Immediate delivery to feed processors",
        history: [
          { month: 'Mar', price: 490, low: 480, high: 500, volume: 900, regional: 480 },
          { month: 'Apr', price: 498, low: 488, high: 508, volume: 1100, regional: 485 },
          { month: 'May', price: 505, low: 495, high: 515, volume: 1250, regional: 490 },
          { month: 'Jun', price: 508, low: 498, high: 518, volume: 1100, regional: 492 },
          { month: 'Jul', price: 510, low: 500, high: 520, volume: 980, regional: 495 },
          { month: 'Aug', price: 510, low: 502, high: 522, volume: 950, regional: 495 }
        ],
        forecast: [
          { month: 'Sep', price: 520, confidence: 0.94 },
          { month: 'Oct', price: 530, confidence: 0.89 }
        ]
      },
      {
        crop: "Cabbage (Giant Head)",
        category: "Horticulture & Vegetables",
        price: "$0.65/head",
        rawPrice: 0.65,
        unit: "head ($65/100 heads)",
        currency: "USD",
        trend: "up",
        changePercent: "+14.0%",
        volatility: "Medium",
        volume: "High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$0.55/head",
        wholesaleMarket: "Mbare Musika",
        district: "Harare",
        country: "Zimbabwe",
        advice: "Winter frost damage in low-lying farms reduced head sizes. Premium solid green heads commanding swift cash sales.",
        bestTimeToSell: "Current 2-week window before spring plantings mature",
        history: [
          { month: 'Mar', price: 0.45, low: 0.35, high: 0.55, volume: 15000, regional: 0.40 },
          { month: 'Apr', price: 0.50, low: 0.40, high: 0.60, volume: 16200, regional: 0.45 },
          { month: 'May', price: 0.52, low: 0.42, high: 0.62, volume: 17000, regional: 0.48 },
          { month: 'Jun', price: 0.55, low: 0.45, high: 0.65, volume: 15500, regional: 0.50 },
          { month: 'Jul', price: 0.60, low: 0.50, high: 0.70, volume: 14000, regional: 0.52 },
          { month: 'Aug', price: 0.65, low: 0.55, high: 0.75, volume: 12500, regional: 0.55 }
        ],
        forecast: [
          { month: 'Sep', price: 0.70, confidence: 0.86 },
          { month: 'Oct', price: 0.55, confidence: 0.78 }
        ]
      }
    ]
  },

  // Bulawayo / Matabeleland, Zimbabwe
  "bulawayo": {
    id: "bulawayo_renkini",
    name: "Renkini & Malalume Produce Market",
    district: "Bulawayo",
    country: "Zimbabwe",
    currency: "USD",
    currencySymbol: "$",
    description: "Main wholesale fresh produce and small-grain terminal for Matabeleland region",
    tradingDays: "Daily (05:00 AM - 05:30 PM)",
    commodities: [
      {
        crop: "Red Sorghum",
        category: "Grains & Cereals",
        price: "$365/ton",
        rawPrice: 365,
        unit: "ton ($18/bucket)",
        currency: "USD",
        trend: "up",
        changePercent: "+7.3%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$345/ton",
        wholesaleMarket: "Renkini Market & Breweries",
        district: "Bulawayo",
        country: "Zimbabwe",
        advice: "Brewing companies and poultry feed mills buying dry red sorghum with premium bonuses for clean, non-moldy grain.",
        bestTimeToSell: "August – November",
        history: [
          { month: 'Mar', price: 320, low: 310, high: 330, volume: 800, regional: 310 },
          { month: 'Apr', price: 335, low: 325, high: 345, volume: 950, regional: 320 },
          { month: 'May', price: 345, low: 335, high: 355, volume: 1050, regional: 330 },
          { month: 'Jun', price: 355, low: 345, high: 365, volume: 980, regional: 338 },
          { month: 'Jul', price: 360, low: 350, high: 370, volume: 850, regional: 342 },
          { month: 'Aug', price: 365, low: 355, high: 378, volume: 780, regional: 345 }
        ],
        forecast: [
          { month: 'Sep', price: 380, confidence: 0.90 },
          { month: 'Oct', price: 395, confidence: 0.83 }
        ]
      },
      {
        crop: "White Maize",
        category: "Grains & Cereals",
        price: "$355/ton",
        rawPrice: 355,
        unit: "ton",
        currency: "USD",
        trend: "up",
        changePercent: "+4.1%",
        volatility: "Medium",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$340/ton",
        wholesaleMarket: "Bulawayo Silos & Renkini",
        district: "Bulawayo",
        country: "Zimbabwe",
        advice: "Matabeleland drier conditions driving steady inflows from Midlands. Grain prices remain elevated.",
        bestTimeToSell: "September – October",
        history: [
          { month: 'Mar', price: 330, low: 320, high: 340, volume: 1400, regional: 320 },
          { month: 'Apr', price: 338, low: 328, high: 348, volume: 1600, regional: 328 },
          { month: 'May', price: 344, low: 335, high: 355, volume: 1750, regional: 332 },
          { month: 'Jun', price: 348, low: 340, high: 360, volume: 1500, regional: 336 },
          { month: 'Jul', price: 352, low: 342, high: 362, volume: 1350, regional: 338 },
          { month: 'Aug', price: 355, low: 345, high: 368, volume: 1200, regional: 340 }
        ],
        forecast: [
          { month: 'Sep', price: 370, confidence: 0.87 },
          { month: 'Oct', price: 385, confidence: 0.80 }
        ]
      },
      {
        crop: "Butternut Squash",
        category: "Horticulture & Vegetables",
        price: "$5.50/pocket (10kg)",
        rawPrice: 5.5,
        unit: "10kg pocket",
        currency: "USD",
        trend: "up",
        changePercent: "+10.0%",
        volatility: "Medium",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$5.00/pocket",
        wholesaleMarket: "Renkini Fresh Sheds",
        district: "Bulawayo",
        country: "Zimbabwe",
        advice: "Cured hard-skin butternut squash in strong demand from boarding schools and hospitals. Easy to store up to 3 months.",
        bestTimeToSell: "Hold in airy shaded sheds for gradual weekly sales",
        history: [
          { month: 'Mar', price: 4.2, low: 3.8, high: 4.6, volume: 1800, regional: 4.0 },
          { month: 'Apr', price: 4.5, low: 4.0, high: 5.0, volume: 2100, regional: 4.2 },
          { month: 'May', price: 4.8, low: 4.2, high: 5.2, volume: 2300, regional: 4.5 },
          { month: 'Jun', price: 5.0, low: 4.5, high: 5.5, volume: 2000, regional: 4.7 },
          { month: 'Jul', price: 5.2, low: 4.7, high: 5.8, volume: 1800, regional: 4.9 },
          { month: 'Aug', price: 5.5, low: 5.0, high: 6.0, volume: 1600, regional: 5.0 }
        ],
        forecast: [
          { month: 'Sep', price: 6.0, confidence: 0.88 },
          { month: 'Oct', price: 6.5, confidence: 0.82 }
        ]
      },
      {
        crop: "Groundnuts (Nzungu)",
        category: "Legumes & Oilseeds",
        price: "$22/20L tin",
        rawPrice: 22,
        unit: "20L tin (shelled)",
        currency: "USD",
        trend: "up",
        changePercent: "+6.5%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$20/tin",
        wholesaleMarket: "Renkini Wholesale Market",
        district: "Bulawayo",
        country: "Zimbabwe",
        advice: "Local peanut butter processors and snack vendors competing for dry, sorted, mold-free nuts.",
        bestTimeToSell: "September – October",
        history: [
          { month: 'Mar', price: 18, low: 17, high: 19, volume: 950, regional: 17 },
          { month: 'Apr', price: 19, low: 18, high: 20, volume: 1100, regional: 18 },
          { month: 'May', price: 20, low: 19, high: 21, volume: 1200, regional: 19 },
          { month: 'Jun', price: 20.5, low: 19.5, high: 21.5, volume: 1050, regional: 19.5 },
          { month: 'Jul', price: 21, low: 20, high: 22, volume: 920, regional: 19.8 },
          { month: 'Aug', price: 22, low: 21, high: 23.5, volume: 840, regional: 20 }
        ],
        forecast: [
          { month: 'Sep', price: 23.5, confidence: 0.91 },
          { month: 'Oct', price: 25.0, confidence: 0.84 }
        ]
      }
    ]
  },

  // Mutare / Manicaland, Zimbabwe
  "mutare": {
    id: "mutare_sakubva",
    name: "Sakubva Agri-Market & Border Agro-Hub",
    district: "Mutare / Manicaland",
    country: "Zimbabwe",
    currency: "USD",
    currencySymbol: "$",
    description: "Premier horticultural, banana, avocado & tea hub connecting Eastern Highlands to Mozambique border trade",
    tradingDays: "Daily (04:30 AM - 06:00 PM)",
    commodities: [
      {
        crop: "Hass Avocado",
        category: "Cash Crops",
        price: "$0.40/fruit",
        rawPrice: 0.40,
        unit: "piece ($32/crate 80pc)",
        currency: "USD",
        trend: "up",
        changePercent: "+11.2%",
        volatility: "Medium",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$0.32/fruit",
        wholesaleMarket: "Sakubva & Export Packhouses",
        district: "Mutare",
        country: "Zimbabwe",
        advice: "Late-season export quality Hass commanding premium prices from cross-border traders heading to Beira and Chimoio.",
        bestTimeToSell: "Immediate export dispatch",
        history: [
          { month: 'Mar', price: 0.25, low: 0.20, high: 0.30, volume: 8000, regional: 0.22 },
          { month: 'Apr', price: 0.28, low: 0.22, high: 0.32, volume: 9500, regional: 0.25 },
          { month: 'May', price: 0.30, low: 0.25, high: 0.35, volume: 11000, regional: 0.27 },
          { month: 'Jun', price: 0.34, low: 0.28, high: 0.38, volume: 9000, regional: 0.29 },
          { month: 'Jul', price: 0.37, low: 0.30, high: 0.42, volume: 7500, regional: 0.30 },
          { month: 'Aug', price: 0.40, low: 0.32, high: 0.45, volume: 6200, regional: 0.32 }
        ],
        forecast: [
          { month: 'Sep', price: 0.44, confidence: 0.86 },
          { month: 'Oct', price: 0.48, confidence: 0.79 }
        ]
      },
      {
        crop: "Bananas (Williams Bunch)",
        category: "Horticulture & Vegetables",
        price: "$0.18/kg",
        rawPrice: 0.18,
        unit: "kg ($9/50kg crate)",
        currency: "USD",
        trend: "stable",
        changePercent: "+1.5%",
        volatility: "Low",
        volume: "Very High",
        supplyStatus: "Balanced Supply",
        regionalAvg: "$0.17/kg",
        wholesaleMarket: "Sakubva & Honde Valley Outgrowers",
        district: "Mutare",
        country: "Zimbabwe",
        advice: "Consistent high-volume supply from Honde Valley and Burma Valley. Target supermarket ripening rooms in Harare for extra margin.",
        bestTimeToSell: "Weekly scheduled off-takes",
        history: [
          { month: 'Mar', price: 0.16, low: 0.14, high: 0.18, volume: 22000, regional: 0.15 },
          { month: 'Apr', price: 0.17, low: 0.15, high: 0.19, volume: 24000, regional: 0.16 },
          { month: 'May', price: 0.17, low: 0.15, high: 0.19, volume: 25000, regional: 0.16 },
          { month: 'Jun', price: 0.18, low: 0.16, high: 0.20, volume: 23000, regional: 0.17 },
          { month: 'Jul', price: 0.18, low: 0.16, high: 0.20, volume: 22500, regional: 0.17 },
          { month: 'Aug', price: 0.18, low: 0.16, high: 0.21, volume: 21000, regional: 0.17 }
        ],
        forecast: [
          { month: 'Sep', price: 0.19, confidence: 0.92 },
          { month: 'Oct', price: 0.20, confidence: 0.88 }
        ]
      },
      {
        crop: "Macadamia Nuts (Nut in Shell)",
        category: "Cash Crops",
        price: "$2.80/kg",
        rawPrice: 2.80,
        unit: "kg",
        currency: "USD",
        trend: "up",
        changePercent: "+5.0%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "$2.65/kg",
        wholesaleMarket: "Chipinge Macadamia Depot",
        district: "Chipinge / Mutare",
        country: "Zimbabwe",
        advice: "High international export appetite for crack-out ratios above 33%. Dry nuts on raised wire racks down to 1.5% kernel moisture.",
        bestTimeToSell: "August – September direct to export processors",
        history: [
          { month: 'Mar', price: 2.40, low: 2.20, high: 2.55, volume: 4500, regional: 2.30 },
          { month: 'Apr', price: 2.50, low: 2.35, high: 2.65, volume: 5200, regional: 2.40 },
          { month: 'May', price: 2.60, low: 2.45, high: 2.75, volume: 6000, regional: 2.50 },
          { month: 'Jun', price: 2.70, low: 2.55, high: 2.85, volume: 5500, regional: 2.55 },
          { month: 'Jul', price: 2.75, low: 2.60, high: 2.90, volume: 4800, regional: 2.60 },
          { month: 'Aug', price: 2.80, low: 2.65, high: 3.00, volume: 4200, regional: 2.65 }
        ],
        forecast: [
          { month: 'Sep', price: 2.95, confidence: 0.91 },
          { month: 'Oct', price: 3.10, confidence: 0.84 }
        ]
      }
    ]
  },

  // Lusaka, Zambia
  "lusaka": {
    id: "lusaka_soweto",
    name: "Soweto Wholesale Central Market",
    district: "Lusaka",
    country: "Zambia",
    currency: "ZMW",
    currencySymbol: "K",
    description: "Zambia's central grain, vegetable, and livestock trading terminal",
    tradingDays: "Daily (05:00 AM - 06:00 PM)",
    commodities: [
      {
        crop: "White Maize (Mahangu)",
        category: "Grains & Cereals",
        price: "K320/50kg bag",
        rawPrice: 320,
        unit: "50kg bag (K6,400/ton)",
        currency: "ZMW",
        trend: "up",
        changePercent: "+8.5%",
        volatility: "Medium",
        volume: "Very High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "K295/bag",
        wholesaleMarket: "Soweto Market & FRA Depots",
        district: "Lusaka",
        country: "Zambia",
        advice: "Food Reserve Agency (FRA) and private millers aggressively purchasing. Keep grain protected in moisture-proof silos.",
        bestTimeToSell: "September – November before rainy season begins",
        history: [
          { month: 'Mar', price: 260, low: 245, high: 275, volume: 4500, regional: 250 },
          { month: 'Apr', price: 275, low: 260, high: 290, volume: 5600, regional: 265 },
          { month: 'May', price: 290, low: 275, high: 305, volume: 6200, regional: 275 },
          { month: 'Jun', price: 300, low: 285, high: 315, volume: 5400, regional: 285 },
          { month: 'Jul', price: 310, low: 295, high: 325, volume: 4900, regional: 290 },
          { month: 'Aug', price: 320, low: 305, high: 335, volume: 4200, regional: 295 }
        ],
        forecast: [
          { month: 'Sep', price: 345, confidence: 0.90 },
          { month: 'Oct', price: 365, confidence: 0.83 }
        ]
      },
      {
        crop: "Soybeans (Grade 1)",
        category: "Legumes & Oilseeds",
        price: "K540/50kg bag",
        rawPrice: 540,
        unit: "50kg bag",
        currency: "ZMW",
        trend: "up",
        changePercent: "+3.2%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Balanced Supply",
        regionalAvg: "K520/bag",
        wholesaleMarket: "Soweto & Industrial Crushers",
        district: "Lusaka",
        country: "Zambia",
        advice: "Livestock feed millers operating at full capacity. Premium paid for high oil content beans.",
        bestTimeToSell: "Immediate contract sale",
        history: [
          { month: 'Mar', price: 480, low: 460, high: 500, volume: 1800, regional: 470 },
          { month: 'Apr', price: 500, low: 480, high: 520, volume: 2200, regional: 490 },
          { month: 'May', price: 515, low: 495, high: 535, volume: 2500, regional: 505 },
          { month: 'Jun', price: 525, low: 505, high: 545, volume: 2300, regional: 510 },
          { month: 'Jul', price: 535, low: 515, high: 555, volume: 2100, regional: 515 },
          { month: 'Aug', price: 540, low: 520, high: 560, volume: 1900, regional: 520 }
        ],
        forecast: [
          { month: 'Sep', price: 560, confidence: 0.92 },
          { month: 'Oct', price: 575, confidence: 0.86 }
        ]
      },
      {
        crop: "Tomatoes (Moni Variety)",
        category: "Horticulture & Vegetables",
        price: "K160/wooden crate",
        rawPrice: 160,
        unit: "wooden crate (25kg)",
        currency: "ZMW",
        trend: "down",
        changePercent: "-15.0%",
        volatility: "High",
        volume: "Very High",
        supplyStatus: "Peak Harvest Surplus",
        regionalAvg: "K185/crate",
        wholesaleMarket: "Buseko & Soweto Fresh Produce",
        district: "Lusaka",
        country: "Zambia",
        advice: "Large volume arriving from Chisamba and Mkushi farm blocks. Offload early to market mamas for bulk discounts.",
        bestTimeToSell: "Early dawn delivery (03:30 AM)",
        history: [
          { month: 'Mar', price: 240, low: 210, high: 270, volume: 6000, regional: 230 },
          { month: 'Apr', price: 210, low: 180, high: 240, volume: 7200, regional: 200 },
          { month: 'May', price: 190, low: 160, high: 220, volume: 8100, regional: 190 },
          { month: 'Jun', price: 180, low: 150, high: 210, volume: 8800, regional: 185 },
          { month: 'Jul', price: 170, low: 140, high: 200, volume: 9400, regional: 180 },
          { month: 'Aug', price: 160, low: 130, high: 190, volume: 10200, regional: 185 }
        ],
        forecast: [
          { month: 'Sep', price: 195, confidence: 0.84 },
          { month: 'Oct', price: 240, confidence: 0.77 }
        ]
      }
    ]
  },

  // Nairobi, Kenya
  "nairobi": {
    id: "nairobi_wakulima",
    name: "Wakulima (Marikiti) Wholesale Market",
    district: "Nairobi",
    country: "Kenya",
    currency: "KES",
    currencySymbol: "KSh",
    description: "East Africa's largest fresh produce and cereal wholesale trading center",
    tradingDays: "Daily (03:00 AM - 05:00 PM)",
    commodities: [
      {
        crop: "Dry Maize (White)",
        category: "Grains & Cereals",
        price: "KSh 4,400/90kg bag",
        rawPrice: 4400,
        unit: "90kg bag",
        currency: "KES",
        trend: "up",
        changePercent: "+6.0%",
        volatility: "Medium",
        volume: "High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "KSh 4,150/bag",
        wholesaleMarket: "Wakulima & Eldoret NCPB",
        district: "Nairobi",
        country: "Kenya",
        advice: "Millers in Thika and Nairobi seeking dry grain below 13.5% moisture. Inflow from Uganda moderate.",
        bestTimeToSell: "September – October before North Rift harvest",
        history: [
          { month: 'Mar', price: 3800, low: 3600, high: 4000, volume: 8500, regional: 3700 },
          { month: 'Apr', price: 3950, low: 3750, high: 4150, volume: 9200, regional: 3850 },
          { month: 'May', price: 4100, low: 3900, high: 4300, volume: 9800, regional: 4000 },
          { month: 'Jun', price: 4250, low: 4050, high: 4450, volume: 9100, regional: 4080 },
          { month: 'Jul', price: 4320, low: 4150, high: 4500, volume: 8400, regional: 4120 },
          { month: 'Aug', price: 4400, low: 4200, high: 4600, volume: 7600, regional: 4150 }
        ],
        forecast: [
          { month: 'Sep', price: 4650, confidence: 0.89 },
          { month: 'Oct', price: 4800, confidence: 0.82 }
        ]
      },
      {
        crop: "Irish Potatoes (Shangi)",
        category: "Tubers & Roots",
        price: "KSh 3,200/50kg bag",
        rawPrice: 3200,
        unit: "50kg bag",
        currency: "KES",
        trend: "up",
        changePercent: "+12.3%",
        volatility: "High",
        volume: "High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "KSh 2,900/bag",
        wholesaleMarket: "Wakulima & City Market",
        district: "Nairobi",
        country: "Kenya",
        advice: "Nyandarua supply tapering off. Hotel and restaurant demand for French fry processing exceptionally strong.",
        bestTimeToSell: "Immediate offloading to wholesale brokers",
        history: [
          { month: 'Mar', price: 2500, low: 2200, high: 2800, volume: 11000, regional: 2400 },
          { month: 'Apr', price: 2700, low: 2400, high: 3000, volume: 12500, regional: 2550 },
          { month: 'May', price: 2850, low: 2550, high: 3150, volume: 13000, regional: 2700 },
          { month: 'Jun', price: 2980, low: 2700, high: 3250, volume: 11500, regional: 2800 },
          { month: 'Jul', price: 3100, low: 2800, high: 3400, volume: 10000, regional: 2850 },
          { month: 'Aug', price: 3200, low: 2900, high: 3500, volume: 9200, regional: 2900 }
        ],
        forecast: [
          { month: 'Sep', price: 3500, confidence: 0.91 },
          { month: 'Oct', price: 3750, confidence: 0.80 }
        ]
      }
    ]
  },

  // Lilongwe, Malawi
  "lilongwe": {
    id: "lilongwe_lizulu",
    name: "Lizulu Central Agro-Produce Terminal",
    district: "Lilongwe",
    country: "Malawi",
    currency: "MWK",
    currencySymbol: "MK",
    description: "Malawi's central food crop and legume wholesale exchange hub",
    tradingDays: "Daily (05:00 AM - 05:30 PM)",
    commodities: [
      {
        crop: "White Maize",
        category: "Grains & Cereals",
        price: "MK 38,000/50kg bag",
        rawPrice: 38000,
        unit: "50kg bag",
        currency: "MWK",
        trend: "up",
        changePercent: "+9.0%",
        volatility: "High",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "MK 35,500/bag",
        wholesaleMarket: "Lizulu & ADMARC Depots",
        district: "Lilongwe",
        country: "Malawi",
        advice: "Tight rural stocks. Vendors from Blantyre and Zomba sourcing grain in central region. High returns for stored dry grain.",
        bestTimeToSell: "September – November",
        history: [
          { month: 'Mar', price: 29000, low: 27000, high: 31000, volume: 3200, regional: 28000 },
          { month: 'Apr', price: 31500, low: 29500, high: 33500, volume: 3800, regional: 30000 },
          { month: 'May', price: 33500, low: 31500, high: 35500, volume: 4200, regional: 32000 },
          { month: 'Jun', price: 35000, low: 33000, high: 37000, volume: 3900, regional: 33500 },
          { month: 'Jul', price: 36500, low: 34500, high: 38500, volume: 3400, regional: 34500 },
          { month: 'Aug', price: 38000, low: 36000, high: 40000, volume: 2900, regional: 35500 }
        ],
        forecast: [
          { month: 'Sep', price: 41000, confidence: 0.88 },
          { month: 'Oct', price: 44000, confidence: 0.82 }
        ]
      },
      {
        crop: "Pigeon Peas (Nandolo)",
        category: "Legumes & Oilseeds",
        price: "MK 55,000/50kg bag",
        rawPrice: 55000,
        unit: "50kg bag",
        currency: "MWK",
        trend: "up",
        changePercent: "+7.8%",
        volatility: "Low",
        volume: "Moderate",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "MK 51,000/bag",
        wholesaleMarket: "Lizulu & Export Exchangers",
        district: "Lilongwe",
        country: "Malawi",
        advice: "Strong export demand to India. Processors offering cash on delivery for graded, insect-free dry Nandolo.",
        bestTimeToSell: "August – October",
        history: [
          { month: 'Mar', price: 44000, low: 42000, high: 46000, volume: 1500, regional: 42500 },
          { month: 'Apr', price: 47000, low: 45000, high: 49000, volume: 1800, regional: 45000 },
          { month: 'May', price: 49500, low: 47500, high: 51500, volume: 2100, regional: 47500 },
          { month: 'Jun', price: 51500, low: 49500, high: 53500, volume: 1900, regional: 49000 },
          { month: 'Jul', price: 53500, low: 51000, high: 55500, volume: 1700, regional: 50000 },
          { month: 'Aug', price: 55000, low: 52500, high: 57500, volume: 1500, regional: 51000 }
        ],
        forecast: [
          { month: 'Sep', price: 58500, confidence: 0.91 },
          { month: 'Oct', price: 62000, confidence: 0.85 }
        ]
      }
    ]
  },

  // Johannesburg / Gauteng, South Africa
  "johannesburg": {
    id: "joburg_jfpm",
    name: "Joburg Fresh Produce Market (JFPM)",
    district: "Johannesburg / Gauteng",
    country: "South Africa",
    currency: "ZAR",
    currencySymbol: "R",
    description: "Southern Africa's largest computerized commission market trading thousands of tons daily",
    tradingDays: "Monday – Saturday (04:00 AM - 11:00 AM)",
    commodities: [
      {
        crop: "Yellow Maize (SAFEX Spot)",
        category: "Grains & Cereals",
        price: "R3,850/ton",
        rawPrice: 3850,
        unit: "ton",
        currency: "ZAR",
        trend: "up",
        changePercent: "+3.5%",
        volatility: "Low",
        volume: "Very High",
        supplyStatus: "Balanced Supply",
        regionalAvg: "R3,780/ton",
        wholesaleMarket: "SAFEX Grain Silos & Mills",
        district: "Johannesburg",
        country: "South Africa",
        advice: "Feeder cattle and broiler feed industries active buyers. Hedge prices using standard forward delivery contracts.",
        bestTimeToSell: "Forward hedge for Spring delivery",
        history: [
          { month: 'Mar', price: 3550, low: 3450, high: 3650, volume: 28000, regional: 3500 },
          { month: 'Apr', price: 3620, low: 3520, high: 3720, volume: 32000, regional: 3580 },
          { month: 'May', price: 3700, low: 3600, high: 3800, volume: 35000, regional: 3650 },
          { month: 'Jun', price: 3760, low: 3660, high: 3860, volume: 31000, regional: 3710 },
          { month: 'Jul', price: 3810, low: 3710, high: 3910, volume: 29000, regional: 3750 },
          { month: 'Aug', price: 3850, low: 3750, high: 3950, volume: 27000, regional: 3780 }
        ],
        forecast: [
          { month: 'Sep', price: 3950, confidence: 0.93 },
          { month: 'Oct', price: 4050, confidence: 0.87 }
        ]
      },
      {
        crop: "Onions (Brown Medium)",
        category: "Horticulture & Vegetables",
        price: "R78/10kg pocket",
        rawPrice: 78,
        unit: "10kg pocket",
        currency: "ZAR",
        trend: "up",
        changePercent: "+8.3%",
        volatility: "Medium",
        volume: "High",
        supplyStatus: "Shortage / High Demand",
        regionalAvg: "R72/pocket",
        wholesaleMarket: "JFPM Hall 1 & Tshwane FPM",
        district: "Johannesburg",
        country: "South Africa",
        advice: "Limpopo harvest concluding, Western Cape crop not yet ready. Price spike in progress.",
        bestTimeToSell: "Next 3 weeks during low supply window",
        history: [
          { month: 'Mar', price: 62, low: 55, high: 68, volume: 14000, regional: 58 },
          { month: 'Apr', price: 65, low: 58, high: 72, volume: 16000, regional: 61 },
          { month: 'May', price: 68, low: 60, high: 75, volume: 17500, regional: 64 },
          { month: 'Jun', price: 72, low: 64, high: 80, volume: 15500, regional: 67 },
          { month: 'Jul', price: 75, low: 67, high: 83, volume: 14000, regional: 70 },
          { month: 'Aug', price: 78, low: 70, high: 86, volume: 12500, regional: 72 }
        ],
        forecast: [
          { month: 'Sep', price: 85, confidence: 0.90 },
          { month: 'Oct', price: 75, confidence: 0.81 }
        ]
      }
    ]
  }
};

/**
 * Intelligent Location-to-Market-Hub Matcher
 * Resolves any user district, town, or country string to the most accurate agro-market hub.
 */
export function getMarketHubForLocation(location?: string, country?: string): RegionalMarketHub {
  const locStr = (location || '').toLowerCase().trim();
  const countryStr = (country || '').toLowerCase().trim();

  // 1. Exact or keyword checks
  if (locStr.includes('bulawayo') || locStr.includes('matabeleland') || locStr.includes('gwanda') || locStr.includes('plumtree') || locStr.includes('hwange') || locStr.includes('lupane')) {
    return REGIONAL_MARKET_HUBS["bulawayo"];
  }

  if (locStr.includes('mutare') || locStr.includes('manicaland') || locStr.includes('chipinge') || locStr.includes('nyanga') || locStr.includes('chimanimani') || locStr.includes('rusape')) {
    return REGIONAL_MARKET_HUBS["mutare"];
  }

  if (locStr.includes('zambia') || locStr.includes('lusaka') || locStr.includes('kitwe') || locStr.includes('ndola') || locStr.includes('copperbelt') || locStr.includes('choma') || locStr.includes('chipata') || countryStr.includes('zambia')) {
    return REGIONAL_MARKET_HUBS["lusaka"];
  }

  if (locStr.includes('kenya') || locStr.includes('nairobi') || locStr.includes('eldoret') || locStr.includes('nakuru') || locStr.includes('kisumu') || locStr.includes('mombasa') || countryStr.includes('kenya')) {
    return REGIONAL_MARKET_HUBS["nairobi"];
  }

  if (locStr.includes('malawi') || locStr.includes('lilongwe') || locStr.includes('blantyre') || locStr.includes('zomba') || locStr.includes('mzuzu') || locStr.includes('salima') || countryStr.includes('malawi')) {
    return REGIONAL_MARKET_HUBS["lilongwe"];
  }

  if (locStr.includes('south africa') || locStr.includes('johannesburg') || locStr.includes('gauteng') || locStr.includes('pretoria') || locStr.includes('durban') || locStr.includes('cape town') || locStr.includes('limpopo') || countryStr.includes('south africa')) {
    return REGIONAL_MARKET_HUBS["johannesburg"];
  }

  // Default to Harare Wholesale Mbare Musika (primary default hub for Zimbabwe)
  return REGIONAL_MARKET_HUBS["harare"];
}

/**
 * List of all available major wholesale hubs for easy comparison
 */
export function getAllMarketHubs(): RegionalMarketHub[] {
  return Object.values(REGIONAL_MARKET_HUBS);
}

export function refreshMarketSnapshot(hubs: RegionalMarketHub[] = getAllMarketHubs()): RegionalMarketHub[] {
  const now = Date.now();

  return hubs.map((hub, hubIndex) => ({
    ...hub,
    commodities: hub.commodities.map((commodity, commodityIndex) => {
      const basePrice = commodity.rawPrice || 1;
      const phase = (now / 86400000) + hubIndex + commodityIndex;
      const wave = Math.sin(phase * 1.4) * 0.06;
      const trendBias = commodity.trend === 'up' ? 0.045 : commodity.trend === 'down' ? -0.035 : 0.01;
      const liveDeltaPercent = (wave + trendBias) * 100;
      const updatedRawPrice = Math.max(0.5, basePrice * (1 + liveDeltaPercent / 100));
      const changePercent = ((updatedRawPrice - basePrice) / basePrice) * 100;
      const trend: 'up' | 'down' | 'stable' = changePercent > 1.5 ? 'up' : changePercent < -1.5 ? 'down' : 'stable';
      const symbol = hub.currencySymbol || commodity.currencySymbol || '$';
      const displayPrice = updatedRawPrice < 10
        ? `${symbol}${updatedRawPrice.toFixed(2)}`
        : updatedRawPrice < 100
          ? `${symbol}${updatedRawPrice.toFixed(1)}`
          : `${symbol}${updatedRawPrice.toFixed(0)}`;

      return {
        ...commodity,
        rawPrice: Number(updatedRawPrice.toFixed(2)),
        price: `${displayPrice}/${commodity.unit}`,
        trend,
        changePercent: `${trend === 'up' ? '+' : trend === 'down' ? '-' : ''}${Math.abs(changePercent).toFixed(1)}%`,
        advice: trend === 'up'
          ? `${commodity.advice} Current momentum suggests a strong short-term selling window before the next market correction.`
          : trend === 'down'
            ? `${commodity.advice} Short-term softness is visible; stagger sales and prioritize quality lots to protect margins.`
            : `${commodity.advice} Market conditions are balanced; hold for the best lot quality and timing.`
      };
    })
  }));
}
