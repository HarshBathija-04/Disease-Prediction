import type { AppointmentStatus } from "./types";

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  // Plain dates (YYYY-MM-DD) are parsed as local dates so they do not shift a day across timezones.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-IN", options).format(date);
}

/** Time of day, plus the date when it isn't today (for chat timestamps). */
export function formatTime(value: string) {
  const date = new Date(value);
  const today = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    ...(today ? {} : { day: "numeric", month: "short" }),
  }).format(date);
}

export function todayISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function confidenceBand(confidence: number): { label: string; tone: "ok" | "warn" | "muted" } {
  if (confidence >= 80) return { label: "Strong match", tone: "ok" };
  if (confidence >= 50) return { label: "Moderate match", tone: "warn" };
  return { label: "Weak match", tone: "muted" };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Pending and confirmed consultations are still open (chat allowed, can be cancelled). */
export const isOpen = (status: AppointmentStatus) => status === "pending" || status === "confirmed";
