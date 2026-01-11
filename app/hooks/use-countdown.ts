/**
 * Countdown Hook
 * Real-time countdown timer for departures
 */

import { useState, useEffect, useMemo } from 'react';

interface CountdownResult {
  minutes: number;
  seconds: number;
  isNow: boolean;
  isPast: boolean;
  display: string;
}

/**
 * Hook for real-time countdown to a departure time
 * Updates every second for accurate display
 */
export function useCountdown(targetTime: string | Date | null): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>(() => 
    calculateCountdown(targetTime)
  );

  useEffect(() => {
    if (!targetTime) {
      setCountdown({ minutes: 0, seconds: 0, isNow: false, isPast: true, display: '—' });
      return;
    }

    // Update immediately
    setCountdown(calculateCountdown(targetTime));

    // Update every second
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return countdown;
}

function calculateCountdown(targetTime: string | Date | null): CountdownResult {
  if (!targetTime) {
    return { minutes: 0, seconds: 0, isNow: false, isPast: true, display: '—' };
  }

  const target = typeof targetTime === 'string' ? new Date(targetTime) : targetTime;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs < -60000) {
    // More than 1 minute past
    return { minutes: 0, seconds: 0, isNow: false, isPast: true, display: 'Gone' };
  }

  if (diffMs < 30000) {
    // Less than 30 seconds - show "Now"
    return { minutes: 0, seconds: 0, isNow: true, isPast: false, display: 'Now' };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  let display: string;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    display = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    display = `${minutes}`;
  }

  return {
    minutes,
    seconds,
    isNow: false,
    isPast: false,
    display,
  };
}

/**
 * Hook for batch countdown updates
 * More efficient when displaying multiple countdowns
 */
export function useCountdownBatch(targetTimes: (string | null)[]): CountdownResult[] {
  const timesKey = useMemo(() => JSON.stringify(targetTimes), [targetTimes]);
  
  const [countdowns, setCountdowns] = useState<CountdownResult[]>(() =>
    targetTimes.map(t => calculateCountdown(t))
  );

  useEffect(() => {
    // Update immediately
    setCountdowns(targetTimes.map(t => calculateCountdown(t)));

    // Update every second
    const interval = setInterval(() => {
      setCountdowns(targetTimes.map(t => calculateCountdown(t)));
    }, 1000);

    return () => clearInterval(interval);
  }, [timesKey, targetTimes]);

  return countdowns;
}
