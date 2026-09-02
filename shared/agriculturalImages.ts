export interface AgriImage {
  id: string;
  title: string;
  category: 'pest' | 'disease' | 'deficiency' | 'technique' | 'crop' | 'soil' | 'livestock';
  description: string;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  symptomsOrTips?: string[];
  credit?: string;
}

export const AGRICULTURAL_IMAGES: AgriImage[] = [
  // --- PESTS ---
  {
    id: 'fall-armyworm',
    title: 'Fall Armyworm (Spodoptera frugiperda)',
    category: 'pest',
    description: 'Distinctive inverted "Y" shape on the dark head capsule and four elevated black spots arranged in a square on the 8th abdominal segment.',
    url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    tags: ['fall armyworm', 'armyworm', 'mupfumbwe', 'caterpillar', 'maize pest', 'stalk worm', 'spodoptera', 'larvae', 'maize borer'],
    symptomsOrTips: [
      'Window-pane feeding marks on young maize whorls',
      'Coarse sawdust-like frass (droppings) inside the funnel',
      'Ragged leaves as the plant grows out'
    ],
    credit: 'Agricultural Entomology Reference'
  },
  {
    id: 'maize-stalk-borer',
    title: 'African Maize Stalk Borer (Busseola fusca)',
    category: 'pest',
    description: 'Creamy-white to pinkish caterpillar that tunnels directly inside maize and sorghum stalks, causing "dead heart" where central leaves wilt and die.',
    url: 'https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?auto=format&fit=crop&w=1200&q=80',
    tags: ['stalk borer', 'stem borer', 'borer', 'busseola', 'dead heart', 'maize stalk', 'sorghum pest'],
    symptomsOrTips: [
      'Pinholes across leaf blades in straight lines',
      'Wilting and death of central growing shoot (dead heart)',
      'Holes with frass along the main stem'
    ]
  },
  {
    id: 'aphids-colony',
    title: 'Aphid Colony on Crops (Aphidoidea)',
    category: 'pest',
    description: 'Dense clusters of small green, black, or yellowish soft-bodied insects clustering under leaves and on tender shoots, sucking plant sap and secreting sticky honeydew.',
    url: 'https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?auto=format&fit=crop&w=1200&q=80',
    tags: ['aphids', 'aphid', 'ndumbe', 'greenfly', 'blackfly', 'honeydew', 'sucking pest', 'vegetable pest'],
    symptomsOrTips: [
      'Curled and puckered leaves on cabbage, rape, and beans',
      'Black sooty mold growing on honeydew secretions',
      'Stunted plant growth and transmission of viral diseases'
    ]
  },
  {
    id: 'locust-swarm',
    title: 'African Migratory Locust (Locusta migratoria)',
    category: 'pest',
    description: 'Large grasshopper-like pest with powerful jaws that defoliates large fields of cereals, pasture, and grains in devastating swarms.',
    url: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?auto=format&fit=crop&w=1200&q=80',
    tags: ['locust', 'mhashu', 'inzombe', 'grasshopper', 'swarm', 'defoliator', 'grain pest'],
    symptomsOrTips: [
      'Rapid total loss of leaf foliage within hours',
      'Stripped maize and sorghum stems',
      'Swarms arriving during warm dry periods'
    ]
  },
  {
    id: 'tomato-leafminer',
    title: 'Tomato Leafminer (Tuta absoluta)',
    category: 'pest',
    description: 'Tiny caterpillar creating transparent, irregular serpentine blotches (mines) in tomato leaves, stems, and fruits.',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22515?auto=format&fit=crop&w=1200&q=80',
    tags: ['tuta absoluta', 'leafminer', 'tomato pest', 'leaf miner', 'tomato caterpillar', 'fruit borer'],
    symptomsOrTips: [
      'Whitish to translucent blistered patches inside leaves',
      'Punctured dark exit holes on green and ripe tomatoes',
      'Premature leaf drop and blackened foliage'
    ]
  },
  {
    id: 'whiteflies',
    title: 'Whiteflies on Vegetable Leaves (Bemisia tabaci)',
    category: 'pest',
    description: 'Tiny powdery-white winged insects that flutter when leaves are disturbed; major vectors for Cassava Mosaic Virus and Tomato Yellow Leaf Curl.',
    url: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=1200&q=80',
    tags: ['whitefly', 'whiteflies', 'bemisia', 'virus vector', 'cassava whitefly', 'tomato vector'],
    symptomsOrTips: [
      'Clouds of tiny white specks flying when shaking leaves',
      'Yellowing and premature shedding of lower leaves',
      'Sticky leaf surface covered in honeydew'
    ]
  },
  {
    id: 'red-spider-mites',
    title: 'Red Spider Mites (Tetranychidae)',
    category: 'pest',
    description: 'Microscopic reddish-orange arachnids that spin fine delicate webbing under leaves during hot dry spells, causing fine yellow stippling.',
    url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80',
    tags: ['spider mite', 'red spider mite', 'mites', 'webbing', 'stippling', 'dry season pest'],
    symptomsOrTips: [
      'Fine yellow/bronze speckling on upper leaf surface',
      'Fine silky webbing on the underside of foliage',
      'Leaves dry out, turn brittle, and fall off'
    ]
  },

  // --- DISEASES ---
  {
    id: 'tomato-early-blight',
    title: 'Tomato Early Blight (Alternaria solani)',
    category: 'disease',
    description: 'Dark brown to black target-like spots with concentric rings surrounded by a distinct yellow halo on older lower leaves.',
    url: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e17?auto=format&fit=crop&w=1200&q=80',
    tags: ['early blight', 'alternaria', 'blight', 'tomato disease', 'leaf spot', 'target spot', 'tomato blight'],
    symptomsOrTips: [
      'Concentric target-board rings on spots',
      'Yellow chlorotic halos around necrotic lesions',
      'Spreads upwards from ground level during humid warm days'
    ]
  },
  {
    id: 'tomato-late-blight',
    title: 'Tomato & Potato Late Blight (Phytophthora infestans)',
    category: 'disease',
    description: 'Water-soaked irregular greasy grey-green lesions that turn dark brown and rot rapidly during cool, damp, overcast weather with white fuzz under leaves.',
    url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=80',
    tags: ['late blight', 'phytophthora', 'potato blight', 'tomato late blight', 'water soaked', 'black rot'],
    symptomsOrTips: [
      'Rapid blackening and collapsing of foliage',
      'White fluffy fungal growth on underside of leaves in morning',
      'Firm greasy brown rot on green tomato fruit'
    ]
  },
  {
    id: 'maize-streak-virus',
    title: 'Maize Streak Virus (MSV)',
    category: 'disease',
    description: 'Continuous or broken narrow, pale creamy-yellow chlorotic streaks running parallel along the veins of maize leaves.',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80',
    tags: ['maize streak virus', 'msv', 'streak', 'maize disease', 'chlorotic streaks', 'leafhopper virus'],
    symptomsOrTips: [
      'Uniform yellow-white parallel streaks along leaf veins',
      'Stunted plant height and poorly filled, deformed cobs',
      'Transmitted primarily by Cicadulina leafhopper insects'
    ]
  },
  {
    id: 'grey-leaf-spot',
    title: 'Grey Leaf Spot on Maize (Cercospora zeae-maydis)',
    category: 'disease',
    description: 'Rectangular, narrow tan to grey lesions strictly bordered by leaf veins, creating a blocky striped appearance.',
    url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1200&q=80',
    tags: ['grey leaf spot', 'gls', 'cercospora', 'maize fungus', 'rectangular spot', 'leaf spot maize'],
    symptomsOrTips: [
      'Strictly rectangular spots bounded by leaf veins',
      'Tan lesions turning grayish when fungal spores mature',
      'Severe premature drying of lower canopy'
    ]
  },
  {
    id: 'powdery-mildew',
    title: 'Powdery Mildew on Cucurbits & Vegetables',
    category: 'disease',
    description: 'Talcum powder-like white fungal coating covering leaves, stems, and shoots of pumpkins, butternut, cucumbers, and tomatoes.',
    url: 'https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?auto=format&fit=crop&w=1200&q=80',
    tags: ['powdery mildew', 'mildew', 'white powder', 'cucurbit disease', 'fungal white', 'butternut disease'],
    symptomsOrTips: [
      'White powdery dust spots merging across leaves',
      'Yellowing and premature drying of infected foliage',
      'Reduced fruit sweetness and sunscald from defoliation'
    ]
  },
  {
    id: 'cassava-mosaic',
    title: 'Cassava Mosaic Disease (CMD)',
    category: 'disease',
    description: 'Severe mosaic mottling with yellow and dark green patches, leaf distortion, curled margins, and severe root yield loss.',
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80',
    tags: ['cassava mosaic', 'cmd', 'cassava virus', 'mottling', 'leaf curl cassava', 'cassava disease'],
    symptomsOrTips: [
      'Asymmetrical misshapen, crumpled leaves',
      'Alternating light yellow and dark green mosaic patches',
      'Severely reduced tuber size and number'
    ]
  },
  {
    id: 'bacterial-wilt',
    title: 'Bacterial Wilt on Solanaceae (Ralstonia solanacearum)',
    category: 'disease',
    description: 'Sudden daytime wilting of green, healthy-looking tomato, pepper, or potato plants while leaves stay green without prior yellowing.',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22515?auto=format&fit=crop&w=1200&q=80',
    tags: ['bacterial wilt', 'ralstonia', 'wilting', 'tomato wilt', 'green wilt', 'vascular wilt'],
    symptomsOrTips: [
      'Plant wilts rapidly in hot sun but does not turn yellow',
      'Stem cross-section in clean water emits milky bacterial streaming',
      'Browning of inner vascular ring in the stem base'
    ]
  },
  {
    id: 'lumpy-skin-disease-cattle',
    title: 'Lumpy Skin Disease in Cattle',
    category: 'disease',
    description: 'Cattle showing raised, firm nodules and skin lesions characteristic of lumpy skin disease, often with swelling, fever, and reduced movement.',
    url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80',
    tags: ['lumpy skin disease', 'lump skin disease', 'lsd', 'cattle disease', 'skin nodules', 'cattle lumps', 'cattle lesion', 'animal disease'],
    symptomsOrTips: [
      'Firm skin nodules and raised lumps on the body',
      'Swollen skin, fever, and reduced grazing or movement',
      'Spread by insect vectors and often appears in cattle herds'
    ]
  },
  {
    id: 'foot-and-mouth-cattle',
    title: 'Foot and Mouth Disease in Cattle',
    category: 'disease',
    description: 'Cattle with painful mouth lesions and hoof disease typical of foot and mouth disease, causing salivation, lameness, and reduced feeding.',
    url: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?auto=format&fit=crop&w=1200&q=80',
    tags: ['foot and mouth disease', 'fmd', 'cattle mouth lesions', 'hoof lesions', 'animal disease', 'lumpy skin disease', 'cattle disease'],
    symptomsOrTips: [
      'Blisters or sores in the mouth and around the hooves',
      'Salivation, drooling, and limping',
      'High contagious risk among cattle and cloven-hoof animals'
    ]
  },
  {
    id: 'newcastle-disease-chickens',
    title: 'Newcastle Disease in Poultry',
    category: 'disease',
    description: 'Chickens with respiratory distress, twisted necks, paralysis, and sudden flock losses consistent with Newcastle disease.',
    url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80',
    tags: ['newcastle disease', 'chicken disease', 'poultry disease', 'avian disease', 'twisted neck', 'animal infection'],
    symptomsOrTips: [
      'Respiratory distress and coughing',
      'Tremors, twisting, and sudden death in flock',
      'Common in village and commercial poultry systems'
    ]
  },

  // --- NUTRIENT DEFICIENCIES & SOIL ---
  {
    id: 'nitrogen-deficiency-maize',
    title: 'Nitrogen Deficiency in Maize (V-Shape Chlorosis)',
    category: 'deficiency',
    description: 'Characteristic V-shaped yellowing starting at the leaf tip and progressing along the midrib of older bottom leaves.',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80',
    tags: ['nitrogen deficiency', 'yellow leaf', 'v shape yellow', 'nitrogen', 'fertilizer deficiency', 'maize yellow', 'urea deficiency'],
    symptomsOrTips: [
      'Inverted "V" shaped yellow band from leaf tip backwards',
      'Starts on lowest (oldest) leaves while new leaves remain light green',
      'Spindly, stunted stalks and small narrow cobs'
    ]
  },
  {
    id: 'phosphorus-deficiency',
    title: 'Phosphorus Deficiency (Purple Foliage)',
    category: 'deficiency',
    description: 'Reddish-purple pigmentation appearing on the tips and margins of young maize seedlings, indicating stunted root growth in cold or acidic soil.',
    url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
    tags: ['phosphorus deficiency', 'purple leaf', 'purple maize', 'phosphorus', 'basal fertilizer', 'acid soil'],
    symptomsOrTips: [
      'Distinct reddish-purple coloring along leaf edges and stems',
      'Stunted root system development',
      'Slow emergence and delayed crop maturity'
    ]
  },
  {
    id: 'potassium-deficiency',
    title: 'Potassium Deficiency (Margin Leaf Scorch)',
    category: 'deficiency',
    description: 'Yellowing and scorched, brown burnt edges along the outer margins of older leaves while the central midrib stays green.',
    url: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e17?auto=format&fit=crop&w=1200&q=80',
    tags: ['potassium deficiency', 'leaf scorch', 'burnt margins', 'potash', 'potassium', 'lodging'],
    symptomsOrTips: [
      'Burnt, necrotic leaf edges on mature leaves',
      'Weak stalks leading to severe crop lodging (falling over)',
      'Premature grain drying and reduced drought resistance'
    ]
  },
  {
    id: 'blossom-end-rot',
    title: 'Blossom End Rot on Tomatoes (Calcium Deficiency)',
    category: 'deficiency',
    description: 'Sunken, flat, leathery black patch at the blossom end (bottom tip) of ripening tomato fruits caused by erratic watering and calcium uptake failure.',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22515?auto=format&fit=crop&w=1200&q=80',
    tags: ['blossom end rot', 'calcium deficiency', 'black bottom tomato', 'tomato bottom rot', 'calcium', 'sunken fruit'],
    symptomsOrTips: [
      'Flat dark brown/black leathery spot on tomato base',
      'Caused by irregular watering and dry root shocks',
      'Remedy with consistent drip irrigation and agricultural lime/foliar calcium'
    ]
  },
  {
    id: 'healthy-loam-soil',
    title: 'Rich Loam & Organic Living Soil',
    category: 'soil',
    description: 'Dark, crumbly, well-aerated soil loaded with decomposed organic matter, beneficial soil microbes, and high water-holding capacity.',
    url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
    tags: ['soil', 'loam', 'rich soil', 'compost soil', 'soil structure', 'humus', 'fertile soil', 'healthy soil'],
    symptomsOrTips: [
      'Crumbles easily in the hand into soft loose aggregates',
      'Earthy sweet smell indicating active mycorrhizal fungi and earthworms',
      'Retains moisture without becoming waterlogged'
    ]
  },
  {
    id: 'mulching-bed',
    title: 'Organic Mulching on Vegetable Beds',
    category: 'technique',
    description: 'A 5-10cm thick layer of dry grass, straw, or leaves covering the soil around crops to prevent moisture evaporation, suppress weeds, and cool soil temperature.',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    tags: ['mulch', 'mulching', 'moisture retention', 'conservation farming', 'dry grass mulch', 'weed suppression', 'soil cover'],
    symptomsOrTips: [
      'Keeps soil damp up to 3x longer between waterings',
      'Keeps root zone 5°C cooler during extreme heatwaves',
      'Breaks down into rich organic matter over the season'
    ]
  },

  // --- TECHNIQUES & IRRIGATION ---
  {
    id: 'drip-irrigation-setup',
    title: 'Drip Irrigation System Layout',
    category: 'technique',
    description: 'Efficient precision drip tubing delivering controlled water droplets directly to the plant root zone, saving up to 60% water compared to furrow or overhead sprinkler.',
    url: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=1200&q=80',
    tags: ['drip irrigation', 'irrigation', 'water saving', 'drip lines', 'fertigation', 'irrigation setup', 'drip system'],
    symptomsOrTips: [
      'Emitter spacing directly matched to crop planting distance',
      'Prevents wet foliage, drastically reducing fungal diseases',
      'Can be powered by simple gravity header tanks without electricity'
    ]
  },
  {
    id: 'compost-making',
    title: 'Thermal Compost Pile Layering',
    category: 'technique',
    description: 'Building alternating layers of nitrogen-rich greens (fresh manure, crop trimmings) and carbon-rich browns (dry grass, maize stalks, straw) with water and aeration.',
    url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=1200&q=80',
    tags: ['compost', 'composting', 'organic manure', 'compost pile', 'compost layer', 'humus', 'biofertilizer'],
    symptomsOrTips: [
      'Maintain 3:1 ratio of brown (dry carbon) to green (wet nitrogen) material',
      'Internal core heat reaches 55-65°C to pasteurize weed seeds and pathogens',
      'Ready in 6-8 weeks when dark, crumbly, and sweet-smelling'
    ]
  },
  {
    id: 'pfumvudza-basins',
    title: 'Pfumvudza / Intwasa Conservation Planting Basins',
    category: 'technique',
    description: 'Precision 15cm x 15cm x 15cm planting basins spaced at 75cm x 60cm, filled with compost or manure and covered with grass mulch for maximum drought resilience.',
    url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80',
    tags: ['pfumvudza', 'intwasa', 'planting basins', 'conservation agriculture', 'zero tillage', 'drought proof', 'basin farming'],
    symptomsOrTips: [
      'Concentrates rainwater and nutrients directly under the seed',
      'Allows high yields even during low-rainfall drought seasons',
      'Requires zero tractor plowing, preserving soil biology'
    ]
  },
  {
    id: 'intercropping-maize-beans',
    title: 'Intercropping Maize & Legumes (Companion Planting)',
    category: 'technique',
    description: 'Growing nitrogen-fixing beans or cowpeas alongside nitrogen-hungry maize to improve soil fertility, shade the ground, and produce double food harvest.',
    url: 'https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?auto=format&fit=crop&w=1200&q=80',
    tags: ['intercropping', 'companion planting', 'maize beans', 'cowpeas maize', 'mixed cropping', 'nitrogen fixing', 'push pull'],
    symptomsOrTips: [
      'Beans fix atmospheric nitrogen in root nodules for the maize',
      'Bean vines cover the ground, suppressing weed germination',
      'Reduces pest infestation through biodiversity disruption'
    ]
  },
  {
    id: 'raised-garden-beds',
    title: 'Raised Vegetable Garden Beds',
    category: 'technique',
    description: 'Mounded or framed raised soil beds with loose compost-rich soil ensuring deep root penetration, excellent drainage in heavy clay, and easy weeding.',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    tags: ['raised bed', 'garden bed', 'vegetable garden', 'horticulture', 'nursery bed', 'deep bed'],
    symptomsOrTips: [
      'Prevents foot compaction on root zones',
      'Warms up faster in spring for rapid seed germination',
      'Provides perfect drainage during heavy downpours'
    ]
  },
  {
    id: 'greenhouse-farming',
    title: 'Protected Greenhouse & Shade Net Farming',
    category: 'technique',
    description: 'Controlled environment agriculture shielding tomatoes, peppers, and seedings from pests, excessive UV scorch, heavy hail, and erratic rainfall.',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    tags: ['greenhouse', 'shade net', 'tunnel farming', 'hydroponics', 'protected farming', 'high tunnel'],
    symptomsOrTips: [
      'Allows year-round off-season vegetable production for premium prices',
      'Reduces chemical pesticide needs by physically blocking insect pests',
      'Optimizes water and fertilizer usage'
    ]
  },

  // --- CROPS & HARVEST ---
  {
    id: 'healthy-maize-cobs',
    title: 'Healthy Mature Maize (Zea mays)',
    category: 'crop',
    description: 'Full, golden-yellow or white kernel filled maize cobs with tightly wrapped husks, deep root anchors, and strong upright stalks.',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80',
    tags: ['maize', 'corn', 'chibage', 'umbila', 'healthy maize', 'maize cobs', 'harvest maize'],
    symptomsOrTips: [
      'Kernels filled completely to the tip of the cob',
      'Brown, dry silk at harvest maturity',
      'Black moisture layer formed at the base of each kernel indicating physiological maturity'
    ]
  },
  {
    id: 'ripe-tomatoes-vine',
    title: 'Healthy Ripe Tomatoes on the Vine',
    category: 'crop',
    description: 'Vibrant red, firm, glossy tomatoes ripening in uniform clusters on healthy disease-free foliage.',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22515?auto=format&fit=crop&w=1200&q=80',
    tags: ['tomato', 'tomatoes', 'mhodzi', 'matamatisi', 'ripe tomatoes', 'tomato harvest', 'healthy tomato'],
    symptomsOrTips: [
      'Uniform red color without green shoulders or cracking',
      'Firm skin with high brix sugar sweetness',
      'Harvest with the calyx (green stem cap) attached for longer shelf life'
    ]
  },
  {
    id: 'sorghum-drought-grain',
    title: 'Drought-Tolerant Sorghum (Sorghum bicolor)',
    category: 'crop',
    description: 'Deep-rooted, high-energy cereal grain thriving in semi-arid Natural Regions IV & V with large upright seed heads.',
    url: 'https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?auto=format&fit=crop&w=1200&q=80',
    tags: ['sorghum', 'mapfunde', 'amabele', 'small grains', 'drought grain', 'resilient crop', 'traditional grain'],
    symptomsOrTips: [
      'Survives extended dry spells by curling leaves into dormancy',
      'Excellent nutritional value and brewing/meal potential',
      'Harvest when seeds harden and achieve 12.5% moisture'
    ]
  },
  {
    id: 'soybean-crop',
    title: 'Soybean Pods at Pod-Fill Stage',
    category: 'crop',
    description: 'Dense clusters of 3-4 seeded fuzzy soybean pods turning golden yellow as they approach physiological harvest maturity.',
    url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1200&q=80',
    tags: ['soybean', 'soya', 'soybeans', 'legume harvest', 'soya pods', 'oilseed'],
    symptomsOrTips: [
      'Pods rattle when shaken at ideal harvest moisture (13%)',
      'Natural leaf drop occurs before combining or threshing',
      'High protein content and soil nitrogen enrichment'
    ]
  },
  {
    id: 'sweet-potatoes',
    title: 'Orange-Fleshed Sweet Potato Tubers',
    category: 'crop',
    description: 'Smooth-skinned, nutrient-dense orange sweet potatoes rich in Vitamin A, harvested from clean vine ridges.',
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80',
    tags: ['sweet potato', 'mbambaira', 'tuber', 'orange flesh sweet potato', 'ipomoea', 'root crop'],
    symptomsOrTips: [
      'Cure tubers in warm shade for 5-7 days to sweeten flavor and heal skin',
      'Drought hardy and high yield per hectare',
      'Leaves can also be harvested as nutritious spinach'
    ]
  },

  // --- LIVESTOCK ---
  {
    id: 'indigenous-chickens',
    title: 'Indigenous Free-Range Poultry (Roadrunners / Boschveld)',
    category: 'livestock',
    description: 'Hardy local scavenging chickens with strong disease immunity, foraging for insects, seeds, and greens in rural homesteads.',
    url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80',
    tags: ['chickens', 'poultry', 'roadrunner', 'huku', 'enkukhu', 'free range chicken', 'boschveld', 'broiler', 'layers'],
    symptomsOrTips: [
      'Vaccinate against Newcastle Disease at 3 weeks and 3 months',
      'Provide clean drinking water with garlic/aloe vera natural boosters',
      'Predator-proof elevated night roosting shelter'
    ]
  },
  {
    id: 'boer-goats',
    title: 'Boer Goats & Indigenous Mashona Goats',
    category: 'livestock',
    description: 'Thriving browsing goats utilizing acacia scrubland and natural browse with high twin-kidding rates and rapid weight gain.',
    url: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=1200&q=80',
    tags: ['goat', 'goats', 'mbudzi', 'imbuzi', 'boer goat', 'indigenous goat', 'small ruminants'],
    symptomsOrTips: [
      'Ensure dry, draft-free slotted floor housing to prevent foot rot',
      'Deworm regularly before and after the summer rains',
      'Provide mineral salt lick blocks for optimal lactation'
    ]
  },
  {
    id: 'cattle-pasture',
    title: 'Pasture-Grazing Cattle in Savanna',
    category: 'livestock',
    description: 'Healthy Mashona, Brahman, or Nguni beef and dairy cattle grazing on natural rangeland and drought-resilient grasses.',
    url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80',
    tags: ['cattle', 'cow', 'mombe', 'inkomo', 'livestock', 'grazing', 'dairy', 'beef cattle', 'rangeland'],
    symptomsOrTips: [
      'Dip or spray weekly during tick season to prevent January Disease (Theileriosis)',
      'Supplement with urea-molasses winter licks when grass cures dry',
      'Rotational grazing preserves sweet veld pastures'
    ]
  }
];

/**
 * Searches the agricultural image database for matches against a query or keyword list.
 */
export function findMatchingAgriImages(query: string, maxResults: number = 3): AgriImage[] {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  const animalDiseaseTarget = /(lumpy skin disease|lump skin disease|lsd|foot and mouth disease|fmd|newcastle disease|avian disease|twisted neck)/.test(normalized);
  const cropTarget = /(maize|tomato|cassava|potato|banana|cabbage|rice|wheat|sorghum|sweet potato|groundnut|beans|crop|plant|leaf)/.test(normalized);
  const animalTarget = /(cattle|cow|calf|chicken|poultry|goat|sheep|livestock|herd|animal)/.test(normalized);
  const cropAliases: Record<string, string[]> = {
    maize: ['maize', 'corn', 'zea mays', 'chibage', 'umbila'],
    tomato: ['tomato', 'tomatoes', 'matamatisi', 'mhodzi'],
    potato: ['potato', 'irish potato', 'potatoes'],
    cassava: ['cassava', 'manioc', 'tapioca', 'muhogo'],
    banana: ['banana', 'plantain', 'bananas'],
    cabbage: ['cabbage', 'rape', 'leafy green'],
    beans: ['beans', 'cowpea', 'cowpeas', 'soybean', 'soya', 'legume'],
    rice: ['rice', 'paddy', 'mupunga'],
    wheat: ['wheat', 'wheat crop'],
    sorghum: ['sorghum', 'mabele', 'mapfunde'],
    sweetpotato: ['sweet potato', 'sweetpotato', 'mbambaira'],
    groundnut: ['groundnut', 'peanut', 'nuts'],
    cattle: ['cattle', 'cow', 'beef cattle', 'dairy cattle', 'calf', 'cow herd'],
    chicken: ['chicken', 'poultry', 'chickens', 'fowl', 'bird'],
    goat: ['goat', 'goats', 'sheep', 'small ruminant']
  };

  const deficiencyHints = {
    nitrogen: ['nitrogen', 'n deficiency', 'yellow lower leaves', 'v shape yellow', 'pale green', 'slow growth'],
    phosphorus: ['phosphorus', 'purple leaves', 'poor roots', 'stunted root'],
    potassium: ['potassium', 'leaf scorch', 'brown margins', 'potash'],
    calcium: ['calcium', 'blossom end rot', 'black bottom', 'fruit tip rot'],
    iron: ['iron', 'yellow young leaves', 'interveinal chlorosis', 'chlorosis']
  };

  const diseaseHints = ['disease', 'blight', 'mildew', 'rust', 'leaf spot', 'mosaic', 'wilt', 'fungus', 'virus', 'rot', 'spot', 'lumpy', 'nodules', 'lesions'];
  const exactDiseaseAliases: Record<string, string[]> = {
    'lumpy skin disease': ['lumpy skin disease', 'lump skin disease', 'lsd', 'skin nodules', 'cattle lumps', 'cattle lesion'],
    'foot and mouth disease': ['foot and mouth disease', 'fmd', 'mouth lesions', 'hoof lesions'],
    'newcastle disease': ['newcastle disease', 'poultry disease', 'twisted neck', 'avian disease'],
    'maize streak virus': ['maize streak virus', 'msv', 'yellow streaks', 'parallel streaks'],
    'late blight': ['late blight', 'potato blight', 'greasy lesions'],
    'early blight': ['early blight', 'target spot', 'concentric rings'],
    'powdery mildew': ['powdery mildew', 'white powder'],
    'bacterial wilt': ['bacterial wilt', 'green wilt', 'wilting while green']
  };

  const scored = AGRICULTURAL_IMAGES.map(img => {
    let score = 0;
    const imgText = `${img.title} ${img.tags.join(' ')}`.toLowerCase();

    if (animalDiseaseTarget && !/(cattle|cow|calf|chicken|poultry|goat|sheep|livestock|animal|herd)/.test(imgText) && !/(lumpy skin|foot and mouth|newcastle)/.test(imgText)) {
      score -= 999;
    }

    if (cropTarget && !animalTarget && !/(maize|tomato|cassava|potato|banana|cabbage|rice|wheat|sorghum|sweet potato|groundnut|beans|leaf|plant|crop)/.test(imgText) && img.category !== 'technique') {
      score -= 999;
    }

    if (normalized.includes(img.id.replace(/-/g, ' ')) || img.title.toLowerCase().includes(normalized)) {
      score += 18;
    }

    for (const tag of img.tags) {
      if (normalized.includes(tag.toLowerCase())) {
        score += 10;
      }
    }

    for (const [aliasKey, aliasValues] of Object.entries(exactDiseaseAliases)) {
      if (normalized.includes(aliasKey) || aliasValues.some(v => normalized.includes(v))) {
        const titleMatches = img.title.toLowerCase().includes(aliasKey) || aliasValues.some(v => img.title.toLowerCase().includes(v));
        const tagMatches = img.tags.some(tag => aliasValues.some(v => tag.toLowerCase().includes(v)) || tag.toLowerCase().includes(aliasKey));
        if (titleMatches || tagMatches) {
          score += 22;
        }
      }
    }

    for (const word of words) {
      if (img.title.toLowerCase().includes(word)) score += 4;
      if (img.tags.some(t => t.toLowerCase().includes(word))) score += 3;
      if (img.description.toLowerCase().includes(word)) score += 1;
    }

    const cropMatches = Object.entries(cropAliases).filter(([, aliases]) =>
      aliases.some(alias => normalized.includes(alias.toLowerCase()))
    );

    for (const [, aliases] of cropMatches) {
      const cropHit = aliases.some(alias => img.title.toLowerCase().includes(alias.toLowerCase()) || img.tags.some(tag => tag.toLowerCase().includes(alias.toLowerCase())));
      if (cropHit) score += 12;
      if (img.category === 'deficiency' && cropHit) score += 8;
      if (img.category === 'disease' && cropHit && diseaseHints.some(hint => normalized.includes(hint))) score += 6;
    }

    if (img.category === 'deficiency') {
      for (const [nutrient, hints] of Object.entries(deficiencyHints)) {
        if (hints.some(hint => normalized.includes(hint))) {
          score += 16;
          if (img.title.toLowerCase().includes(nutrient)) score += 8;
        }
      }
    }

    if (img.category === 'disease' && diseaseHints.some(hint => normalized.includes(hint))) {
      score += 8;
    }

    if (normalized.includes('affected by') || normalized.includes('animal with') || normalized.includes('animal showing')) {
      if (img.category === 'disease' || img.category === 'livestock') score += 12;
      if (img.title.toLowerCase().includes('cattle') || img.tags.some(tag => tag.toLowerCase().includes('cattle') || tag.toLowerCase().includes('poultry') || tag.toLowerCase().includes('chicken'))) {
        score += 8;
      }
    }

    if (/(lumpy skin disease|lump skin disease|lsd)/.test(normalized)) {
      if (img.id === 'lumpy-skin-disease-cattle') score += 40;
      if (img.title.toLowerCase().includes('lumpy skin disease')) score += 30;
    }

    if (/(foot and mouth disease|fmd)/.test(normalized)) {
      if (img.id === 'foot-and-mouth-cattle') score += 40;
      if (img.title.toLowerCase().includes('foot and mouth')) score += 30;
    }

    if (/(newcastle disease|avian disease|twisted neck)/.test(normalized)) {
      if (img.id === 'newcastle-disease-chickens') score += 40;
      if (img.title.toLowerCase().includes('newcastle')) score += 30;
    }

    if (normalized.includes('healthy') && img.category === 'crop') score += 4;

    return { img, score };
  });

  const matched = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.img);

  const directDiseaseMatches = matched.filter(img => {
    const text = `${img.title} ${img.tags.join(' ')}`.toLowerCase();
    return /(lumpy skin disease|lump skin disease|lsd|foot and mouth disease|fmd|newcastle disease|avian disease|twisted neck)/.test(text);
  });

  if (directDiseaseMatches.length > 0) {
    return directDiseaseMatches.slice(0, 1);
  }

  if (animalDiseaseTarget && matched.length > 0) {
    return matched.filter(img => /(cattle|cow|calf|chicken|poultry|goat|sheep|livestock|animal|herd|lumpy skin|foot and mouth|newcastle)/.test(`${img.title} ${img.tags.join(' ')}`.toLowerCase())).slice(0, 1);
  }

  return matched.slice(0, maxResults);
}

/**
 * Detects if a user query is asking for or benefits from visual imagery.
 */
export function isImageRequest(query: string): boolean {
  const lower = query.toLowerCase();
  const triggers = [
    'image', 'picture', 'photo', 'show me', 'look like', 'looks like', 'see', 'draw',
    'diagram', 'illustration', 'visual', 'how does it look', 'identify', 'what does',
    'symptom', 'appearance', 'mufananidzo', 'chiratidzo', 'isithombe', 'picha',
    'armyworm', 'blight', 'pest', 'disease', 'drip', 'compost', 'deficiency', 'rot'
  ];

  return triggers.some(trigger => lower.includes(trigger));
}
