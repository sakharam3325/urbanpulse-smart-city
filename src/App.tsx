import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  CategoryId,
  SubTypeId,
  CityMarker,
  ReportSubmission,
  ProcessedReport,
  CityDefinition,
  PoiTypeId,
  PoiPlace,
  ExploredLocation,
} from '@/types';
import { CITIES } from '@/data/mockData';
import { CATEGORIES } from '@/data/categories';
import { fetchNearbyPois, POI_CATEGORIES } from '@/data/poiService';
import { exploreLocation } from '@/data/locationService';
import CityMap from '@/components/CityMap';
import HeaderBar from '@/components/HeaderBar';
import LayerSidebar from '@/components/LayerSidebar';
import ComparisonModal from '@/components/ComparisonModal';
import ReportModal from '@/components/ReportModal';
import AIAssistant from '@/components/AIAssistant';
import SearchBar from '@/components/SearchBar';
import { PanelLeftClose, PanelLeftOpen, Sparkles, LocateFixed, Loader2 } from 'lucide-react';

let userMarkerCounter = 0;

export default function App() {
  const [currentCity, setCurrentCity] = useState<CityDefinition>(CITIES[0]);
  const [allMarkers, setAllMarkers] = useState<CityMarker[]>(
    CITIES[0].markers,
  );
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id)),
  );
  const [activeSubtypes, setActiveSubtypes] = useState<Set<SubTypeId>>(
    new Set(
      CATEGORIES.flatMap((c) => c.subtypes).map((s) => s.id),
    ),
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; label?: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pois, setPois] = useState<PoiPlace[]>([]);
  const [activePoiTypes, setActivePoiTypes] = useState<Set<PoiTypeId>>(
    new Set(POI_CATEGORIES.map((c) => c.id)),
  );
  const [poiLoading, setPoiLoading] = useState(false);
  const poiFetchKey = useRef('');
  const [darkMode, setDarkMode] = useState(false);
  const [explorePin, setExplorePin] = useState<{ lat: number; lng: number } | null>(null);
  const [exploredLocation, setExploredLocation] = useState<ExploredLocation | null>(null);
  const [exploring, setExploring] = useState(false);
  const [exploredLocations, setExploredLocations] = useState<ExploredLocation[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setExplorePin({ lat, lng });
    setExploredLocation(null);
    setExploring(true);
    try {
      const result = await exploreLocation(lat, lng);
      setExploredLocation(result);
    } catch {
      setToast('Could not fetch data for this location');
      setTimeout(() => setToast(null), 3500);
    } finally {
      setExploring(false);
    }
  }, []);

  const handleAddToComparison = useCallback((location: ExploredLocation) => {
    setExploredLocations((prev) => {
      if (prev.some((p) => p.id === location.id)) return prev;
      return [...prev, location];
    });
    setToast(`${location.name} added to Comparison Tool`);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleLocate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      setToast('Geolocation not supported — using default city center');
      setFlyTo({ lat: currentCity.centerLat, lng: currentCity.centerLng, zoom: 14 });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 15 });
        setLocating(false);
        setToast('Location found — centered on your position');
        setTimeout(() => setToast(null), 3500);
        loadPois(loc.lat, loc.lng, 'your location');
      },
      () => {
        setUserLocation(null);
        setFlyTo({ lat: currentCity.centerLat, lng: currentCity.centerLng, zoom: 14 });
        setLocating(false);
        setToast('Location access denied — using default city center');
        setTimeout(() => setToast(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const handleCityChange = (city: CityDefinition) => {
    setCurrentCity(city);
    setAllMarkers(city.markers);
    setPois([]);
  };

  const loadPois = useCallback(
    async (lat: number, lng: number, label?: string) => {
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (key === poiFetchKey.current) return;
      poiFetchKey.current = key;
      setPoiLoading(true);
      try {
        const results = await fetchNearbyPois(lat, lng, 1500);
        setPois(results);
        setToast(
          `Found ${results.length} live places nearby${label ? ' near ' + label : ''}`,
        );
        setTimeout(() => setToast(null), 3500);
      } catch {
        setToast('Could not fetch live places — showing fallback data');
        setTimeout(() => setToast(null), 3500);
      } finally {
        setPoiLoading(false);
      }
    },
    [],
  );

  // Auto-fetch POIs when city changes
  useEffect(() => {
    loadPois(currentCity.centerLat, currentCity.centerLng, currentCity.name);
  }, [currentCity, loadPois]);

  const togglePoiType = useCallback((id: PoiTypeId) => {
    setActivePoiTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((id: CategoryId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Also disable all subtypes of this category
        const cat = CATEGORIES.find((c) => c.id === id)!;
        setActiveSubtypes((subPrev) => {
          const subNext = new Set(subPrev);
          cat.subtypes.forEach((s) => subNext.delete(s.id));
          return subNext;
        });
      } else {
        next.add(id);
        // Re-enable all subtypes of this category
        const cat = CATEGORIES.find((c) => c.id === id)!;
        setActiveSubtypes((subPrev) => {
          const subNext = new Set(subPrev);
          cat.subtypes.forEach((s) => subNext.add(s.id));
          return subNext;
        });
      }
      return next;
    });
  }, []);

  const toggleSubtype = useCallback((id: SubTypeId) => {
    setActiveSubtypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter markers based on active layers
  const visibleMarkers = useMemo(() => {
    return allMarkers.filter(
      (m) =>
        activeCategories.has(m.category) && activeSubtypes.has(m.subtype),
    );
  }, [allMarkers, activeCategories, activeSubtypes]);

  // Count markers per category (from all markers, not just visible)
  const markerCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {} as Record<CategoryId, number>;
    for (const cat of CATEGORIES) {
      counts[cat.id] = allMarkers.filter((m) => m.category === cat.id).length;
    }
    return counts;
  }, [allMarkers]);

  // Count POIs per type
  const poiCounts = useMemo(() => {
    const counts: Record<PoiTypeId, number> = {} as Record<PoiTypeId, number>;
    for (const cat of POI_CATEGORIES) {
      counts[cat.id] = pois.filter((p) => p.type === cat.id).length;
    }
    return counts;
  }, [pois]);

  const handleReportSubmit = (
    submission: ReportSubmission,
    processed: ProcessedReport,
  ) => {
    const newMarker: CityMarker = {
      id: `user-${++userMarkerCounter}`,
      lat: submission.lat,
      lng: submission.lng,
      category: processed.category,
      subtype: processed.subtype,
      name: processed.name,
      description: processed.description,
      urgency: processed.urgency,
      status: 'active',
      reportedAt: new Date().toISOString().split('T')[0],
      reviews: [
        {
          author: 'Citizen Report',
          rating: processed.urgency === 'critical' || processed.urgency === 'high' ? 1 : 3,
          date: new Date().toISOString().split('T')[0],
          text: submission.text || 'Submitted via citizen report',
        },
      ],
    };

    setAllMarkers((prev) => [...prev, newMarker]);

    // Ensure the category/subtype is visible
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.add(processed.category);
      return next;
    });
    setActiveSubtypes((prev) => {
      const next = new Set(prev);
      next.add(processed.subtype);
      return next;
    });

    setToast('Report added to map successfully');
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <HeaderBar
        cities={CITIES}
        currentCity={currentCity}
        onCityChange={handleCityChange}
        onOpenComparison={() => setComparisonOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onToggleAssistant={() => setAssistantOpen(!assistantOpen)}
        assistantOpen={assistantOpen}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Layer sidebar */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 border-r border-gray-200 dark:border-slate-700 z-[500] hidden sm:block">
            <LayerSidebar
              activeCategories={activeCategories}
              activeSubtypes={activeSubtypes}
              onToggleCategory={toggleCategory}
              onToggleSubtype={toggleSubtype}
              markerCounts={markerCounts}
              activePoiTypes={activePoiTypes}
              onTogglePoiType={togglePoiType}
              poiCounts={poiCounts}
              poiLoading={poiLoading}
              onRefreshPois={() => loadPois(currentCity.centerLat, currentCity.centerLng, currentCity.name)}
            />
          </aside>
        )}

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-2 z-[600] p-1.5 rounded-r-lg bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-r border-t border-b border-gray-200 dark:border-slate-600 hidden sm:flex"
          style={{ left: sidebarOpen ? '288px' : '0px' }}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeftOpen size={18} />
          )}
        </button>

        {/* Map */}
        <main className="flex-1 relative">
          <SearchBar
            markers={allMarkers}
            neighborhoods={currentCity.neighborhoods}
            cityName={currentCity.name}
            cityCenter={{ lat: currentCity.centerLat, lng: currentCity.centerLng }}
            onResultClick={(lat, lng, label) => {
              setFlyTo({ lat, lng, zoom: 16, label });
              setToast(`Centered on ${label}`);
              setTimeout(() => setToast(null), 2500);
            }}
          />
          <CityMap
            city={currentCity}
            markers={visibleMarkers}
            flyTo={flyTo}
            onFlyComplete={() => setFlyTo(null)}
            userLocation={userLocation}
            pois={pois}
            activePoiTypes={activePoiTypes}
            explorePin={explorePin}
            exploredLocation={exploredLocation}
            exploring={exploring}
            onMapClick={handleMapClick}
            onAddToComparison={handleAddToComparison}
          />

          {/* Locate Me button */}
          <button
            onClick={handleLocate}
            disabled={locating}
            className="absolute top-3 right-3 z-[500] flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-cyan-300 transition-colors disabled:opacity-60"
          >
            {locating ? (
              <Loader2 size={16} className="animate-spin text-cyan-500" />
            ) : (
              <LocateFixed size={16} className="text-cyan-500" />
            )}
            <span className="hidden sm:inline">{locating ? 'Locating...' : 'Locate Me'}</span>
          </button>

          {/* Stats overlay */}
          <div className="absolute bottom-4 left-4 z-[500] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 space-y-1.5 pointer-events-none">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {visibleMarkers.length} markers
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {pois.filter((p) => activePoiTypes.has(p.type)).length} live places
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {currentCity.name}
              </span>
            </div>
          </div>
        </main>

        {/* AI Assistant panel */}
        {assistantOpen && (
          <aside className="w-full sm:w-96 shrink-0 border-l border-gray-200 dark:border-slate-700 z-[500] absolute sm:relative right-0 top-0 bottom-0 sm:bottom-auto">
            <AIAssistant
              cityName={currentCity.name}
              onClose={() => setAssistantOpen(false)}
            />
          </aside>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] animate-fadeIn">
          <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700">
            <Sparkles size={18} className="text-cyan-400" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {comparisonOpen && (
        <ComparisonModal
          neighborhoods={currentCity.neighborhoods}
          exploredLocations={exploredLocations}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {reportOpen && (
        <ReportModal
          cityCenter={{
            lat: currentCity.centerLat,
            lng: currentCity.centerLng,
          }}
          onClose={() => setReportOpen(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
