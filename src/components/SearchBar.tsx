import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Navigation, Loader2, Globe } from 'lucide-react';
import type { CityMarker, Neighborhood } from '@/types';
import { getCategory, getSubtypeLabel } from '@/data/categories';
import { searchLocations, type NominatimResult } from '@/data/locationService';

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  color: string;
  source: 'local' | 'osm';
}

interface SearchBarProps {
  markers: CityMarker[];
  neighborhoods: Neighborhood[];
  cityName: string;
  cityCenter: { lat: number; lng: number };
  onResultClick: (lat: number, lng: number, label: string) => void;
}

export default function SearchBar({ markers, neighborhoods, cityName, cityCenter, onResultClick }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [osmResults, setOsmResults] = useState<NominatimResult[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build local search index from markers + neighborhoods
  const localIndex = useMemo<SearchResult[]>(() => {
    const markerResults: SearchResult[] = markers.map((m) => {
      const cat = getCategory(m.category)!;
      return {
        id: m.id,
        name: m.name,
        subtitle: getSubtypeLabel(m.category, m.subtype),
        lat: m.lat,
        lng: m.lng,
        color: cat.color,
        source: 'local',
      };
    });

    const neighborhoodResults: SearchResult[] = neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
      subtitle: 'Neighborhood',
      lat: n.lat,
      lng: n.lng,
      color: '#06b6d4',
      source: 'local',
    }));

    return [...neighborhoodResults, ...markerResults];
  }, [markers, neighborhoods]);

  // Local results
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const scored = localIndex
      .map((r) => {
        const name = r.name.toLowerCase();
        const sub = r.subtitle.toLowerCase();
        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (sub.includes(q)) score = 40;
        const qWords = q.split(/\s+/);
        for (const qw of qWords) {
          if (name.includes(qw)) score += 10;
          if (sub.includes(qw)) score += 5;
        }
        return { result: r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    return scored.map((x) => x.result);
  }, [query, localIndex]);

  // Debounced Nominatim search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setOsmResults([]);
      setOsmLoading(false);
      return;
    }
    setOsmLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchLocations(query, {
        lat: cityCenter.lat,
        lng: cityCenter.lng,
        radiusKm: 15,
      });
      setOsmResults(results);
      setOsmLoading(false);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, cityCenter.lat, cityCenter.lng]);

  // Merge local + OSM results
  const results = useMemo<SearchResult[]>(() => {
    const local = localResults;
    const remote: SearchResult[] = osmResults.map((r) => ({
      id: `osm-${r.placeId}`,
      name: r.name,
      subtitle: r.address?.split(',').slice(0, 2).join(',') || r.category,
      lat: r.lat,
      lng: r.lng,
      color: '#0891b2',
      source: 'osm',
    }));
    // Deduplicate by proximity (skip OSM results that are very close to a local result)
    const filtered = remote.filter((r) =>
      !local.some((l) => Math.abs(l.lat - r.lat) < 0.001 && Math.abs(l.lng - r.lng) < 0.001),
    );
    return [...local, ...filtered].slice(0, 8);
  }, [localResults, osmResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const selectResult = (r: SearchResult) => {
    onResultClick(r.lat, r.lng, r.name);
    setQuery(r.name);
    setFocused(false);
    setActiveIndex(-1);
  };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[700] w-[calc(100%-2rem)] max-w-md"
    >
      <div className={`flex items-center bg-white dark:bg-slate-800 rounded-full shadow-xl border transition-all ${showDropdown ? 'rounded-b-none border-b-0' : ''} border-gray-200 dark:border-slate-600`}>
        <div className="flex items-center justify-center w-10 h-10 shrink-0">
          <Search size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${cityName} — any place, street, landmark…`}
          className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-2.5"
        />
        {osmLoading && (
          <Loader2 size={16} className="text-cyan-500 animate-spin shrink-0 mr-1" />
        )}
        {query && !osmLoading && (
          <button
            onClick={() => {
              setQuery('');
              setFocused(false);
              setActiveIndex(-1);
              setOsmResults([]);
            }}
            className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        )}
        <div className="w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />
        <button
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          title="Search"
        >
          <Navigation size={16} className="text-cyan-500" />
        </button>
      </div>

      {showDropdown && (
        <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-xl border border-t-0 border-gray-200 dark:border-slate-600 overflow-hidden">
          {results.length > 0 ? (
            <ul className="py-1.5 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    onClick={() => selectResult(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                      activeIndex === i
                        ? 'bg-cyan-50 dark:bg-slate-700'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                      style={{ background: r.color + '22' }}
                    >
                      {r.source === 'osm' ? (
                        <Globe size={15} style={{ color: r.color }} />
                      ) : (
                        <MapPin size={15} style={{ color: r.color }} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {r.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                        {r.source === 'osm' && 'Live · '}
                        {r.subtitle}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : osmLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <Loader2 size={18} className="text-cyan-500 animate-spin" />
              <p className="text-sm text-gray-400 dark:text-slate-500">Searching live places…</p>
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">
                No results found for "{query}"
              </p>
              <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
                Try a different place name or street
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
