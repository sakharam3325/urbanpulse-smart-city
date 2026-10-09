import { useState } from 'react';
import type { Neighborhood, ExploredLocation } from '@/types';
import { affordabilityLabel, affordabilityLabelFull } from '@/data/categories';
import { X, Star, Shield, Sparkles, DollarSign, Accessibility, ArrowRightLeft, MapPin } from 'lucide-react';

// Unified comparison item — works for both neighborhoods and explored locations
interface CompareItem {
  id: string;
  name: string;
  description: string;
  safetyScore: number;
  cleanliness: number;
  accessibility: number;
  affordability: 1 | 2 | 3 | 4;
  reviews?: { author: string; rating: number; date: string; text: string }[];
  source: 'neighborhood' | 'explored';
  address?: string;
}

function neighborhoodToItem(n: Neighborhood): CompareItem {
  return {
    id: n.id,
    name: n.name,
    description: n.description,
    safetyScore: n.safetyScore,
    cleanliness: n.cleanliness,
    accessibility: n.accessibility,
    affordability: n.affordability,
    reviews: n.reviews,
    source: 'neighborhood',
  };
}

function exploredToItem(e: ExploredLocation): CompareItem {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    safetyScore: e.safetyScore,
    cleanliness: e.cleanliness,
    accessibility: e.accessibility,
    affordability: e.affordability,
    source: 'explored',
    address: e.address,
  };
}

interface ComparisonModalProps {
  neighborhoods: Neighborhood[];
  exploredLocations: ExploredLocation[];
  onClose: () => void;
}

export default function ComparisonModal({
  neighborhoods,
  exploredLocations,
  onClose,
}: ComparisonModalProps) {
  const allItems: CompareItem[] = [
    ...neighborhoods.map(neighborhoodToItem),
    ...exploredLocations.map(exploredToItem),
  ];

  const [leftId, setLeftId] = useState<string>(allItems[0]?.id ?? '');
  const [rightId, setRightId] = useState<string>(allItems[1]?.id ?? '');

  const left = allItems.find((n) => n.id === leftId);
  const right = allItems.find((n) => n.id === rightId);

  const swap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Location Comparison
            </h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">
              {allItems.length} locations available
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-700">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Location A
            </label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.source === 'explored' ? '📍 ' : ''}
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swap}
            className="mt-6 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-cyan-50 hover:border-cyan-300 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-cyan-600 transition-colors shrink-0"
            title="Swap"
          >
            <ArrowRightLeft size={16} />
          </button>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Location B
            </label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.source === 'explored' ? '📍 ' : ''}
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {left && right ? (
            <div className="grid grid-cols-2 gap-4">
              <ComparisonCard item={left} side="left" compareWith={right} />
              <ComparisonCard item={right} side="right" compareWith={left} />
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-slate-400 py-12">
              Select two locations to compare. Click anywhere on the map and "Add to Comparison" to include explored places.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({
  item,
  side,
  compareWith,
}: {
  item: CompareItem;
  side: 'left' | 'right';
  compareWith: CompareItem;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 space-y-3 ${
        side === 'left'
          ? 'border-cyan-200 bg-cyan-50/30 dark:border-cyan-800 dark:bg-cyan-950/30'
          : 'border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/30'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{item.name}</h3>
          {item.source === 'explored' && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 rounded-full px-1.5 py-0.5">
              <MapPin size={9} />
              Explored
            </span>
          )}
        </div>
        {item.address && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.address}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mt-1">
          {item.description}
        </p>
      </div>

      <ScoreBar
        label="Safety Score"
        icon={<Shield size={14} />}
        value={item.safetyScore}
        max={100}
        compareValue={compareWith.safetyScore}
        color="bg-emerald-500"
      />
      <ScoreBar
        label="Cleanliness"
        icon={<Sparkles size={14} />}
        value={item.cleanliness}
        max={100}
        compareValue={compareWith.cleanliness}
        color="bg-cyan-500"
      />
      <ScoreBar
        label="Accessibility"
        icon={<Accessibility size={14} />}
        value={item.accessibility}
        max={100}
        compareValue={compareWith.accessibility}
        color="bg-blue-500"
      />

      {/* Affordability */}
      <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
          <DollarSign size={14} className="text-amber-500" />
          <span>Affordability</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-amber-600 dark:text-amber-400 text-base">
            {affordabilityLabel(item.affordability)}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
            {affordabilityLabelFull(item.affordability)}
          </span>
        </div>
      </div>

      {/* Reviews (only for neighborhoods) */}
      {item.reviews && item.reviews.length > 0 && (
        <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Star size={12} className="text-amber-400" />
            User Reviews
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {item.reviews.map((rev, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {rev.author}
                  </span>
                  <span className="text-amber-400 text-xs">
                    {'★'.repeat(rev.rating)}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">
                    {rev.date}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-snug">{rev.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.source === 'explored' && !item.reviews && (
        <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-xs text-gray-400 dark:text-slate-500 italic">
            Scores are dynamically calculated from live OSM data, place type, time of day, and surrounding density.
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  icon,
  value,
  max,
  compareValue,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  compareValue: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  const comparePct = (compareValue / max) * 100;
  const isHigher = value > compareValue;
  const isLower = value < compareValue;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
          {icon}
          {label}
        </span>
        <span
          className={`font-bold text-sm ${
            isHigher
              ? 'text-emerald-600 dark:text-emerald-400'
              : isLower
                ? 'text-red-500 dark:text-red-400'
                : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {value}/{max}
          {isHigher && ' ▲'}
          {isLower && ' ▼'}
        </span>
      </div>
      <div className="relative h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`absolute h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-slate-500 opacity-60"
          style={{ left: `${comparePct}%` }}
        />
      </div>
    </div>
  );
}
