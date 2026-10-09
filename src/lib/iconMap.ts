import {
  Hotel,
  UtensilsCrossed,
  Gem,
  Landmark,
  Building2,
  Scroll,
  ShieldAlert,
  Siren,
  MoonStar,
  CarFront,
  CloudRain,
  Waves,
  HeartPulse,
  Utensils,
  ShoppingBag,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Hotel,
  UtensilsCrossed,
  Gem,
  Landmark,
  Building2,
  Scroll,
  ShieldAlert,
  Siren,
  MoonStar,
  CarFront,
  CloudRain,
  Waves,
  HeartPulse,
  Utensils,
  ShoppingBag,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MapPin;
}
