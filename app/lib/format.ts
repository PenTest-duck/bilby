/**
 * Formatting Utilities
 */

/** Format distance in meters to human readable */
export function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Format walking time from distance (assuming 5 km/h) */
export function formatWalkingTime(meters: number): string {
  const minutes = Math.ceil(meters / 83.33); // 5 km/h = 83.33 m/min
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min walk';
  return `${minutes} min walk`;
}

/** Pluralize a word */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

/** Format stop name (remove redundant info) */
export function formatStopName(name: string): string {
  return name
    .replace(/, Sydney$/, '')
    .replace(/ Station$/, '')
    .replace(/ Platform \d+$/, '');
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
