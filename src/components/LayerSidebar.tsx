import { CATEGORIES } from '@/data/categories';
import { POI_CATEGORIES } from '@/data/poiService';
import type { CategoryId, SubTypeId, PoiTypeId } from '@/types';
import { getIcon } from '@/lib/iconMap';
import { ChevronDown, Layers, Radio } from 'lucide-react';
import { useState } from 'react';

interface LayerSidebarProps {
  activeCategories: Set<CategoryId>;
  activeSubtypes: Set<SubTypeId>;
  onToggleCategory: (id: CategoryId) => void;
  onToggleSubtype: (id: SubTypeId) => void;
  markerCounts: Record<CategoryId, number>;
  activePoiTypes: Set<PoiTypeId>;
  onTogglePoiType: (id: PoiTypeId) => void;
  poiCounts: Record<PoiTypeId, number>;
  poiLoading: boolean;
  onRefreshPois: () => void;
}

export default function LayerSidebar({
  activeCategories,
  activeSubtypes,
  onToggleCategory,
  onToggleSubtype,
  markerCounts,
  activePoiTypes,
  onTogglePoiType,
  poiCounts,
  poiLoading,
  onRefreshPois,
}: LayerSidebarProps) {
  const [expanded, setExpanded] = useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id)),
  );
  const [poiExpanded, setPoiExpanded] = useState(true);

  const toggleExpand = (id: CategoryId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <Layers size={18} className="text-slate-600 dark:text-slate-300" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-wide uppercase">
          Map Layers
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {CATEGORIES.map((cat) => {
          const isOn = activeCategories.has(cat.id);
          const isOpen = expanded.has(cat.id);
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center">
                <button
                  onClick={() => toggleExpand(cat.id)}
                  className="flex items-center gap-2 flex-1 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className="text-gray-400 dark:text-slate-500 transition-transform"
                    style={{ transform: isOpen ? '' : 'rotate(-90deg)' }}
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 text-left">
                    {cat.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto bg-gray-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
                    {markerCounts[cat.id] ?? 0}
                  </span>
                </button>

                <button
                  onClick={() => onToggleCategory(cat.id)}
                  className={`relative w-10 h-6 rounded-full transition-colors mr-3 shrink-0 ${
                    isOn ? 'bg-slate-700 dark:bg-cyan-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                  aria-label={`Toggle ${cat.label}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isOn ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 space-y-1">
                  {cat.subtypes.map((sub) => {
                    const subOn = activeSubtypes.has(sub.id);
                    const Icon = getIcon(sub.icon);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onToggleSubtype(sub.id)}
                        className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          subOn
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                            : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-opacity"
                          style={{
                            background: cat.color,
                            opacity: subOn ? 1 : 0.35,
                          }}
                        >
                          <Icon size={12} className="text-white" />
                        </span>
                        <span className="font-medium text-left flex-1">
                          {sub.label}
                        </span>
                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            subOn
                              ? 'border-slate-600 dark:border-cyan-500 bg-slate-600 dark:bg-cyan-500'
                              : 'border-gray-300 dark:border-slate-600'
                          }`}
                        >
                          {subOn && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                            >
                              <path
                                d="M2 5l2 2 4-4"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live POI section */}
      <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-3 space-y-2">
        <button
          onClick={() => setPoiExpanded(!poiExpanded)}
          className="flex items-center gap-2 w-full"
        >
          <ChevronDown
            size={16}
            className="text-gray-400 dark:text-slate-500 transition-transform"
            style={{ transform: poiExpanded ? '' : 'rotate(-90deg)' }}
          />
          <Radio size={16} className={poiLoading ? 'text-cyan-500 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'} />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-left">
            Live Places
          </span>
          <span className="text-[10px] text-cyan-500 dark:text-cyan-400 font-medium ml-auto bg-cyan-50 dark:bg-cyan-950 rounded-full px-2 py-0.5">
            OSM
          </span>
        </button>

        {poiExpanded && (
          <div className="space-y-1">
            {POI_CATEGORIES.map((poiCat) => {
              const isOn = activePoiTypes.has(poiCat.id);
              const Icon = getIcon(poiCat.icon);
              return (
                <button
                  key={poiCat.id}
                  onClick={() => onTogglePoiType(poiCat.id)}
                  className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    isOn
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-opacity"
                    style={{
                      background: poiCat.color,
                      opacity: isOn ? 1 : 0.35,
                    }}
                  >
                    <Icon size={12} className="text-white" />
                  </span>
                  <span className="font-medium text-left flex-1">
                    {poiCat.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
                    {poiCounts[poiCat.id] ?? 0}
                  </span>
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isOn ? 'border-slate-600 dark:border-cyan-500 bg-slate-600 dark:bg-cyan-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                  >
                    {isOn && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}

            <button
              onClick={onRefreshPois}
              disabled={poiLoading}
              className="flex items-center justify-center gap-2 w-full mt-2 px-3 py-2 rounded-lg bg-cyan-50 dark:bg-cyan-950 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-700 dark:text-cyan-300 text-xs font-medium transition-colors disabled:opacity-60"
            >
              {poiLoading ? 'Fetching nearby places...' : 'Refresh Live Places'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
