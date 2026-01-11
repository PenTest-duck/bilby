/**
 * Transport Mode Configuration
 * Maps TfNSW mode IDs to colors, icons, and labels
 */

import { TransportColors } from './theme';

export type TransportMode = 
  | 'train'
  | 'metro'
  | 'bus'
  | 'ferry'
  | 'lightRail'
  | 'coach'
  | 'schoolBus'
  | 'walking';

export interface TransportModeConfig {
  id: number;
  name: string;
  color: string;
  icon: string;
  label: string;
}

/** TfNSW mode ID to config mapping */
export const TransportModes: Record<TransportMode, TransportModeConfig> = {
  train: {
    id: 1,
    name: 'train',
    color: TransportColors.train,
    icon: 'tram.fill',
    label: 'Train',
  },
  metro: {
    id: 2,
    name: 'metro',
    color: TransportColors.metro,
    icon: 'tram.fill',
    label: 'Metro',
  },
  bus: {
    id: 5,
    name: 'bus',
    color: TransportColors.bus,
    icon: 'bus.fill',
    label: 'Bus',
  },
  ferry: {
    id: 9,
    name: 'ferry',
    color: TransportColors.ferry,
    icon: 'ferry.fill',
    label: 'Ferry',
  },
  lightRail: {
    id: 4,
    name: 'lightRail',
    color: TransportColors.lightRail,
    icon: 'tram.fill',
    label: 'Light Rail',
  },
  coach: {
    id: 7,
    name: 'coach',
    color: TransportColors.coach,
    icon: 'bus.fill',
    label: 'Coach',
  },
  schoolBus: {
    id: 11,
    name: 'schoolBus',
    color: TransportColors.schoolBus,
    icon: 'bus.fill',
    label: 'School Bus',
  },
  walking: {
    id: 100,
    name: 'walking',
    color: TransportColors.walking,
    icon: 'figure.walk',
    label: 'Walk',
  },
};

/** Get transport mode config by TfNSW mode ID */
export function getModeById(id: number): TransportModeConfig | undefined {
  return Object.values(TransportModes).find(mode => mode.id === id);
}

/** Get transport mode config by name */
export function getModeByName(name: string): TransportModeConfig | undefined {
  const key = name.toLowerCase().replace(/[^a-z]/g, '') as TransportMode;
  return TransportModes[key];
}

/** Get color for a mode ID */
export function getModeColor(id: number): string {
  return getModeById(id)?.color ?? TransportColors.bus;
}
