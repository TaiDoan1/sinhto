// Format a Date as YYYY-MM-DD using its LOCAL calendar day.
// `date.toISOString().split('T')[0]` looks equivalent but converts to UTC first —
// for Vietnam (UTC+7) that flips the date backward by a day for any local time
// before 07:00, which is exactly when a business running shifts past midnight
// gets bitten. Always use this instead when you want "the day the user sees".
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a "YYYY-MM-DD" string as a local-midnight Date, not UTC midnight.
// `new Date("2026-07-13")` parses as UTC and can render as the wrong day
// once formatted back through toLocaleDateString in timezones behind UTC.
export function parseLocalDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
