import type { ProcessedReport, RouteSuggestion } from '../types';

const SAFETY_KEYWORDS: Record<string, string[]> = {
  unsafe: ['unsafe', 'danger', 'dangerous', 'mugging', 'robbery', 'theft', 'pickpocket', 'assault', 'harass', 'suspicious', 'threat'],
  accident: ['accident', 'crash', 'collision', 'hit', 'injury', 'injured', 'bleeding', 'fall', 'fell'],
  poorlight: ['dark', 'poorly lit', 'no light', 'broken light', 'dim', 'unlit', 'no streetlight'],
};

const TRAFFIC_KEYWORDS: Record<string, string[]> = {
  congestion: ['traffic', 'congestion', 'jam', 'gridlock', 'slow', 'standstill', 'blocked road'],
  rain: ['rain', 'raining', 'wet', 'slippery', 'drizzle', 'downpour'],
  flood: ['flood', 'flooding', 'water', 'overflow', 'underwater', 'submerged'],
};

const CLEANLINESS_KEYWORDS: string[] = ['trash', 'garbage', 'dirty', 'litter', 'waste', 'pollution', 'graffiti', 'dump', 'sewage', 'smell', 'odor'];
const HOSPITALITY_KEYWORDS: string[] = ['hotel', 'restaurant', 'food', 'cafe', 'bar', 'shop', 'store', 'market'];
const CULTURE_KEYWORDS: string[] = ['temple', 'shrine', 'museum', 'landmark', 'historic', 'heritage', 'monument', 'gallery', 'tradition', 'festival'];

const URGENCY_HIGH = ['urgent', 'emergency', 'critical', 'serious', 'immediate', 'help', 'danger', 'bleeding', 'crash', 'attack', 'fire'];
const URGENCY_MED = ['warning', 'caution', 'careful', 'hazard', 'broken', 'damaged', 'flooding', 'congestion'];

export function processReport(text: string): ProcessedReport {
  const lower = text.toLowerCase();

  // Determine category and subtype
  let category: ProcessedReport['category'] = 'safety';
  let subtype: ProcessedReport['subtype'] = 'unsafe';

  for (const [sub, keywords] of Object.entries(SAFETY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      category = 'safety';
      subtype = sub as ProcessedReport['subtype'];
      break;
    }
  }

  if (category === 'safety') {
    for (const [sub, keywords] of Object.entries(TRAFFIC_KEYWORDS)) {
      if (keywords.some((k) => lower.includes(k))) {
        category = 'traffic';
        subtype = sub as ProcessedReport['subtype'];
        break;
      }
    }
  }

  if (category === 'safety') {
    if (CLEANLINESS_KEYWORDS.some((k) => lower.includes(k))) {
      category = 'safety';
      subtype = 'unsafe';
    } else if (HOSPITALITY_KEYWORDS.some((k) => lower.includes(k))) {
      category = 'hospitality';
      subtype = 'food';
    } else if (CULTURE_KEYWORDS.some((k) => lower.includes(k))) {
      category = 'culture';
      subtype = 'landmark';
    }
  }

  // Override: if traffic keywords matched, also check cleanliness for potential miscategorization
  if (CLEANLINESS_KEYWORDS.some((k) => lower.includes(k)) && category === 'safety' && subtype === 'unsafe') {
    // keep as safety/unsafe for cleanliness issues
  }

  // Determine urgency
  let urgency: ProcessedReport['urgency'] = 'low';
  if (URGENCY_HIGH.some((k) => lower.includes(k))) {
    urgency = 'critical';
  } else if (URGENCY_MED.some((k) => lower.includes(k))) {
    urgency = 'high';
  } else if (lower.length > 50) {
    urgency = 'medium';
  }

  // Generate name and description
  const typeLabels: Record<string, string> = {
    unsafe: 'Citizen Safety Report',
    accident: 'Accident Report',
    poorlight: 'Poor Lighting Report',
    congestion: 'Traffic Congestion Report',
    rain: 'Weather Advisory',
    flood: 'Flood Warning',
    food: 'Community Place Recommendation',
    landmark: 'Cultural Spot Report',
  };

  const name = typeLabels[subtype] || 'Citizen Report';
  const description = text.length > 120 ? text.slice(0, 120) + '...' : text;

  return { urgency, category, subtype, name, description };
}

// ─── AI Travel Assistant ───

export interface AIResponse {
  text: string;
  route?: RouteSuggestion[];
}

export function generateAIResponse(query: string, cityName: string): AIResponse {
  const lower = query.toLowerCase();

  const isNightWalk =
    lower.includes('night walk') ||
    lower.includes('night') && lower.includes('walk') ||
    lower.includes('safe walk') ||
    lower.includes('safer') && lower.includes('walk');

  const isFoodTour =
    lower.includes('food tour') ||
    (lower.includes('food') && (lower.includes('tour') || lower.includes('day') || lower.includes('plan')));

  const isHistoric =
    lower.includes('historic') || lower.includes('history') || lower.includes('heritage') || lower.includes('culture');

  const isBudget =
    lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable');

  if (isNightWalk) {
    return {
      text: `Here's a safer night-walking route in ${cityName} that prioritizes well-lit, high-safety streets over the shortest path. I've identified 2 poorly-lit zones to avoid and routed you through areas with safety scores above 85.`,
      route: [
        {
          step: `Start from the central transit hub and head south on the main boulevard (well-lit, safety score 92)`,
          safetyNote: 'Well-lit main road with active storefronts and CCTV coverage.',
          safetyScore: 92,
          duration: '8 min',
        },
        {
          step: `Turn east onto the gallery district — avoid the canal-side shortcut (poor lighting reported)`,
          safetyNote: 'Skipping the canal walk saves you from a known dim zone. Gallery street has foot traffic until 10pm.',
          safetyScore: 88,
          duration: '6 min',
        },
        {
          step: `Continue through the pedestrian-only shopping arcade`,
          safetyNote: 'Pedestrian-only zone with security patrols. Safety score 90.',
          safetyScore: 90,
          duration: '5 min',
        },
        {
          step: `Arrive at your destination via the park's south entrance (well-lit main gate)`,
          safetyNote: 'Use the south entrance, not the north — north side has reported harassment incidents after dark.',
          safetyScore: 87,
          duration: '4 min',
        },
      ],
    };
  }

  if (isFoodTour) {
    return {
      text: `I've planned a 1-day food tour of ${cityName}${isBudget ? ' focused on budget-friendly spots' : ''} that balances authentic local eats with safe, accessible routes between stops. Total estimated time: 5-6 hours including walking.`,
      route: [
        {
          step: `Morning: Start at the outer market for fresh seafood street food (budget: $, safety: 90)`,
          safetyNote: 'Busy morning market with high foot traffic. Very safe during daytime hours.',
          safetyScore: 90,
          duration: '45 min',
        },
        {
          step: `Midday: Walk to the ramen alley for lunch (budget: $, safety: 88)`,
          safetyNote: 'Route follows well-lit main streets. The alley itself is narrow but safe and popular.',
          safetyScore: 88,
          duration: '1 hour',
        },
        {
          step: `Afternoon: Explore the traditional snack street for dessert and souvenirs (budget: $, safety: 90)`,
          safetyNote: 'Tourist-friendly area with visible security. Safe throughout the day.',
          safetyScore: 90,
          duration: '45 min',
        },
        {
          step: `Evening: End at the standing bar district for cheap drinks and yakitori (budget: $, safety: 85)`,
          safetyNote: 'Lively evening area with locals. Stay on main streets; avoid back alleys after 10pm.',
          safetyScore: 85,
          duration: '1.5 hours',
        },
      ],
    };
  }

  if (isHistoric) {
    return {
      text: `Here's a cultural and historical tour of ${cityName} that takes you through the most significant landmarks and heritage sites, connected by safe walking routes.`,
      route: [
        {
          step: `Start at the oldest temple in the city (free entry, safety: 93)`,
          safetyNote: 'Very safe historic district with tourist infrastructure.',
          safetyScore: 93,
          duration: '1 hour',
        },
        {
          step: `Walk the traditional market street adjacent to the temple`,
          safetyNote: 'Pedestrian-friendly, well-patrolled. Safe during daytime.',
          safetyScore: 90,
          duration: '45 min',
        },
        {
          step: `Take transit to the shrine nestled in the city forest`,
          safetyNote: 'The forested approach is serene and very safe at all hours.',
          safetyScore: 95,
          duration: '1 hour',
        },
        {
          step: `End at the observation tower for a sunset panorama`,
          safetyNote: 'Premium tourist area with excellent security. Safety score 94.',
          safetyScore: 94,
          duration: '1 hour',
        },
      ],
    };
  }

  // Default response
  return {
    text: `I can help you explore ${cityName} safely! Try asking me to plan a safe walking route, a food tour, or a historical itinerary. You can also ask about specific neighborhoods or safety conditions in different areas. Here are some quick options below to get started.`,
  };
}
