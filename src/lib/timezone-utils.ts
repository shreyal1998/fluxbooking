/**
 * Utilities for handling timezones without external libraries.
 */

/**
 * Converts a Date object to a specific timezone.
 * Returns a new Date object whose "local" hours match the target timezone's hours.
 * Useful for grid calculations.
 */
export function getInTimezone(date: Date, timeZone: string): Date {
  const str = date.toLocaleString("en-US", { timeZone });
  return new Date(str);
}

/**
 * Parses a YYYY-MM-DD and HH:mm string as if it were in the target timezone.
 * Returns a UTC Date object.
 */
export function parseInTimezone(dateStr: string, timeStr: string, timeZone: string): Date {
  // Use Intl to find the offset for this specific date and timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  // Create a base UTC date
  const parts = formatter.formatToParts(new Date(`${dateStr}T${timeStr}:00Z`));
  const mapped: any = {};
  parts.forEach(p => mapped[p.type] = p.value);

  // This is a bit complex without a lib. 
  // Let's use a simpler approach:
  // Create a date string that JS can parse, then adjust for the offset.
  
  const targetDate = new Date(`${dateStr}T${timeStr}:00`);
  const utcDate = new Date(targetDate.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(targetDate.toLocaleString("en-US", { timeZone }));
  const offset = utcDate.getTime() - tzDate.getTime();
  
  return new Date(targetDate.getTime() + offset);
}

/**
 * Formats a Date object specifically for the target timezone.
 */
export function formatInTimezone(date: Date, timeZone: string, formatStr: string = "HH:mm"): string {
  const is12h = formatStr.includes("a") || formatStr.includes("h");
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: is12h,
  };

  if (formatStr.includes("MMM")) options.month = "short";
  if (formatStr.includes("MMMM")) options.month = "long";
  if (formatStr.includes("d")) options.day = "numeric";
  if (formatStr.includes("yyyy")) options.year = "numeric";
  if (formatStr.includes("EEEE")) options.weekday = "long";
  if (formatStr.includes("EEE")) options.weekday = "short";

  // If formatStr is just a time format, keep it simple
  if (formatStr === "HH:mm" || formatStr === "hh:mm a" || formatStr === "h:mm a") {
     const str = new Intl.DateTimeFormat("en-US", options).format(date);
     return str.replace(/24:/, "00:").trim();
  }

  // For more complex formats, we might need a better approach or just use Intl's defaults
  return new Intl.DateTimeFormat("en-US", options).format(date);
}
