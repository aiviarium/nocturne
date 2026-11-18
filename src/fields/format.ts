// How values read, in the person's locale: the one place numbers, money, durations, days and instants are
// written, so a table, a list, a record page and a form say the same thing.
import type { FieldSpec } from "./spec"

/** `45` of a percent field, `€90,000` of a currency one. */
export function formatNumber(
  spec: Pick<FieldSpec, "kind" | "format" | "currency"> | undefined,
  v: number,
): string {
  if (spec?.kind === "currency" || spec?.format === ("currency" as string))
    return formatMoney(spec.currency, v)
  switch (spec?.format) {
    case "percent":
    case "progress":
      return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)}%`
    case "duration":
      return formatDuration(v)
    default:
      return new Intl.NumberFormat().format(v)
  }
}

/** An amount in a currency; without one, a plain number, not dollars. */
export function formatMoney(currency: string | undefined, v: number): string {
  return currency
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
      }).format(v)
    : new Intl.NumberFormat().format(v)
}

/** Seconds as `1h 5m`, `45s`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = s % 60
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  if (m) return rest ? `${m}m ${rest}s` : `${m}m`
  return `${rest}s`
}

/** A day (`2026-03-04`) or an instant (RFC 3339), as the person's locale writes it. */
export function formatDate(v: string, instant: boolean): string {
  const d = new Date(instant ? v : `${v}T12:00:00`)
  if (Number.isNaN(d.getTime())) return v
  return instant
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleDateString(undefined, { dateStyle: "medium" })
}

/** `2026-03-04T10:00:00Z` as `2026-03-04` and `10:00` in the person's time zone; empty for what is not an instant. */
export function splitInstant(v: string): { day: string; time: string } {
  const d = new Date(v)
  if (!v || Number.isNaN(d.getTime())) return { day: "", time: "" }
  const p = (n: number) => String(n).padStart(2, "0")
  return {
    day: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  }
}

/** The RFC 3339 instant of a local day and time; null for what is not one. */
export function joinInstant(day: string, time: string): string | null {
  if (!day) return null
  const d = new Date(`${day}T${time || "00:00"}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** `1,234 bytes`, `2.5 MB`. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ["KB", "MB", "GB", "TB"]
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)} ${units[i]}`
}
