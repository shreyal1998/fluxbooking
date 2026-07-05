/**
 * Utilities for handling timezones without external libraries.
 */

/**
 * Converts a Date object to a specific timezone.
 * Returns a new Date object whose "local" hours match the target timezone's hours.
 * Useful for grid calculations.
 */
export function getInTimezone(date: Date, timeZone: string): Date {
  if (isNaN(date.getTime())) return date;
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const partMap: any = {};
  parts.forEach(p => partMap[p.type] = parseInt(p.value, 10));
  
  return new Date(partMap.year, partMap.month - 1, partMap.day, partMap.hour, partMap.minute, partMap.second);
}

/**
 * Parses a YYYY-MM-DD and HH:mm string as if it were in the target timezone.
 * Returns a UTC Date object.
 */
export function parseInTimezone(dateStr: string, timeStr: string, timeZone: string): Date {
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
  if (isNaN(utcDate.getTime())) return utcDate;
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const partMap: any = {};
  parts.forEach(p => partMap[p.type] = parseInt(p.value, 10));
  
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const utcParts = utcFormatter.formatToParts(utcDate);
  const utcPartMap: any = {};
  utcParts.forEach(p => utcPartMap[p.type] = parseInt(p.value, 10));
  
  const targetTime = Date.UTC(partMap.year, partMap.month - 1, partMap.day, partMap.hour, partMap.minute, partMap.second);
  const utcTime = Date.UTC(utcPartMap.year, utcPartMap.month - 1, utcPartMap.day, utcPartMap.hour, utcPartMap.minute, utcPartMap.second);
  
  const offsetMs = targetTime - utcTime;
  
  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * Formats a Date object specifically for the target timezone.
 */
export function formatInTimezone(date: Date, timeZone: string, formatStr: string = "HH:mm"): string {
  const is12h = formatStr.includes("a") || formatStr.includes("h");
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
  };

  const hasTime = /H|h|m|s|a/.test(formatStr);
  if (hasTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = is12h;
  }

  if (formatStr.includes("MMMM")) {
    options.month = "long";
  } else if (formatStr.includes("MMM")) {
    options.month = "short";
  }
  if (formatStr.includes("d")) options.day = "numeric";
  if (formatStr.includes("yyyy")) options.year = "numeric";
  if (formatStr.includes("EEEE")) {
    options.weekday = "long";
  } else if (formatStr.includes("EEE")) {
    options.weekday = "short";
  }

  // If formatStr is just a time format, keep it simple
  if (formatStr === "HH:mm" || formatStr === "hh:mm a" || formatStr === "h:mm a") {
     const str = new Intl.DateTimeFormat("en-US", options).format(date);
     return str.replace(/24:/, "00:").trim();
  }

  // For more complex formats, we might need a better approach or just use Intl's defaults
  return new Intl.DateTimeFormat("en-US", options).format(date);
}
