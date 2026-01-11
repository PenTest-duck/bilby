/**
 * Date/Time Utilities
 * Sydney timezone formatting
 */

const SYDNEY_TIMEZONE = 'Australia/Sydney';

/** Format time as HH:MM (e.g., "14:30") */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-AU', {
    timeZone: SYDNEY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Format time with optional seconds */
export function formatTimeWithSeconds(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-AU', {
    timeZone: SYDNEY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Format as relative time (e.g., "2 min", "Now") */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins <= 0) return 'Now';
  if (diffMins === 1) return '1 min';
  if (diffMins < 60) return `${diffMins} min`;
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/** Format countdown for departures (e.g., "2", "15", "1:05") */
export function formatCountdown(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins <= 0) return 'Now';
  if (diffMins < 60) return diffMins.toString();
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/** Format date as "Mon 5 Jan" */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    timeZone: SYDNEY_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Format duration in minutes to "Xh Ym" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/** Check if date is today */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
