// Shared category icon — Phosphor duotone for a richer, modern look.
// Single source of truth used by Home, Browse, Category.
import {
  House, Truck, Wrench, Plant, Car, Baby, Cat, Desktop, GraduationCap,
  DotsThreeOutline, type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

const ICONS: Record<string, PhosphorIcon> = {
  household: House,
  moving: Truck,
  repairs: Wrench,
  garden: Plant,
  auto: Car,
  childcare: Baby,
  pets: Cat,
  it: Desktop,
  tutoring: GraduationCap,
  other: DotsThreeOutline,
};

export function CategoryIcon({
  catKey,
  color,
  size = 26,
  className,
}: {
  catKey: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[catKey] ?? DotsThreeOutline;
  return <Icon size={size} weight="duotone" color={color} className={className} />;
}
