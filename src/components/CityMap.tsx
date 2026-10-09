import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import type { CityMarker, CityDefinition, PoiPlace, PoiTypeId, ExploredLocation } from '@/types';
import { getCategory } from '@/data/categories';
import { POI_CATEGORIES } from '@/data/poiService';
import { getIcon } from '@/lib/iconMap';
import { affordabilityLabel, affordabilityLabelFull, getSubtypeLabel } from '@/data/categories';
import { Map as MapIcon, Satellite, Layers, Loader2, Shield, Sparkles, Accessibility, MapPin, Plus } from 'lucide-react';

type TileMode = 'standard' | 'satellite' | 'hybrid';

const GOOGLE_TILE_MODES: Record<TileMode, { url: string; label: string; icon: typeof MapIcon }> = {
  standard: {
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    label: 'Standard',
    icon: MapIcon,
  },
  satellite: {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    label: 'Satellite',
    icon: Satellite,
  },
  hybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    label: 'Hybrid',
    icon: Layers,
  },
};

const GOOGLE_ATTRIBUTION = 'Map data © Google';

// ─── Pin color mapping (Google-Maps-style) ───
const PIN_COLORS: Record<string, string> = {
  hospitality: '#f97316',
  culture: '#22c55e',
  safety: '#ef4444',
  traffic: '#3b82f6',
};

const POI_PIN_COLORS: Record<PoiTypeId, string> = {
  hospital: '#dc2626',
  restaurant: '#f97316',
  shop: '#8b5cf6',
  landmark: '#22c55e',
};

function getMarkerGlyph(subtype: string): string {
  const glyphs: Record<string, string> = {
    hotel: '🏨',
    food: '🍜',
    budget: '💎',
    landmark: '🏛',
    heritage: '🏛',
    tradition: '🏮',
    unsafe: '⚠',
    accident: '🚑',
    poorlight: '🌙',
    congestion: '🚗',
    rain: '🌧',
    flood: '🌊',
  };
  return glyphs[subtype] ?? '📍';
}

function getPoiGlyph(type: PoiTypeId): string {
  const glyphs: Record<PoiTypeId, string> = {
    hospital: '✚',
    restaurant: '🍴',
    shop: '🛍',
    landmark: '🏛',
  };
  return glyphs[type] ?? '📍';
}

function createDivIcon(marker: CityMarker): L.DivIcon {
  const cat = getCategory(marker.category)!;
  const pinColor = PIN_COLORS[marker.category] ?? cat.color;

  const urgencyRing =
    marker.urgency === 'critical'
      ? 'ring-4 ring-red-500 animate-pulse'
      : marker.urgency === 'high'
        ? 'ring-2 ring-red-400'
        : marker.urgency === 'medium'
          ? 'ring-2 ring-amber-400'
          : '';

  return L.divIcon({
    className: 'urbanpulse-marker',
    html: `<div class="relative ${urgencyRing}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.16 24.84 0 16 0z" fill="${pinColor}"/>
        <circle cx="16" cy="16" r="11" fill="white"/>
      </svg>
      <span style="position:absolute;top:5px;left:0;width:32px;text-align:center;font-size:14px;line-height:1;pointer-events:none;">${getMarkerGlyph(marker.subtype)}</span>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

function createPoiIcon(place: PoiPlace): L.DivIcon {
  const pinColor = POI_PIN_COLORS[place.type] ?? '#64748b';
  return L.divIcon({
    className: 'urbanpulse-marker',
    html: `<div style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));">
      <svg width="26" height="34" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.16 24.84 0 16 0z" fill="${pinColor}"/>
        <circle cx="16" cy="16" r="9" fill="white"/>
      </svg>
      <span style="position:absolute;top:3px;left:0;width:26px;text-align:center;font-size:12px;line-height:1;pointer-events:none;">${getPoiGlyph(place.type)}</span>
    </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

const explorePinIcon = L.divIcon({
  className: 'urbanpulse-marker',
  html: `<div style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">
    <svg width="34" height="44" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.16 24.84 0 16 0z" fill="#0891b2"/>
      <circle cx="16" cy="16" r="12" fill="white"/>
    </svg>
    <span style="position:absolute;top:4px;left:0;width:32px;text-align:center;font-size:16px;line-height:1;pointer-events:none;">📍</span>
  </div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
});

interface MapControllerProps {
  city: CityDefinition;
  flyTo?: { lat: number; lng: number; zoom?: number; label?: string } | null;
  onFlyComplete?: () => void;
}

function MapController({ city, flyTo, onFlyComplete }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([city.centerLat, city.centerLng], city.zoom, { duration: 1.2 });
  }, [map, city]);
  useEffect(() => {
    if (!flyTo) return;
    const zoom = flyTo.zoom ?? 15;
    map.flyTo([flyTo.lat, flyTo.lng], zoom, { duration: 1.5 });
    const handler = () => {
      onFlyComplete?.();
      map.off('moveend', handler);
    };
    map.on('moveend', handler);
    return () => {
      map.off('moveend', handler);
    };
  }, [map, flyTo]);
  return null;
}

// ─── Click handler component ───
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface CityMapProps {
  city: CityDefinition;
  markers: CityMarker[];
  onMarkerClick?: (marker: CityMarker) => void;
  flyTo?: { lat: number; lng: number; zoom?: number; label?: string } | null;
  onFlyComplete?: () => void;
  userLocation?: { lat: number; lng: number } | null;
  pois?: PoiPlace[];
  activePoiTypes?: Set<PoiTypeId>;
  explorePin?: { lat: number; lng: number } | null;
  exploredLocation?: ExploredLocation | null;
  exploring: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onAddToComparison: (location: ExploredLocation) => void;
}

const userLocationIcon = L.divIcon({
  className: 'urbanpulse-marker',
  html: `<div class="relative flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg">
    <span class="w-2 h-2 rounded-full bg-white"></span>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function CityMap({
  city,
  markers,
  onMarkerClick,
  flyTo,
  onFlyComplete,
  userLocation,
  pois,
  activePoiTypes,
  explorePin,
  exploredLocation,
  exploring,
  onMapClick,
  onAddToComparison,
}: CityMapProps) {
  const [tileMode, setTileMode] = useState<TileMode>('standard');
  const activeTiles = GOOGLE_TILE_MODES[tileMode];

  return (
    <MapContainer
      center={[city.centerLat, city.centerLng]}
      zoom={city.zoom}
      className="h-full w-full"
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution={GOOGLE_ATTRIBUTION}
        url={activeTiles.url}
        maxZoom={20}
      />
      <MapController city={city} flyTo={flyTo} onFlyComplete={onFlyComplete} />
      <MapClickHandler onMapClick={onMapClick} />

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup>
              <div className="text-sm font-semibold text-slate-800">You are here</div>
            </Popup>
          </Marker>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={150}
            pathOptions={{ color: '#06b6d4', weight: 1, opacity: 0.4, fillColor: '#06b6d4', fillOpacity: 0.12 }}
          />
        </>
      )}

      {markers.map((marker) => {
        const cat = getCategory(marker.category)!;
        const sub = cat.subtypes.find((s) => s.id === marker.subtype)!;
        const Icon = getIcon(sub.icon);
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createDivIcon(marker)}
            eventHandlers={{
              click: () => onMarkerClick?.(marker),
            }}
          >
            <Popup maxWidth={300} minWidth={250}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                    style={{ background: cat.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    {getSubtypeLabel(marker.category, marker.subtype)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {marker.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {marker.description}
                </p>

                {marker.urgency && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${
                        marker.urgency === 'critical'
                          ? 'bg-red-600'
                          : marker.urgency === 'high'
                            ? 'bg-red-500'
                            : marker.urgency === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                      }`}
                    >
                      Urgency: {marker.urgency.toUpperCase()}
                    </span>
                    {marker.status === 'active' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Active
                      </span>
                    )}
                  </div>
                )}

                {marker.safetyScore !== undefined && (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {marker.safetyScore !== undefined && (
                      <Metric label="Safety" value={`${marker.safetyScore}/100`} />
                    )}
                    {marker.cleanliness !== undefined && (
                      <Metric label="Cleanliness" value={`${marker.cleanliness}/100`} />
                    )}
                    {marker.affordability !== undefined && (
                      <Metric
                        label="Price"
                        value={affordabilityLabel(marker.affordability)}
                      />
                    )}
                    {marker.accessibility !== undefined && (
                      <Metric label="Access" value={`${marker.accessibility}/5`} />
                    )}
                  </div>
                )}

                {marker.reviews && marker.reviews.length > 0 && (
                  <div className="border-t border-gray-200 pt-2 space-y-1.5 max-h-32 overflow-y-auto">
                    {marker.reviews.slice(0, 2).map((rev, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">
                            {rev.author}
                          </span>
                          <span className="text-amber-500">
                            {'★'.repeat(rev.rating)}
                            <span className="text-gray-300">
                              {'★'.repeat(5 - rev.rating)}
                            </span>
                          </span>
                        </div>
                        <p className="text-gray-500 leading-snug">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Live POI markers from Overpass/OSM */}
      {pois?.map((place) => {
        if (activePoiTypes && !activePoiTypes.has(place.type)) return null;
        const cat = POI_CATEGORIES.find((c) => c.id === place.type)!;
        const Icon = getIcon(cat.icon);
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={createPoiIcon(place)}
          >
            <Popup maxWidth={280} minWidth={220}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                    style={{ background: cat.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-xs font-semibold text-gray-500 capitalize">
                    {place.category}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm leading-tight">
                  {place.name}
                </h3>
                {place.address && (
                  <p className="text-xs text-gray-500">{place.address}</p>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-600 font-medium bg-cyan-50 rounded-lg px-2 py-1">
                  <Icon size={10} />
                  Live data from OpenStreetMap
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Explore pin (click-to-explore) */}
      {explorePin && (
        <Marker
          position={[explorePin.lat, explorePin.lng]}
          icon={explorePinIcon}
        >
          <Popup maxWidth={300} minWidth={260} autoOpen>
            {exploring ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 size={20} className="animate-spin text-cyan-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Exploring location...</p>
                  <p className="text-xs text-gray-500">Fetching live data & calculating scores</p>
                </div>
              </div>
            ) : exploredLocation ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-white">
                    <MapPin size={14} />
                  </span>
                  <span className="text-xs font-semibold text-cyan-600 capitalize">
                    {exploredLocation.source === 'osm' ? 'Live OSM Data' : 'Dynamic Estimate'} · {exploredLocation.category}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {exploredLocation.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {exploredLocation.address}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {exploredLocation.description}
                </p>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <ExploreMetric icon={<Shield size={11} />} label="Safety" value={exploredLocation.safetyScore} color="text-emerald-600" />
                  <ExploreMetric icon={<Sparkles size={11} />} label="Clean" value={exploredLocation.cleanliness} color="text-cyan-600" />
                  <ExploreMetric icon={<Accessibility size={11} />} label="Access" value={exploredLocation.accessibility} color="text-blue-600" />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Affordability:</span>
                  <span className="font-bold text-amber-600">
                    {affordabilityLabel(exploredLocation.affordability)}{' '}
                    <span className="text-gray-400 font-normal">
                      {affordabilityLabelFull(exploredLocation.affordability)}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => onAddToComparison(exploredLocation)}
                  className="flex items-center justify-center gap-1.5 w-full mt-1 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-colors"
                >
                  <Plus size={14} />
                  Add to Comparison
                </button>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm text-gray-500">No data available for this point.</p>
              </div>
            )}
          </Popup>
        </Marker>
      )}

      {/* Tile layer toggle */}
      <div
        className="leaflet-top leaflet-right"
        style={{ pointerEvents: 'none' }}
      >
        <div className="leaflet-control" style={{ pointerEvents: 'auto', marginTop: '56px' }}>
          <div className="flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 p-1">
            {(Object.keys(GOOGLE_TILE_MODES) as TileMode[]).map((mode) => {
              const cfg = GOOGLE_TILE_MODES[mode];
              const TileIcon = cfg.icon;
              return (
                <button
                  key={mode}
                  onClick={() => setTileMode(mode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    tileMode === mode
                      ? 'bg-slate-800 dark:bg-cyan-500 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <TileIcon size={13} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </MapContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function ExploreMetric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded px-1.5 py-1.5 text-center">
      <div className={`flex items-center justify-center gap-0.5 ${color}`}>
        {icon}
      </div>
      <div className="font-bold text-slate-800 text-sm mt-0.5">{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}

// re-export for convenience
export { affordabilityLabel, affordabilityLabelFull };
