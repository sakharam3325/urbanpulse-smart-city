import { Map, Scale, MessageSquare, GitCompare, Sun, Moon } from 'lucide-react';
import type { CityDefinition } from '@/types';

interface HeaderBarProps {
  cities: CityDefinition[];
  currentCity: CityDefinition;
  onCityChange: (city: CityDefinition) => void;
  onOpenComparison: () => void;
  onOpenReport: () => void;
  onToggleAssistant: () => void;
  assistantOpen: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function HeaderBar({
  cities,
  currentCity,
  onCityChange,
  onOpenComparison,
  onOpenReport,
  onToggleAssistant,
  assistantOpen,
  darkMode,
  onToggleDarkMode,
}: HeaderBarProps) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 dark:bg-black text-white border-b border-slate-700 dark:border-slate-800 shrink-0 z-[1000]">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
          <Map size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight">
            Urban<span className="text-cyan-400">Pulse</span>
          </h1>
          <p className="text-[10px] text-slate-400 leading-tight uppercase tracking-wider">
            Smart City Explorer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* City selector */}
        <div className="relative">
          <select
            value={currentCity.id}
            onChange={(e) => {
              const c = cities.find((c) => c.id === e.target.value);
              if (c) onCityChange(c);
            }}
            className="appearance-none bg-slate-800 dark:bg-slate-900 text-white text-sm font-medium pl-4 pr-9 py-2 rounded-lg border border-slate-700 dark:border-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M3 4.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Action buttons */}
        <button
          onClick={onOpenComparison}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 text-sm font-medium border border-slate-700 dark:border-slate-700 transition-colors"
        >
          <GitCompare size={16} className="text-cyan-400" />
          Compare
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-sm font-bold transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Scale size={16} />
          <span className="hidden sm:inline">Report Incident</span>
          <span className="sm:hidden">Report</span>
        </button>

        <button
          onClick={onToggleAssistant}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            assistantOpen
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
              : 'bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 border-slate-700 dark:border-slate-700'
          }`}
        >
          <MessageSquare size={16} />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 border border-slate-700 dark:border-slate-700 transition-colors"
          aria-label="Toggle dark mode"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-cyan-400" />}
        </button>
      </div>
    </header>
  );
}
