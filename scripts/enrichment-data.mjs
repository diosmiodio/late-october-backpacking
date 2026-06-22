// Hand-curated enrichment layered onto the source dataset.
//
// COORDS: approximate trailhead/area coordinates (clearly labeled "approximate"
//   in the UI). They power the overview map plus the Maps and Weather links.
// PLAN:   short water + key-risk summaries DERIVED from each destination's own
//   pros/cons in the source data — re-surfaced for scannability, not invented.
// REC_GOV: destinations whose source note says permits book through
//   recreation.gov, mapped to a sensible search term.

export const COORDS = {
  "grand-canyon": { lat: 36.0527, lon: -112.0838 },     // South Kaibab Trailhead
  "zion-narrows": { lat: 37.2853, lon: -112.948 },      // Temple of Sinawava
  "paria-buckskin": { lat: 37.019, lon: -112.0256 },    // Wire Pass Trailhead
  "canyonlands-needles": { lat: 38.1457, lon: -109.8234 }, // Elephant Hill
  "capitol-reef": { lat: 37.9, lon: -111.0 },           // Waterpocket Fold (south)
  "coyote-gulch": { lat: 37.4127, lon: -111.149 },      // Hurricane Wash Trailhead
  "bryce-under-rim": { lat: 37.6045, lon: -112.1571 },  // Bryce Point
  "aravaipa": { lat: 32.893, lon: -110.516 },           // West trailhead
  "superstition": { lat: 33.397, lon: -111.348 },       // Peralta Trailhead
  "saguaro-rincon": { lat: 32.223, lon: -110.705 },     // Douglas Spring Trailhead
  "chiricahua": { lat: 31.912, lon: -109.279 },         // Rustler Park
  "gila": { lat: 33.227, lon: -108.262 },               // Gila Cliff Dwellings
  "big-bend": { lat: 29.27, lon: -103.3 },              // Chisos Basin
  "guadalupe-mtns": { lat: 31.8975, lon: -104.8276 },   // Pine Springs
  "joshua-tree": { lat: 34.02, lon: -116.162 },         // Boy Scout Trailhead area
  "death-valley": { lat: 36.605, lon: -117.145 },       // Cottonwood Canyon area
  "mojave-preserve": { lat: 34.897, lon: -115.71 },     // Kelso Dunes
  "anza-borrego": { lat: 33.27, lon: -116.415 },        // Borrego Palm Canyon
  "trans-catalina": { lat: 33.39, lon: -118.417 },      // Santa Catalina Island
  "channel-islands": { lat: 34.049, lon: -119.557 },    // Scorpion, Santa Cruz Is.
  "point-reyes": { lat: 38.04, lon: -122.8 },           // Coast Trail camps
  "lost-coast": { lat: 40.249, lon: -124.353 },         // Mattole Trailhead
  "sespe": { lat: 34.547, lon: -119.149 },              // Piedra Blanca Trailhead
  "olympic-coast": { lat: 47.919, lon: -124.64 },       // Rialto Beach / La Push
  "great-smoky": { lat: 35.6118, lon: -83.4249 },       // Newfound Gap
  "shenandoah": { lat: 38.5708, lon: -78.2869 },        // Old Rag area
  "dolly-sods": { lat: 39.048, lon: -79.31 },           // Red Creek / Bear Rocks
  "cumberland-island": { lat: 30.763, lon: -81.458 },   // Sea Camp
  "ozark-highlands": { lat: 36.022, lon: -93.37 },      // Buffalo River / Ponca
  "everglades": { lat: 25.141, lon: -80.924 },          // Flamingo
  "havasupai": { lat: 36.2552, lon: -112.698 },         // Havasu Falls
};

export const PLAN = {
  "grand-canyon": { water: "Reliable water + developed campground", risk: "Competitive permit; brutal climb out" },
  "zion-narrows": { water: "In-river hike — cold water all day", risk: "Flash floods; permit contested" },
  "paria-buckskin": { water: "River/spring water — treat it", risk: "Flash floods; cold, muddy wades" },
  "canyonlands-needles": { water: "Scarce — cache or carry", risk: "Water logistics; slickrock route-finding" },
  "capitol-reef": { water: "Very limited — carry your own", risk: "Remote dirt roads; full self-sufficiency" },
  "coyote-gulch": { water: "Reliable canyon water", risk: "Flash floods; long sandy approach" },
  "bryce-under-rim": { water: "Unreliable / can be dry", risk: "Early snow & hard freezes (~8–9k ft)" },
  "aravaipa": { water: "Perennial creek — constant water", risk: "Tight permit quota; wet feet all day" },
  "superstition": { water: "Unreliable — carry heavy", risk: "Water scarcity; warm afternoons" },
  "saguaro-rincon": { water: "Some at high camps; plan lower legs", risk: "Big climb; cold nights up high" },
  "chiricahua": { water: "Seasonal / unreliable", risk: "Very remote; fire-scarred in places" },
  "gila": { water: "Reliable on river routes + hot springs", risk: "Many river crossings; remote" },
  "big-bend": { water: "Cache/plan on some routes", risk: "Extreme remoteness; long drives" },
  "guadalupe-mtns": { water: "Dry camps — carry all water", risk: "Fierce sustained winds; steep climbs" },
  "joshua-tree": { water: "None — pack in all water", risk: "No water; nights below freezing" },
  "death-valley": { water: "Extremely scarce — heavy carry", risk: "Water + navigation; rough-road access" },
  "mojave-preserve": { water: "None — carry everything", risk: "No water; faint routes, navigation" },
  "anza-borrego": { water: "Carry water (a few palm oases)", risk: "Early-season heat; sandy/4WD access" },
  "trans-catalina": { water: "Water at designated campsites", risk: "Ferry logistics; lots of climbing" },
  "channel-islands": { water: "Limited — depends on the site", risk: "Ferry weather; exposed, windy camps" },
  "point-reyes": { water: "Water at the camps", risk: "Coastal fog; popular weekends book up" },
  "lost-coast": { water: "Reliable creek water", risk: "Tide tables mandatory; soft sand miles" },
  "sespe": { water: "Limited / seasonal", risk: "Fire closures common; faint trails" },
  "olympic-coast": { water: "Abundant — treat it", risk: "Heavy rain; tide timing; bear canister" },
  "great-smoky": { water: "Abundant streams", risk: "Cold/wet; bears; shelters can fill" },
  "shenandoah": { water: "Plentiful water", risk: "Leaf-peeper crowds; possible early frost" },
  "dolly-sods": { water: "Frequent crossings — treat", risk: "Cold, wind, snow; boggy; foggy navigation" },
  "cumberland-island": { water: "Treat/carry water", risk: "Ferry capacity; early-season bugs" },
  "ozark-highlands": { water: "Abundant water", risk: "Faint trail; creek crossings; ticks" },
  "everglades": { water: "Carry/treat — brackish coast", risk: "Mosquitoes & heat; many paddle-access sites" },
};

// recreation.gov booking applies (per source note) -> search term
export const REC_GOV = {
  "paria-buckskin": "Paria Canyon",
  "canyonlands-needles": "Canyonlands",
  "aravaipa": "Aravaipa Canyon",
  "saguaro-rincon": "Saguaro National Park",
  "big-bend": "Big Bend",
  "channel-islands": "Channel Islands",
  "point-reyes": "Point Reyes",
  "lost-coast": "Lost Coast",
  "olympic-coast": "Olympic",
  "cumberland-island": "Cumberland Island",
  "everglades": "Everglades",
};

// Short, scannable action phrase per bookability tier.
export const BOOKABILITY_ACTION = {
  open_access: "Go on a whim — self-register at the trailhead.",
  easy_now: "Reservable now — book soon to lock it in.",
  competitive: "Contested — apply early and keep backup dates.",
  unavailable: "Not viable last-minute.",
};
