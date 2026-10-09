import type { PoiTypeId, PoiPlace } from '@/types';

export const POI_CATEGORIES: { id: PoiTypeId; label: string; color: string; icon: string }[] = [
  { id: 'hospital', label: 'Hospitals', color: '#dc2626', icon: 'HeartPulse' },
  { id: 'restaurant', label: 'Restaurants', color: '#ea580c', icon: 'Utensils' },
  { id: 'shop', label: 'Shops', color: '#7c3aed', icon: 'ShoppingBag' },
  { id: 'landmark', label: 'Landmarks', color: '#0d9488', icon: 'Building2' },
];

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildQuery(lat: number, lng: number, radius: number): string {
  return `[out:json][timeout:12];
(
  node["amenity"~"hospital|clinic|doctors"](around:${radius},${lat},${lng});
  way["amenity"~"hospital|clinic|doctors"](around:${radius},${lat},${lng});
  node["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${radius},${lat},${lng});
  way["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  node["tourism"~"attraction|museum|artwork|gallery"](around:${radius},${lat},${lng});
  way["tourism"~"attraction|museum|artwork|gallery"](around:${radius},${lat},${lng});
  node["historic"](around:${radius},${lat},${lng});
  way["historic"](around:${radius},${lat},${lng});
);
out center 80;`;
}

function classifyPoi(tags: Record<string, string>): PoiTypeId | null {
  const amenity = tags.amenity ?? '';
  const shop = tags.shop;
  const tourism = tags.tourism;
  const historic = tags.historic;

  if (/hospital|clinic|doctors|dentist|pharmacy/.test(amenity)) return 'hospital';
  if (/restaurant|cafe|fast_food|bar|pub|food_court/.test(amenity)) return 'restaurant';
  if (shop) return 'shop';
  if (tourism || historic) return 'landmark';
  return null;
}

function getPlaceName(tags: Record<string, string>): string {
  return (
    tags.name ||
    tags['name:en'] ||
    tags.brand ||
    tags.operator ||
    tags.amenity?.replace(/_/g, ' ') ||
    tags.shop?.replace(/_/g, ' ') ||
    tags.tourism?.replace(/_/g, ' ') ||
    'Unnamed Place'
  );
}

function getCategoryLabel(tags: Record<string, string>): string {
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.shop) return tags.shop.replace(/_/g, ' ');
  if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
  if (tags.historic) return tags.historic.replace(/_/g, ' ');
  return 'place';
}

function getAddress(tags: Record<string, string>): string | undefined {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export async function fetchNearbyPois(
  lat: number,
  lng: number,
  radius: number = 1500,
): Promise<PoiPlace[]> {
  const query = buildQuery(lat, lng, radius);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const elements: OverpassElement[] = data.elements ?? [];

      const places: PoiPlace[] = [];
      for (const el of elements) {
        const tags = el.tags ?? {};
        const type = classifyPoi(tags);
        if (!type) continue;
        const elat = el.lat ?? el.center?.lat;
        const elng = el.lon ?? el.center?.lon;
        if (elat == null || elng == null) continue;

        places.push({
          id: `osm-${el.id}`,
          lat: elat,
          lng: elng,
          type,
          name: getPlaceName(tags),
          category: getCategoryLabel(tags),
          address: getAddress(tags),
        });
      }

      // Deduplicate by name+coords and limit
      const seen = new Set<string>();
      const unique = places.filter((p) => {
        const key = `${p.name}@${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return unique.slice(0, 60);
    } catch {
      // Try next endpoint
    }
  }

  // All endpoints failed — return mock fallback data
  return mockPoiFallback(lat, lng);
}

function mockPoiFallback(lat: number, lng: number): PoiPlace[] {
  const offsets = [
    { dlat: 0.008, dlng: 0.003, type: 'hospital' as PoiTypeId, name: 'City General Hospital', category: 'hospital' },
    { dlat: -0.005, dlng: 0.007, type: 'hospital' as PoiTypeId, name: 'Riverside Clinic', category: 'clinic' },
    { dlat: 0.004, dlng: -0.006, type: 'hospital' as PoiTypeId, name: 'Community Health Center', category: 'doctors' },
    { dlat: 0.003, dlng: 0.005, type: 'restaurant' as PoiTypeId, name: 'The Garden Bistro', category: 'restaurant' },
    { dlat: -0.007, dlng: -0.003, type: 'restaurant' as PoiTypeId, name: 'Sakura Sushi Bar', category: 'restaurant' },
    { dlat: 0.006, dlng: 0.001, type: 'restaurant' as PoiTypeId, name: 'Morning Brew Cafe', category: 'cafe' },
    { dlat: -0.003, dlng: 0.009, type: 'restaurant' as PoiTypeId, name: 'Pizzeria Bella', category: 'restaurant' },
    { dlat: 0.001, dlng: -0.008, type: 'restaurant' as PoiTypeId, name: 'Street Food Corner', category: 'fast_food' },
    { dlat: -0.006, dlng: 0.004, type: 'shop' as PoiTypeId, name: 'Central Bookstore', category: 'books' },
    { dlat: 0.007, dlng: -0.002, type: 'shop' as PoiTypeId, name: 'Fashion Outlet', category: 'clothes' },
    { dlat: -0.002, dlng: -0.007, type: 'shop' as PoiTypeId, name: 'Mini Mart Express', category: 'convenience' },
    { dlat: 0.009, dlng: 0.006, type: 'shop' as PoiTypeId, name: 'Tech Gadgets Store', category: 'electronics' },
    { dlat: -0.009, dlng: 0.001, type: 'landmark' as PoiTypeId, name: 'Historic City Clock Tower', category: 'attraction' },
    { dlat: 0.002, dlng: 0.011, type: 'landmark' as PoiTypeId, name: 'City Art Museum', category: 'museum' },
    { dlat: -0.004, dlng: -0.010, type: 'landmark' as PoiTypeId, name: 'Old Town Monument', category: 'monument' },
    { dlat: 0.011, dlng: -0.004, type: 'landmark' as PoiTypeId, name: 'Heritage Gallery', category: 'gallery' },
  ];

  return offsets.map((o, i) => ({
    id: `mock-poi-${i}`,
    lat: lat + o.dlat,
    lng: lng + o.dlng,
    type: o.type,
    name: o.name,
    category: o.category,
  }));
}
