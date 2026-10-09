export type CategoryId =
  | 'hospitality'
  | 'culture'
  | 'safety'
  | 'traffic';

export type SubTypeId =
  // Hospitality
  | 'hotel'
  | 'food'
  | 'budget'
  // Culture
  | 'landmark'
  | 'heritage'
  | 'tradition'
  // Safety
  | 'unsafe'
  | 'accident'
  | 'poorlight'
  // Traffic & Weather
  | 'congestion'
  | 'rain'
  | 'flood';

export interface SubType {
  id: SubTypeId;
  label: string;
  icon: string; // lucide icon name
}

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  subtypes: SubType[];
}

export interface Review {
  author: string;
  rating: number; // 1-5
  date: string;
  text: string;
}

export interface CityMarker {
  id: string;
  lat: number;
  lng: number;
  category: CategoryId;
  subtype: SubTypeId;
  name: string;
  description: string;
  safetyScore?: number; // 0-100
  cleanliness?: number; // 0-100
  affordability?: 1 | 2 | 3 | 4; // $ to $$$$
  accessibility?: number; // 0-5
  reviews?: Review[];
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'resolved';
  reportedAt?: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  safetyScore: number;
  cleanliness: number;
  affordability: 1 | 2 | 3 | 4;
  accessibility: number; // 0-5
  reviews: Review[];
}

export interface CityDefinition {
  id: string;
  name: string;
  country: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
  markers: CityMarker[];
  neighborhoods: Neighborhood[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  route?: RouteSuggestion[];
}

export interface RouteSuggestion {
  step: string;
  safetyNote: string;
  safetyScore: number;
  duration: string;
}

export interface ReportSubmission {
  type: 'voice' | 'photo' | 'text';
  text: string;
  photoDataUrl?: string;
  lat: number;
  lng: number;
}

export interface ProcessedReport {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: CategoryId;
  subtype: SubTypeId;
  name: string;
  description: string;
}

// ─── Live POI data (fetched from Overpass / OpenStreetMap) ───

export type PoiTypeId = 'hospital' | 'restaurant' | 'shop' | 'landmark';

export interface PoiCategoryDef {
  id: PoiTypeId;
  label: string;
  color: string;
  icon: string;
}

export interface PoiPlace {
  id: string;
  lat: number;
  lng: number;
  type: PoiTypeId;
  name: string;
  category?: string; // OSM amenity/shop tag
  address?: string;
}

// ─── Explored location (from click-to-explore or live search) ───

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
