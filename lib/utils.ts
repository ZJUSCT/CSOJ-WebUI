import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return '';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.substring(0, 2).toUpperCase();
}

export function getScoreColor(score: number): string {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));
  const s = clamp(score, 0, 100);

  const startHue = 0;
  const endHue = 130;
  const hue = startHue + ((endHue - startHue) * s) / 100;

  const saturation = 50;
  const lightness = 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}