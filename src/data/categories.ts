import type { Category, SubTypeId } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'hospitality',
    label: 'Hospitality & Places',
    color: '#f59e0b',
    subtypes: [
      { id: 'hotel', label: 'Hotels', icon: 'Hotel' },
      { id: 'food', label: 'Local Food Spots', icon: 'UtensilsCrossed' },
      { id: 'budget', label: 'Budget Hidden Gems', icon: 'Gem' },
    ],
  },
  {
    id: 'culture',
    label: 'Culture & History',
    color: '#8b5cf6',
    subtypes: [
      { id: 'landmark', label: 'Landmarks', icon: 'Landmark' },
      { id: 'heritage', label: 'Heritage Sites', icon: 'Building2' },
      { id: 'tradition', label: 'Local Tradition Spots', icon: 'Scroll' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety & Hazards',
    color: '#ef4444',
    subtypes: [
      { id: 'unsafe', label: 'Unsafe Zones', icon: 'ShieldAlert' },
      { id: 'accident', label: 'Accident-Prone Areas', icon: 'Siren' },
      { id: 'poorlight', label: 'Poorly Lit Streets', icon: 'MoonStar' },
    ],
  },
  {
    id: 'traffic',
    label: 'Traffic & Weather',
    color: '#3b82f6',
    subtypes: [
      { id: 'congestion', label: 'Congestion Zones', icon: 'CarFront' },
      { id: 'rain', label: 'Rain Alerts', icon: 'CloudRain' },
      { id: 'flood', label: 'Flood Alerts', icon: 'Waves' },
    ],
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getSubtypeLabel(
  categoryId: string,
  subId: SubTypeId,
): string {
  const cat = getCategory(categoryId);
  return (
    cat?.subtypes.find((st) => st.id === subId)?.label ?? subId
  );
}

export function affordabilityLabel(level: 1 | 2 | 3 | 4): string {
  return '$'.repeat(level);
}

export function affordabilityLabelFull(level: 1 | 2 | 3 | 4): string {
  const labels = ['Budget', 'Moderate', 'Premium', 'Luxury'];
  return labels[level - 1];
}
