import type { PoiTypeId } from '@/types';

// ─── Types ───

export interface NominatimResult {
  placeId: number;
  name: string;
  category: string;
  displayName: string;
  lat: number;
  lng: number;
  address?: string;
  type: string;
  importance: number;
}

export interface ExploredLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
  address: string;
  safetyScore: number;
  cleanliness: number;
  accessibility: number;
  affordability: 1 | 2 | 3 | 4;
  description: string;
  source: 'osm' | 'dynamic';
}

export interface DynamicScores {
  safetyScore: number;
  cleanliness: number;
  accessibility: number;
}

// ─── Nominatim Search ───

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchLocations(
  query: string,
  cityBounds?: { lat: number; lng: number; radiusKm: number },
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '8',
  });

  if (cityBounds) {
    // Use viewbox for bounding area (approximate square around center)
    const latOffset = cityBounds.radiusKm / 111;
    const lngOffset = cityBounds.radiusKm / (111 * Math.cos((cityBounds.lat * Math.PI) / 180));
    const left = cityBounds.lng - lngOffset;
    const right = cityBounds.lng + lngOffset;
    const top = cityBounds.lat + latOffset;
    const bottom = cityBounds.lat - latOffset;
    params.set('viewbox', `${left},${top},${right},${bottom}`);
    params.set('bounded', '1');
  }

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as RawNominatimItem[]).map(parseNominatimItem);
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: '1',
    zoom: '18',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    return parseNominatimItem(data);
  } catch {
    return null;
  }
}

interface RawNominatimItem {
  place_id: number;
  name?: string;
  category?: string;
  type?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  importance?: number;
}

function parseNominatimItem(item: RawNominatimItem): NominatimResult {
  const addr = item.address ?? {};
  const addressParts = [
    addr.house_number,
    addr.road,
    addr.neighbourhood,
    addr.suburb,
    addr.city_district,
    addr.city,
    addr.state,
  ].filter(Boolean);
  const addressStr = addressParts.join(', ');

  // Derive a short name
  const name =
    item.name ||
    addr.amenity ||
    addr.shop ||
    addr.tourism ||
    addr.office ||
    addr.building ||
    addr.road ||
    addr.neighbourhood ||
    addr.suburb ||
    item.display_name?.split(',')[0] ||
    'Unknown Location';

  return {
    placeId: item.place_id,
    name,
    category: item.category ?? 'place',
    displayName: item.display_name ?? name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    address: addressStr || item.display_name,
    type: item.type ?? 'unknown',
    importance: item.importance ?? 0,
  };
}

// ─── Overpass density query (counts nearby amenities) ───

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface AreaDensity {
  totalAmenities: number;
  hospitals: number;
  restaurants: number;
  shops: number;
  landmarks: number;
  streetlights: number;
  parks: number;
}

async function fetchAreaDensity(lat: number, lng: number, radius: number = 500): Promise<AreaDensity> {
  const query = `[out:json][timeout:8];
  (
    node["amenity"](around:${radius},${lat},${lng});
    way["amenity"](around:${radius},${lat},${lng});
    node["shop"](around:${radius},${lat},${lng});
    way["shop"](around:${radius},${lat},${lng});
    node["highway"="street_lamp"](around:${radius},${lat},${lng});
    node["leisure"~"park|garden|playground"](around:${radius},${lat},${lng});
    way["leisure"~"park|garden|playground"](around:${radius},${lat},${lng});
    node["tourism"](around:${radius},${lat},${lng});
    way["tourism"](around:${radius},${lat},${lng});
    node["historic"](around:${radius},${lat},${lng});
    way["historic"](around:${radius},${lat},${lng});
  );
  out center 200;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const elements = data.elements ?? [];

      const density: AreaDensity = {
        totalAmenities: 0,
        hospitals: 0,
        restaurants: 0,
        shops: 0,
        landmarks: 0,
        streetlights: 0,
        parks: 0,
      };

      for (const el of elements) {
        const tags = el.tags ?? {};
        density.totalAmenities++;

        if (/hospital|clinic|doctors|pharmacy|dentist/.test(tags.amenity ?? '')) {
          density.hospitals++;
        } else if (/restaurant|cafe|fast_food|bar|pub|food_court/.test(tags.amenity ?? '')) {
          density.restaurants++;
        } else if (tags.shop) {
          density.shops++;
        } else if (tags.tourism || tags.historic) {
          density.landmarks++;
        }

        if (tags.highway === 'street_lamp') density.streetlights++;
        if (/park|garden|playground/.test(tags.leisure ?? '')) density.parks++;
      }

      return density;
    } catch {
      // try next endpoint
    }
  }

  // Fallback: return empty density (scores will use pure deterministic factors)
  return { totalAmenities: 0, hospitals: 0, restaurants: 0, shops: 0, landmarks: 0, streetlights: 0, parks: 0 };
}

// ─── Dynamic Score Generator ───

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Deterministic hash from coordinates for stable base scores
function coordHash(lat: number, lng: number): number {
  const str = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDynamicScores(
  lat: number,
  lng: number,
  category: string,
  type: string,
  density?: AreaDensity,
): DynamicScores {
  const seed = coordHash(lat, lng);
  const timeOfDay = getTimeOfDay();

  // Base scores derived from coordinate hash (deterministic, stable per location)
  const baseSafety = 45 + (seed % 40);   // 45-84
  const baseClean = 40 + ((seed >> 3) % 45); // 40-84
  const baseAccess = 50 + ((seed >> 6) % 40); // 50-89

  let safetyScore = baseSafety;
  let cleanliness = baseClean;
  let accessibility = baseAccess;

  // ─── Factor 1: Place type adjustments ───
  const catLower = category.toLowerCase();
  const typeLower = type.toLowerCase();

  if (/hospital|clinic|health/.test(catLower + typeLower)) {
    safetyScore += 15;
    accessibility += 12;
    cleanliness += 10;
  } else if (/restaurant|cafe|food|fast_food/.test(catLower + typeLower)) {
    cleanliness -= 5;
    safetyScore += 5;
  } else if (/park|garden|playground|leisure/.test(catLower + typeLower)) {
    safetyScore += 8;
    cleanliness += 12;
  } else if (/shop|mall|retail|supermarket/.test(catLower + typeLower)) {
    accessibility += 8;
    cleanliness += 3;
  } else if (/school|university|college|education/.test(catLower + typeLower)) {
    safetyScore += 10;
    cleanliness += 15;
  } else if (/tourism|historic|attraction|monument/.test(catLower + typeLower)) {
    safetyScore += 6;
    cleanliness += 8;
  } else if (/industrial|factory|warehouse/.test(catLower + typeLower)) {
    safetyScore -= 10;
    cleanliness -= 15;
  } else if (/bar|pub|nightclub|alcohol/.test(catLower + typeLower)) {
    safetyScore -= 8;
  } else if (/highway|motorway|junction/.test(catLower + typeLower)) {
    safetyScore -= 15;
    accessibility += 5;
  } else if (/residential|house|apartment/.test(catLower + typeLower)) {
    safetyScore += 8;
    cleanliness += 5;
  }

  // ─── Factor 2: Time of day adjustments ───
  if (timeOfDay === 'night') {
    safetyScore -= 15;
  } else if (timeOfDay === 'evening') {
    safetyScore -= 5;
  } else if (timeOfDay === 'morning') {
    cleanliness += 5;
    safetyScore += 3;
  }

  // ─── Factor 3: Area density adjustments (if available from Overpass) ───
  if (density) {
    // More streetlights = safer at night
    if (density.streetlights > 5) safetyScore += 8;
    else if (density.streetlights === 0 && timeOfDay === 'night') safetyScore -= 10;

    // More hospitals nearby = safer
    if (density.hospitals > 0) safetyScore += 5;

    // Parks improve cleanliness perception
    if (density.parks > 0) cleanliness += 6;

    // High commercial density = better accessibility
    const commercialDensity = density.shops + density.restaurants;
    if (commercialDensity > 10) accessibility += 10;
    else if (commercialDensity > 5) accessibility += 5;
    else if (commercialDensity === 0) accessibility -= 8;

    // Very high total amenity density = bustling area, slightly less clean
    if (density.totalAmenities > 25) cleanliness -= 5;

    // Landmarks/tourism = well-maintained area
    if (density.landmarks > 0) {
      cleanliness += 4;
      safetyScore += 3;
    }
  }

  // Clamp to 0-100
  safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)));
  cleanliness = Math.max(0, Math.min(100, Math.round(cleanliness)));
  accessibility = Math.max(0, Math.min(100, Math.round(accessibility)));

  return { safetyScore, cleanliness, accessibility };
}

export function inferAffordability(category: string, type: string, name: string): 1 | 2 | 3 | 4 {
  const combined = (category + ' ' + type + ' ' + name).toLowerCase();
  if (/luxury|5.star|premium|boutique|fine.dining|resort/.test(combined)) return 4;
  if (/hotel|mall|restaurant|cafe|cinema|spa/.test(combined)) return 3;
  if (/shop|market|fast.food|takeaway|bakery/.test(combined)) return 2;
  return 1;
}

export function inferDescription(name: string, category: string, type: string, scores: DynamicScores): string {
  const safetyLabel =
    scores.safetyScore >= 75 ? 'high safety' :
    scores.safetyScore >= 55 ? 'moderate safety' : 'lower safety';
  const cleanLabel =
    scores.cleanliness >= 75 ? 'well-maintained' :
    scores.cleanliness >= 55 ? 'moderately clean' : 'needs attention';

  const typeStr = type.replace(/_/g, ' ');
  return `${name} is a ${typeStr} area with ${safetyLabel} and a ${cleanLabel} environment. Scores are dynamically calculated from location data, place type, time of day, and surrounding density.`;
}

// ─── Full explore pipeline: reverse geocode + density + scores ───

export async function exploreLocation(lat: number, lng: number): Promise<ExploredLocation> {
  // Fire both requests in parallel
  const [geocodeResult, density] = await Promise.all([
    reverseGeocode(lat, lng),
    fetchAreaDensity(lat, lng, 500),
  ]);

  const name = geocodeResult?.name ?? 'Dropped Pin';
  const category = geocodeResult?.category ?? 'place';
  const type = geocodeResult?.type ?? 'unknown';
  const address = geocodeResult?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const scores = generateDynamicScores(lat, lng, category, type, density);
  const affordability = inferAffordability(category, type, name);
  const description = inferDescription(name, category, type, scores);

  return {
    id: `explore-${Date.now()}-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`,
    lat,
    lng,
    name,
    category,
    address,
    safetyScore: scores.safetyScore,
    cleanliness: scores.cleanliness,
    accessibility: scores.accessibility,
    affordability,
    description,
    source: geocodeResult ? 'osm' : 'dynamic',
  };
}

// ─── POI type classification (reused from poiService) ───

export function classifyPlaceType(category: string, type: string): PoiTypeId | null {
  const combined = (category + ' ' + type).toLowerCase();
  if (/hospital|clinic|health|doctors|pharmacy|dentist/.test(combined)) return 'hospital';
  if (/restaurant|cafe|food|bar|pub|fast_food/.test(combined)) return 'restaurant';
  if (/shop|store|mall|supermarket|retail/.test(combined)) return 'shop';
  if (/tourism|historic|attraction|monument|museum|park|leisure/.test(combined)) return 'landmark';
  return null;
}
