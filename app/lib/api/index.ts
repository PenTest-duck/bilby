/**
 * API Module Exports
 * 
 * Re-exports all API hooks and types for convenient importing.
 * 
 * Usage:
 *   import { useDepartures, useStopSearch, Stop } from '@/lib/api';
 * 
 * For direct access to the shared schema:
 *   import type { ... } from '@/lib/api-schema';
 */

export * from './client';
export * from './types';
export * from './stops';
export * from './trips';
export * from './departures';
export * from './alerts';
