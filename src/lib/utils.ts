import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { JavaInstant } from "@/types/api";

/**
 * Tailwind-aware className merger.
 *   cn("p-2", isActive && "bg-blue-500", "p-4") → "bg-blue-500 p-4"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Parse a Java/Jackson timestamp into a JS Date. Accepts an ISO string OR
 * the array form Jackson emits when JavaTimeModule's ISO config isn't on
 * (e.g. [2026, 5, 22, 14, 30, 0, 0] = May 22 2026 14:30:00).
 */
export function parseInstant(value: JavaInstant | null | undefined): Date | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d, h = 0, min = 0, s = 0, ns = 0] = value;
    return new Date(y, m - 1, d, h, min, s, Math.floor(ns / 1_000_000));
  }
  return null;
}

export function formatInstant(value: JavaInstant | null | undefined): string {
  const d = parseInstant(value);
  return d ? d.toLocaleString() : "—";
}
