import type { HourFormat } from './model';

/** A time of day in the visitor's chosen clock, optionally in another zone. */
export const formatTime = (date: Date, format: HourFormat, timeZone?: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: format === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      hourCycle: format === '12h' ? 'h12' : 'h23',
      timeZone
    }).format(date);
  } catch {
    return '--:--';
  }
};
