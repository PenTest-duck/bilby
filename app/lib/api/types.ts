/**
 * API Response Types
 * Mirrors backend response structures
 */

/** Stop from search results */
export interface Stop {
  id: string;
  name: string;
  disassembledName?: string;
  type: 'stop' | 'poi' | 'street' | 'locality';
  coord?: [number, number];
  modes?: number[];
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  matchQuality?: number;
  isBest?: boolean;
}

/** Transportation info */
export interface Transportation {
  id: string;
  name: string;
  disassembledName?: string;
  number?: string;
  description?: string;
  product?: {
    id: number;
    class: number;
    name: string;
    iconId: number;
  };
  operator?: {
    id: string;
    name: string;
  };
  destination?: {
    id: string;
    name: string;
    type: string;
  };
}

/** Departure info */
export interface Departure {
  id: string;
  plannedTime: string;
  estimatedTime?: string;
  countdown?: number;
  platform?: string;
  transportation: Transportation;
  isCancelled?: boolean;
  delayMinutes?: number;
}

/** Journey leg */
export interface Leg {
  origin: Stop;
  destination: Stop;
  departure: string;
  arrival: string;
  duration: number;
  isWalking: boolean;
  distance?: number;
  transportation?: Transportation;
  path?: [number, number][];
  stopSequence?: Stop[];
  realtimeDelayMinutes?: number;
  isCancelled?: boolean;
}

/** Journey/Trip */
export interface Journey {
  id?: string;
  legs: Leg[];
  duration: number;
  departureTime: string;
  arrivalTime: string;
  interchanges: number;
  realtimeDelayMinutes?: number;
  hasCancellations?: boolean;
}

/** Ranked journey with explainability */
export interface RankedJourney extends Journey {
  ranking: {
    total: number;
    factors: {
      arrivalTime: { value: number; weight: number; score: number };
      duration: { value: number; weight: number; score: number };
      walking: { value: number; weight: number; score: number };
      transfers: { value: number; weight: number; score: number };
      reliability: { value: number; weight: number; score: number };
    };
    why: string;
  };
  fare?: FareInfo;
}

/** Service alert */
export interface Alert {
  id: string;
  title: string;
  description?: string;
  url?: string;
  severity: 'info' | 'warning' | 'severe';
  cause?: string;
  effect?: string;
  affectedRoutes?: string[];
  affectedStops?: string[];
  activePeriods?: { start: string; end?: string }[];
}

/** Ranking strategy */
export type RankingStrategy = 'best' | 'fastest' | 'least_walking' | 'fewest_transfers';

/** Opal card types */
export type OpalCardType = 'adult' | 'child' | 'concession' | 'senior' | 'student';

/** Fare information */
export interface FareInfo {
  adult: number;
  child: number;
  concession: number;
  senior: number;
  student: number;
  peakMultiplier?: number;
  isPeak?: boolean;
}
